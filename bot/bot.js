// ============================================================
//   Ayanakoji_X | Marks Bot — Baileys + node-cron + Express
//   Features: WhatsApp bot, group management, admin panel
//
//   FIXES APPLIED (see inline comments marked "FIX:"):
//   1. Added a real in-memory message store + getMessage() so Baileys
//      can satisfy session-resync retries. Previously getMessage always
//      returned undefined, which silently breaks delivery on any message
//      that needs a retry/resync (very common) — sendMessage() still
//      resolves, your code logs "Sent ->", but WhatsApp never gets a
//      usable payload.
//   2. Stopped swallowing "Bad MAC" / "Session error" / "Failed to
//      decrypt" / "Closing session" stderr lines. These are exactly the
//      diagnostic signal for the bug above — suppressing them hid the
//      evidence. Left a single toggle (DEBUG_SUPPRESS_NOISY_LOGS) so you
//      can re-enable suppression later once you've confirmed delivery
//      works, without deleting the code.
//   3. Tightened the groupParticipantsUpdate 403 check to use Number()
//      instead of a string-only comparison, so a numeric status code
//      doesn't slip through as "success".
//   4. attachMessageStore() is wired into BOTH places a socket is created
//      (connectToWhatsApp() and /api/admin/pair) so the fix applies no
//      matter which path establishes the connection.
// ============================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const { Boom }   = require("@hapi/boom");
const cron       = require("node-cron");
const axios      = require("axios");
const pino       = require("pino");
const readline   = require("readline");
const express    = require("express");
const cors       = require("cors");
const fs         = require("fs");
const path       = require("path");
const { spawn }  = require("child_process");
require("dotenv").config();

// ── Config ────────────────────────────────────────────────
const PORT          = process.env.BOT_PORT          || 3000;
const API_BASE      = process.env.API_BASE          || "";
const MEMBER_VIEW   = process.env.MEMBER_VIEW_BASE || "";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE    || "0 9 * * 1";
const IMAGE_PATH    = path.resolve(__dirname, "images/caption.png");
const CONFIG_PATH   = path.resolve(__dirname, "config.json");
const AUTH_PATH     = path.resolve(__dirname, "auth_info");

// FIX (#2): Set this to true only after you've confirmed message delivery
// works. While debugging delivery problems, keep it false so Bad MAC /
// Session error / decrypt-failure lines actually show up in your console —
// they're the main diagnostic signal for retry/session issues.
const DEBUG_SUPPRESS_NOISY_LOGS = false;

// Optional: set PAIR_PHONE in your host's env vars to skip the interactive
// terminal prompt entirely. Useful on hosts that don't give you a real TTY
// (panel "start" buttons, process managers, some container setups).
const PAIR_PHONE_ENV = process.env.PAIR_PHONE || "";

// How long a requested pairing code is realistically usable for. WhatsApp's
// own expiry is short — this is just for our own logging/warnings.
const PAIRING_CODE_TTL_MS = 45 * 1000;

// ── Config file (group ID + admin password) ───────────────
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch {}
  return { groupId: "", adminPassword: "mmu2024" };
}

function saveConfig(data) {
  const current = loadConfig();
  const updated = { ...current, ...data };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  return updated;
}

let sock         = null;
let botStartTime = Date.now();
let pairingRequested = false;

// ── FIX (#1): In-memory message store backing getMessage() ───────────────
// Baileys calls getMessage(key) when it needs to re-fetch/re-encrypt a
// message you previously sent — most commonly during a session resync
// (the recipient's client asks for a retry because the encrypted session
// state needed re-establishing, which is routine, not exotic). If
// getMessage has nothing to return, Baileys can't satisfy that retry, and
// the message effectively vanishes even though your original sendMessage()
// call already resolved successfully and your code logged "Sent ->".
//
// This is a simple capped in-memory Map. It does NOT persist across
// restarts — for very high message volume or multi-process setups you'd
// want a real store (e.g. a small SQLite/Redis-backed one), but for a bot
// sending weekly blasts to a member list, in-memory is plenty.
const messageStore = new Map(); // key: `${remoteJid}:${id}` -> proto message
const MESSAGE_STORE_MAX_ENTRIES = 2000;

function storeOutgoingMessage(jid, sentMsg) {
  try {
    const id = sentMsg?.key?.id;
    if (!id || !sentMsg?.message) return;
    messageStore.set(`${jid}:${id}`, sentMsg.message);
    if (messageStore.size > MESSAGE_STORE_MAX_ENTRIES) {
      const oldestKey = messageStore.keys().next().value;
      messageStore.delete(oldestKey);
    }
  } catch {}
}

// Wraps sock.sendMessage so every outgoing message we send gets recorded,
// without having to touch every call site individually.
function attachMessageStore(sockInstance) {
  const originalSend = sockInstance.sendMessage.bind(sockInstance);
  sockInstance.sendMessage = async (jid, content, options) => {
    const result = await originalSend(jid, content, options);
    storeOutgoingMessage(jid, result);
    return result;
  };
}

// ── Single-flight lock for pairing ────────────────────────
// Both the terminal flow (connectToWhatsApp) and the admin-panel route
// (/api/admin/pair) can request a pairing code. If both run close together
// against the same auth_info folder, each request invalidates the previous
// code — so whichever code you're staring at in your terminal silently
// stops being valid, and WhatsApp reports "wrong code" even though you
// typed it correctly. This lock makes that race impossible: only one
// pairing attempt can be in flight at a time, system-wide.
let pairingInFlight = false;
let lastPairingIssuedAt = 0;
let lastPairingSource   = null; // "terminal" | "admin-panel"

function beginPairing(source) {
  if (pairingInFlight) {
    const ageSec = Math.round((Date.now() - lastPairingIssuedAt) / 1000);
    console.warn(
      `\n[Pairing] Refused: a pairing request from "${lastPairingSource}" is already ` +
      `in flight (started ${ageSec}s ago). Wait for it to finish/expire before ` +
      `requesting another — running two at once invalidates whichever code ` +
      `you're looking at.\n`
    );
    return false;
  }
  pairingInFlight    = true;
  lastPairingIssuedAt = Date.now();
  lastPairingSource   = source;
  return true;
}

function endPairing() {
  pairingInFlight = false;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (t) => new Promise((r) => rl.question(t, r));

// ── auth_info staleness check ─────────────────────────────
// If auth_info exists but creds look incomplete/half-registered (e.g. left
// over from an interrupted pairing attempt), Baileys can end up in a
// confused state where it doesn't cleanly ask for a fresh code. Surface
// this loudly instead of silently misbehaving.
function checkAuthFolderHealth() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return;
    const credsFile = path.join(AUTH_PATH, "creds.json");
    if (!fs.existsSync(credsFile)) {
      console.warn(
        `[Auth] auth_info exists but creds.json is missing — this folder is ` +
        `likely from an interrupted run. If pairing keeps failing, stop the ` +
        `bot and run: rm -rf auth_info`
      );
      return;
    }
    const creds = JSON.parse(fs.readFileSync(credsFile, "utf8"));
    if (!creds.registered) {
      console.warn(
        `[Auth] auth_info/creds.json exists but is NOT marked registered. ` +
        `This is consistent with a previous pairing attempt that never ` +
        `completed. It should resolve itself once pairing succeeds — but if ` +
        `you keep getting "wrong code", a clean slate helps: rm -rf auth_info`
      );
    }
  } catch (err) {
    console.warn(`[Auth] Could not inspect auth_info health: ${err.message}`);
  }
}

// ── Cloudflare Tunnel ─────────────────────────────────────
const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_TOKEN || "";

if (!CLOUDFLARE_TOKEN || CLOUDFLARE_TOKEN === "PASTE_YOUR_ACTUAL_TOKEN_HERE") {
  console.warn("No Cloudflare token set — tunnel disabled.");
} else {
  console.log("Starting Cloudflare Tunnel...");
  const tunnel = spawn("npx", ["cloudflared", "tunnel", "--no-autoupdate", "run", "--token", CLOUDFLARE_TOKEN], {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  tunnel.stdout.on("data", (d) => {
    const log = d.toString();
    if (log.includes("Registered tunnel connection") || log.includes("Connection established"))
      console.log("[Cloudflare] Tunnel established!");
  });
  tunnel.stderr.on("data", (d) => {
    const log = d.toString();
    if (log.includes("ERR") || log.includes("Infrastructure error"))
      console.error(`[Cloudflare] ${log.trim()}`);
  });
  tunnel.on("close", (code) => console.log(`[Cloudflare] Tunnel exited (${code})`));
}

// ── Suppress noisy Baileys stderr (FIX #2: now toggleable, default OFF) ───
// These exact strings — "Bad MAC", "Session error", "Failed to decrypt",
// "Closing session" — are the diagnostic signal for the session-resync
// problem described in FIX #1 above. Blanket-suppressing them (the old
// behavior) hid the evidence that something was going wrong with delivery.
// Leave DEBUG_SUPPRESS_NOISY_LOGS = false while you confirm messages are
// actually arriving; flip it back to true once you're confident.
const _stderr = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...args) => {
  if (DEBUG_SUPPRESS_NOISY_LOGS) {
    const msg = typeof chunk === "string" ? chunk : chunk.toString();
    if (["Bad MAC","Key used already","Failed to decrypt","Session error","Closing open session","Closing session:"].some(s => msg.includes(s)))
      return true;
  }
  return _stderr(chunk, ...args);
};

// ── Helpers ───────────────────────────────────────────────
function displayName(m) {
  return m.grade?.trim() ? `${m.name} - ${m.grade}` : m.name;
}
function hasImage() {
  return fs.existsSync(IMAGE_PATH);
}
function getGroupId() {
  return loadConfig().groupId || process.env.GROUP_ID || "";
}

async function saveContact(jid, member) {
  try {
    const name   = displayName(member);
    const number = member.whatsappNumber.replace(/\D/g, "");
    const vcard  = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`;
    await sock.sendMessage(jid, { contacts: { displayName: name, contacts: [{ vcard }] } });
  } catch {}
}

async function dispatchMessage(jid, text) {
  if (hasImage()) {
    const buf = fs.readFileSync(IMAGE_PATH);
    await sock.sendMessage(jid, { image: buf, caption: text });
  } else {
    await sock.sendMessage(jid, { text });
  }
}

// ── Reactions (ack a command immediately, since API calls can be slow) ───
async function reactTo(msgKey, emojiIcon) {
  try {
    await sock.sendMessage(msgKey.remoteJid, { react: { text: emojiIcon, key: msgKey } });
  } catch {}
}
// Clear a reaction by sending an empty string
async function clearReaction(msgKey) {
  try {
    await sock.sendMessage(msgKey.remoteJid, { react: { text: "", key: msgKey } });
  } catch {}
}

function buildMessage(member) {
  const profileLink = `${MEMBER_VIEW}?id=${member._id}`;
  const gradeInfo   = member.grade    ? `\n   *Grade* : ${member.grade}`       : "";
  const catInfo     = member.category ? `\n   *Category* : ${member.category}` : "";
  return (
    `*Marks Bot | Mudalians' Media Unit*\n\n` +
    `Hello *${displayName(member)}*,\n` +
    `Your evaluation metrics have been updated.\n\n` +
    `*WEEKLY STATUS EVALUATION*\n` +
    ` --- --- --- --- --- ---\n` +
    `   *Position* : ${member.rank}${gradeInfo}${catInfo}\n` +
    `   *Marks* : [ *${member.marks}* ]\n` +
    ` --- --- --- --- --- ---\n\n` +
    `*View Full Activity Log:*\n${profileLink}\n\n` +
    `_Developed by Riviya_X_`
  );
}

async function isValidWhatsAppNumber(number) {
  try {
    const clean = number.replace(/\D/g, "");
    const [result] = await sock.onWhatsApp(`${clean}@s.whatsapp.net`);
    return result?.exists === true;
  } catch { return false; }
}

async function getGroupInviteLink(groupId) {
  try {
    const code = await sock.groupInviteCode(groupId);
    return `https://chat.whatsapp.com/${code}`;
  } catch (err) {
    console.error(`Failed to get invite link: ${err.message}`);
    return null;
  }
}

function extractPersonalInviteLink(content, jid) {
  if (!content) return null;
  try {
    if (Array.isArray(content)) {
      const target = content.find(i => i.jid === jid || i.id === jid);
      if (target?.content?.length) {
        const inv = target.content.find(n => n.tag === "invite");
        if (inv?.attrs?.code) return `https://chat.whatsapp.com/invite/${inv.attrs.code}`;
      }
    }
    const searchTarget = Array.isArray(content) ? content : content.content || [];
    const groupNode = searchTarget.find(n => n.tag === "group");
    if (groupNode && Array.isArray(groupNode.content)) {
      const addNode = groupNode.content.find(n => n.tag === "add");
      if (addNode && Array.isArray(addNode.content)) {
        const userNode = addNode.content.find(n => n.tag === "user" && n.attrs?.jid === jid);
        if (userNode && Array.isArray(userNode.content)) {
          const inv = userNode.content.find(n => n.tag === "invite");
          if (inv?.attrs?.code) return `https://chat.whatsapp.com/invite/${inv.attrs.code}`;
        }
      }
    }
  } catch {}
  return null;
}

function getNextRunTime() {
  try {
    const parts   = CRON_SCHEDULE.split(" ");
    const min     = parseInt(parts[0]) || 0;
    const hour    = parseInt(parts[1]) || 9;
    const now     = new Date();
    const next    = new Date();
    next.setHours(hour, min, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    if (parts[4] && parts[4] !== "*") {
      const targetDay = parseInt(parts[4]);
      while (next.getDay() !== targetDay) next.setDate(next.getDate() + 1);
    }
    const diff    = next - now;
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    let cd = "";
    if (days > 0)  cd += `${days}d `;
    if (hours > 0) cd += `${hours}h `;
    cd += `${minutes}m`;
    return `${next.toDateString()} at ${String(hour).padStart(2,"0")}:${String(min).padStart(2,"0")} (in ${cd.trim()})`;
  } catch { return "Unable to calculate"; }
}

function formatUptime() {
  const ms    = Date.now() - botStartTime;
  const hours = Math.floor(ms / 3600000);
  const mins  = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ── Pairing code request (shared by terminal + admin panel) ──────────────
// Centralizing this means both call sites get identical logging, identical
// TTL warnings, and — critically — both go through the same single-flight
// lock so they can never race each other.
async function requestPairingCodeFor(targetSock, rawPhone, source) {
  const cleaned = rawPhone.replace(/\D/g, "");
  if (!cleaned) throw new Error("Empty/invalid phone number after stripping non-digits.");

  let raw = await targetSock.requestPairingCode(cleaned);
  if (!raw) throw new Error("Baileys returned an empty pairing code.");

  const formatted = raw.match(/.{1,4}/g)?.join("-") || raw;
  const issuedAt   = new Date();

  console.log(
    `\n[Pairing:${source}] Code issued at ${issuedAt.toLocaleTimeString()} for +${cleaned}\n` +
    `  RAW        : ${raw}\n` +
    `  FORMATTED  : ${formatted}\n` +
    `  Enter this in WhatsApp -> Linked Devices -> Link with phone number,\n` +
    `  within ~${PAIRING_CODE_TTL_MS / 1000}s. If you requested another code after this one,\n` +
    `  only the MOST RECENT code is valid — discard this one.\n`
  );

  setTimeout(() => {
    console.log(`[Pairing:${source}] Code from ${issuedAt.toLocaleTimeString()} has likely expired if still unused.`);
  }, PAIRING_CODE_TTL_MS);

  return { raw, formatted, issuedAt };
}

// ── Command Handlers ──────────────────────────────────────
async function handleAbout(jid) {
  const text =
    `*Marks Bot | System Status*\n\n` +
    `Bot Name : Ayanakoji_X\n` +
    `Status   : Online\n` +
    `Uptime   : ${formatUptime()}\n` +
    `Image    : ${hasImage() ? "Loaded" : "Not found (images/caption.png)"}\n\n` +
    `*Next Weekly Blast:*\n   ${getNextRunTime()}\n\n` +
    `*Commands:*\n` +
    `   .about        — This status\n` +
    `   .markslist    — All members & marks\n` +
    `   .marks Name   — One member's details\n\n` +
    `_Developed by Riviya_X_`;
  await dispatchMessage(jid, text);
}

async function handleMarksList(jid) {
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 15000 });
    if (!Array.isArray(members) || members.length === 0) {
      await sock.sendMessage(jid, { text: "No members found." });
      return;
    }
    const sorted = [...members].sort((a, b) => Number(b.marks) - Number(a.marks));
    let list = `*MMU Marks List*\n\n`;
    sorted.forEach((m, i) => {
      const grade = m.grade ? ` (${m.grade})` : "";
      list += `${i + 1}. *${m.name}*${grade}\n`;
      list += `      Marks: *${m.marks}* |  ${m.rank}\n`;
      if (m.category) list += `      ${m.category}\n`;
      list += "\n";
    });
    list += `Total: ${members.length} members\n_MMU Marks Bot_`;
    await dispatchMessage(jid, list);
  } catch {
    await sock.sendMessage(jid, { text: "Failed to fetch marks list." });
  }
}

async function handleMarksMember(jid, query) {
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 15000 });
    const match = members.find(m => m.name.toLowerCase().includes(query.toLowerCase()));
    if (!match) {
      await sock.sendMessage(jid, { text: `No member found for "*${query}*".\nTry .markslist to see all names.` });
      return;
    }
    const profileLink = `${MEMBER_VIEW}?id=${match._id}`;
    const gradeInfo   = match.grade    ? `\n   *Grade* : ${match.grade}`       : "";
    const catInfo     = match.category ? `\n   *Category* : ${match.category}` : "";
    const text =
      `*Member Details*\n\n` +
      `   *Name* : ${match.name}${gradeInfo}${catInfo}\n` +
      `   *Position* : ${match.rank}\n` +
      `   *Marks* : [ *${match.marks}* ]\n\n` +
      `*Full Activity Log:*\n${profileLink}\n\n` +
      `_MMU Marks Bot_`;
    await dispatchMessage(jid, text);
  } catch {
    await sock.sendMessage(jid, { text: "Failed to fetch member details." });
  }
}

async function sendWeeklyMarks() {
  if (!sock) return { success: false, message: "Bot not connected." };
  let sentCount = 0, skippedCount = 0;
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 30000 });
    if (!Array.isArray(members)) return { success: false, message: "Invalid API data." };
    const eligible = members.filter(m => m.whatsappNumber?.trim());
    skippedCount = members.length - eligible.length;
    console.log(`Sending to ${eligible.length} members (${skippedCount} skipped)...`);
    for (const member of eligible) {
      const jid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      try {
        await dispatchMessage(jid, buildMessage(member));
        console.log(`Sent -> ${displayName(member)}`);
        sentCount++;
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error(`Failed -> ${member.name}: ${err.message}`);
        skippedCount++;
      }
    }
    console.log("Blast complete!");
    return { sent: sentCount, skipped: skippedCount, message: "Blast complete!" };
  } catch (err) {
    return { sent: sentCount, skipped: skippedCount, error: err.message };
  }
}

// ── Group add helpers ─────────────────────────────────────
async function triggerInviteFallback(member, jid, name, groupId, originError, res) {
  console.log(`Privacy restriction for ${name}. Sending DM invite...`);
  let link = extractPersonalInviteLink(originError, jid) || await getGroupInviteLink(groupId);

  if (link) {
    try {
      await sock.sendMessage(jid, {
        text:
          `*Group Invitation | MMU*\n\n` +
          `Hello *${member.name}*,\n` +
          `We couldn't add you directly due to your privacy settings.\n\n` +
          `Please join using this link:\n${link}\n\n` +
          `_MMU Marks Bot_`
      });
      const gradeInfo = member.grade    ? `\n   *Grade* : ${member.grade}`       : "";
      const catInfo   = member.category ? `\n   *Category* : ${member.category}` : "";
      await dispatchMessage(groupId,
        `*Group Add Report*\n\n` +
        `Invite Link Sent (Privacy Restricted):\n` +
        `   *Name* : ${member.name}${gradeInfo}${catInfo}\n` +
        `   *Marks* : [ *${member.marks}* ]\n` +
        `   *Position* : ${member.rank}\n\n` +
        `   A join link has been sent to their DM.\n\n` +
        `_MMU Marks Bot_`
      );
      return res.json({ success: true, status: "invited", message: "Invite link sent to DM." });
    } catch (dmErr) {
      return res.json({ success: false, status: "dm_failed", message: `Could not send DM to ${name}` });
    }
  }
  return res.json({ success: false, status: "invite_failed", message: "Privacy restriction — link generation failed." });
}

// ── Message text + command extraction ─────────────────────
// Unwraps ephemeral / view-once / edited message containers that WhatsApp
// (especially inside groups with disappearing messages enabled) wraps the
// real message in. Without this, msg.message.conversation is undefined and
// the command parser silently sees an empty string — which looks exactly
// like "commands don't work in groups".
function unwrapMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage)            return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage)             return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2)           return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.viewOnceMessageV2Extension)  return unwrapMessage(message.viewOnceMessageV2Extension.message);
  if (message.documentWithCaptionMessage)  return unwrapMessage(message.documentWithCaptionMessage.message);
  if (message.editedMessage)               return unwrapMessage(message.editedMessage.message);
  return message;
}

function extractText(rawMessage) {
  const message = unwrapMessage(rawMessage);
  if (!message) return "";
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ""
  ).trim();
}

// Runs a parsed command, reacting immediately so the user sees the bot
// received it (API calls behind .markslist / .marks can take a few seconds).
async function runCommand(jid, msgKey, cmd, text) {
  await reactTo(msgKey, "⏳");
  try {
    if (cmd === ".about") {
      await handleAbout(jid);
    } else if (cmd === ".markslist") {
      await handleMarksList(jid);
    } else if (cmd.startsWith(".marks ")) {
      const query = text.slice(7).trim();
      query
        ? await handleMarksMember(jid, query)
        : await sock.sendMessage(jid, { text: "Usage: `.marks MemberName`" });
    } else {
      return; // not a recognized command — leave no reaction
    }
    await reactTo(msgKey, "✅");
  } catch (err) {
    console.error(`Command error: ${err.message}`);
    await reactTo(msgKey, "❌");
  }
}

// Shared upsert handler used by both the initial connection and the
// admin-panel re-pair connection, so command/group behavior never drifts
// between the two code paths.
function registerMessageHandler(sockInstance) {
  sockInstance.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;

      const isGroup = msg.key.remoteJid?.endsWith("@g.us");

      const text = extractText(msg.message);
      if (!text || !text.startsWith(".")) continue;

      // fromMe is true for ANY message sent from the paired account — that
      // includes the owner typing a command on their own phone, not just
      // messages the bot's own code sent. Blanket-skipping fromMe (the old
      // behavior) silently swallowed every command the owner tried to run,
      // in groups and DMs alike, because it looked identical to "the bot
      // already replied to this."
      //
      // The bot's own replies never start with "." (see buildMessage /
      // handleAbout / etc. above), so the `text.startsWith(".")` check
      // above already filters those out. That means we no longer need to
      // gate on fromMe at all to avoid reprocessing the bot's own output —
      // a command-shaped message is, by construction, something a human
      // typed, whether or not it came from the paired number.
      const jid = msg.key.remoteJid;
      const cmd = text.toLowerCase();
      console.log(`Command: "${text}" ${isGroup ? "(group)" : "(dm)"}${msg.key.fromMe ? " (from owner)" : ""}`);

      await runCommand(jid, msg.key, cmd, text);
    }
  });
}

// ── WhatsApp Connect ──────────────────────────────────────
async function connectToWhatsApp() {
  checkAuthFolderHealth();

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    // FIX (#1): real getMessage backed by messageStore instead of a
    // hardcoded `async () => undefined`. Without this, Baileys cannot
    // satisfy session-resync retries, and outgoing messages can silently
    // fail to land even though sendMessage() resolved and your code
    // already logged "Sent ->".
    getMessage: async (key) => {
      return messageStore.get(`${key.remoteJid}:${key.id}`) || undefined;
    },
  });

  // FIX (#1): record every outgoing message so getMessage() above can
  // actually answer retry requests for it.
  attachMessageStore(sock);

  if (!sock.authState.creds.registered && !pairingRequested) {
    pairingRequested = true;

    // If PAIR_PHONE is set in env, skip the interactive prompt entirely.
    // This matters on hosts that don't give you a real TTY attached to the
    // running process — readline.question() can hang forever or resolve
    // with an empty string in that situation, which silently breaks pairing.
    const phone = PAIR_PHONE_ENV
      ? (console.log(`\nUsing PAIR_PHONE from environment: ${PAIR_PHONE_ENV}`), PAIR_PHONE_ENV)
      : await question("Enter phone with country code (e.g. 94771234567): ");

    setTimeout(async () => {
      if (!beginPairing("terminal")) {
        console.warn("[Pairing:terminal] Aborted — another pairing request is already in flight.");
        return;
      }
      try {
        await requestPairingCodeFor(sock, phone, "terminal");
      } catch (err) {
        console.error("Pairing failed:", err.message);
      } finally {
        endPairing();
      }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  registerMessageHandler(sock);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(`Disconnected (reason: ${reason})`);
      if (reason === DisconnectReason.loggedOut) {
        console.log("Logged out. Delete auth_info and restart.");
        sock = null;
      } else {
        console.log("Reconnecting in 3s...");
        pairingRequested = false;
        setTimeout(connectToWhatsApp, 3000);
      }
    }
    if (connection === "open") {
      botStartTime = Date.now();
      console.log("Bot connected!");
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        await sock.sendMessage(userJid, {
          text:
            `*Ayanakoji_X | Online*\n\n` +
            `Status    : Operational\n` +
            `Image     : ${hasImage() ? "Loaded" : "Missing"}\n` +
            `Next blast: ${getNextRunTime()}\n\n` +
            `_Type .about for full status_`
        });
      } catch {}
    }
  });
}

// ── Express API ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Bot status
app.get("/api/bot/status", (req, res) => {
  const cfg = loadConfig();
  res.json({
    connected:   !!sock,
    uptime:      formatUptime(),
    nextBlast:   getNextRunTime(),
    imageLoaded: hasImage(),
    botSubheading: process.env.BOT_SUBHEADING || "SampleBot",
    groupId:     cfg.groupId || "",
  });
});

// Auth: verify admin password
app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body;
  const cfg = loadConfig();
  if (password === cfg.adminPassword) return res.json({ success: true });
  return res.status(401).json({ success: false, error: "Wrong password." });
});

// Auth: change password
app.post("/api/admin/change-password", (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: "New password must be at least 4 characters." });
  const cfg = loadConfig();
  if (currentPassword !== cfg.adminPassword)
    return res.status(401).json({ error: "Current password incorrect." });
  saveConfig({ adminPassword: newPassword });
  return res.json({ success: true });
});

// Logout: delete auth folder and disconnect
app.post("/api/admin/logout", (req, res) => {
  const { password } = req.body;
  const cfg = loadConfig();
  if (password !== cfg.adminPassword) return res.status(401).json({ error: "Wrong password." });
  try {
    if (sock) {
      try { sock.logout(); } catch {}
      sock = null;
    }
    if (fs.existsSync(AUTH_PATH)) {
      fs.rmSync(AUTH_PATH, { recursive: true, force: true });
      console.log("auth_info deleted via admin panel.");
    }
    pairingRequested = false;
    endPairing(); // clear any stuck pairing lock so a fresh attempt isn't blocked
    return res.json({ success: true, message: "Logged out and auth cleared." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Pair: request pairing code for a phone number
app.post("/api/admin/pair", async (req, res) => {
  const { phone, password } = req.body;
  const cfg = loadConfig();
  if (password !== cfg.adminPassword) return res.status(401).json({ error: "Wrong password." });
  if (!phone) return res.status(400).json({ error: "Missing phone number." });

  // Guard against racing the terminal pairing flow (or a previous
  // still-pending admin-panel request). Without this, two sockets can both
  // call requestPairingCode against the same auth_info folder, and whichever
  // code finishes second silently invalidates the first — the user is then
  // looking at a dead code and WhatsApp correctly calls it "wrong".
  if (!beginPairing("admin-panel")) {
    return res.status(409).json({
      error: "Another pairing request is already in progress. Wait ~45s for it to finish or expire, then try again.",
    });
  }

  try {
    checkAuthFolderHealth();

    // Reconnect with fresh auth
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      // FIX (#1): same real getMessage as connectToWhatsApp() — this path
      // creates its own socket, so it needs the fix applied independently.
      getMessage: async (key) => {
        return messageStore.get(`${key.remoteJid}:${key.id}`) || undefined;
      },
    });

    // FIX (#1): attach the store to this socket too.
    attachMessageStore(sock);

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") {
        botStartTime = Date.now();
        console.log("Bot connected after pairing!");
        endPairing();
        try {
          const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
          await sock.sendMessage(userJid, {
            text: `*Ayanakoji_X | Online*\n\nPaired successfully via admin panel.\nNext blast: ${getNextRunTime()}`
          });
        } catch {}
      }
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) {
          setTimeout(connectToWhatsApp, 3000);
        } else {
          sock = null;
          endPairing();
        }
      }
    });

    registerMessageHandler(sock);

    await new Promise(r => setTimeout(r, 2000));
    const { raw, formatted } = await requestPairingCodeFor(sock, phone, "admin-panel");
    return res.json({ success: true, code: formatted, rawCode: raw });
  } catch (err) {
    endPairing();
    return res.status(500).json({ error: err.message });
  }
});

// Groups: fetch all groups the bot is in
app.get("/api/bot/groups", async (req, res) => {
  if (!sock) return res.status(503).json({ error: "Bot not connected." });
  try {
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups).map(g => ({
      id:      g.id,
      name:    g.subject,
      members: g.participants?.length || 0,
    }));
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Groups: set active group
app.post("/api/bot/set-group", (req, res) => {
  const { groupId, password } = req.body;
  const cfg = loadConfig();
  if (password !== cfg.adminPassword) return res.status(401).json({ error: "Wrong password." });
  if (!groupId) return res.status(400).json({ error: "Missing groupId." });
  saveConfig({ groupId });
  return res.json({ success: true, groupId });
});

// Send to single member
app.post("/api/bot/send", async (req, res) => {
  const { memberId } = req.body;
  if (!sock)     return res.status(503).json({ error: "Bot not connected." });
  if (!memberId) return res.status(400).json({ error: "Missing memberId." });
  try {
    const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 15000 });
    if (!member?.whatsappNumber) return res.status(404).json({ error: "No WhatsApp number." });
    const jid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    await dispatchMessage(jid, buildMessage(member));
    console.log(`Sent -> ${displayName(member)}`);
    return res.json({ success: true, message: `Sent to ${displayName(member)}` });
  } catch (err) {
    return res.status(500).json({ error: "Failed to send.", details: err.message });
  }
});

// Send to all
app.post("/api/bot/send-all", async (req, res) => {
  if (!sock) return res.status(503).json({ error: "Bot not connected." });
  const result = await sendWeeklyMarks();
  return result.error ? res.status(500).json(result) : res.json(result);
});

// Add single member to group
app.post("/api/bot/add-to-group", async (req, res) => {
  const { memberId } = req.body;
  const groupId = getGroupId();
  if (!sock)    return res.status(503).json({ error: "Bot not connected." });
  if (!memberId) return res.status(400).json({ error: "Missing memberId." });
  if (!groupId)  return res.status(400).json({ error: "No group selected. Set a group in the admin panel." });

  try {
    const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 15000 });
    if (!member?.whatsappNumber) return res.status(404).json({ error: "No WhatsApp number." });

    const number = member.whatsappNumber.replace(/\D/g, "");
    const jid    = `${number}@s.whatsapp.net`;
    const name   = displayName(member);

    const valid = await isValidWhatsAppNumber(number);
    if (!valid) {
      await dispatchMessage(groupId,
        `*Group Add Report*\n\nCould not add member:\n   *${name}* — Invalid or unregistered WhatsApp number\n\n_MMU Marks Bot_`
      );
      return res.json({ success: false, status: "invalid_number", message: "Invalid WhatsApp number." });
    }

    await saveContact(jid, member);

    try {
      const response = await sock.groupParticipantsUpdate(groupId, [jid], "add");
      console.log("Baileys response:", JSON.stringify(response));
      // FIX (#3): use Number() instead of string-only comparison so a
      // numeric status code (vs a string "403") doesn't slip through as
      // if it were a success.
      if (response && Array.isArray(response)) {
        const restricted = response.some(i => Number(i.status) === 403);
        if (restricted) return await triggerInviteFallback(member, jid, name, groupId, response, res);
      }
      const gradeInfo = member.grade    ? `\n   *Grade* : ${member.grade}`       : "";
      const catInfo   = member.category ? `\n   *Category* : ${member.category}` : "";
      await dispatchMessage(groupId,
        `*New Member Added*\n\nSuccessfully Added:\n   *Name* : ${member.name}${gradeInfo}${catInfo}\n   *Marks* : [ *${member.marks}* ]\n   *Position* : ${member.rank}\n\n_MMU Marks Bot_`
      );
      return res.json({ success: true, status: "added", message: `${name} added!` });
    } catch (addErr) {
      return await triggerInviteFallback(member, jid, name, groupId, addErr, res);
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal error.", details: err.message });
  }
});

// Add selected members to group (bulk)
app.post("/api/bot/add-selected-to-group", async (req, res) => {
  const { memberIds } = req.body;
  const groupId = getGroupId();
  if (!sock)              return res.status(503).json({ error: "Bot not connected." });
  if (!memberIds?.length) return res.status(400).json({ error: "Missing memberIds." });
  if (!groupId)           return res.status(400).json({ error: "No group selected. Set a group in the admin panel." });

  const addedList = [], invitedList = [], invalidList = [];
  let backupInviteLink = null;

  for (const memberId of memberIds) {
    try {
      const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 10000 });
      if (!member?.whatsappNumber?.trim()) {
        invalidList.push({ name: member?.name || memberId, number: "—", reason: "No number saved" });
        continue;
      }
      const number = member.whatsappNumber.replace(/\D/g, "");
      const jid    = `${number}@s.whatsapp.net`;
      const name   = displayName(member);
      const valid  = await isValidWhatsAppNumber(number);
      if (!valid) {
        invalidList.push({ name: member.name, number, reason: "Not on WhatsApp" });
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      await saveContact(jid, member);
      try {
        const response = await sock.groupParticipantsUpdate(groupId, [jid], "add");
        // FIX (#3): Number() instead of string-only comparison here too.
        const restricted = Array.isArray(response) && response.some(i => Number(i.status) === 403);
        if (restricted) throw { content: response, message: "Privacy restricted" };
        addedList.push(member);
      } catch (addErr) {
        let link = extractPersonalInviteLink(addErr?.content || addErr, jid);
        if (!link) {
          if (!backupInviteLink) backupInviteLink = await getGroupInviteLink(groupId);
          link = backupInviteLink;
        }
        if (link) {
          try {
            await sock.sendMessage(jid, {
              text: `*Group Invitation | MMU*\n\nHello *${member.name}*,\nWe couldn't add you directly due to your privacy settings.\n\nPlease join using this link:\n${link}\n\n_MMU Marks Bot_`
            });
            invitedList.push(member);
          } catch { invalidList.push({ name: member.name, number, reason: "Could not send DM" }); }
        } else {
          invalidList.push({ name: member.name, number, reason: "Privacy restriction — invite link unavailable" });
        }
      }
      await new Promise(r => setTimeout(r, 1200));
    } catch { invalidList.push({ name: memberId, number: "—", reason: "Fetch error" }); }
  }

  let announcement = `*Group Add Report*\n\n`;
  if (addedList.length)   announcement += `Successfully Added (${addedList.length}):\n` + addedList.map((m, i) => `   ${i+1}. *${m.name}*${m.grade ? ` | ${m.grade}` : ""}${m.category ? ` | ${m.category}` : ""} — ${m.marks} marks\n`).join("") + "\n";
  if (invitedList.length) announcement += `Invite Link Sent — Privacy Restricted (${invitedList.length}):\n` + invitedList.map((m, i) => `   ${i+1}. *${m.name}*${m.grade ? ` | ${m.grade}` : ""}\n`).join("") + `   A join link was sent to each of their DMs.\n\n`;
  if (invalidList.length) announcement += `Could Not Add (${invalidList.length}):\n` + invalidList.map((m, i) => `   ${i+1}. *${m.name}* — ${m.reason}\n`).join("") + `   Please update their WhatsApp numbers in the database.\n\n`;
  announcement += `--- --- --- --- --- ---\nAdded: *${addedList.length}* |  Invited: *${invitedList.length}* |  Failed: *${invalidList.length}*\n\n_MMU Marks Bot_`;

  if (addedList.length || invitedList.length || invalidList.length) {
    await dispatchMessage(groupId, announcement);
  }

  return res.json({
    added: addedList.length, invited: invitedList.length, failed: invalidList.length,
    message: `${addedList.length} added, ${invitedList.length} invited, ${invalidList.length} failed.`,
  });
});

app.listen(PORT, () => console.log(`Bot server running on http://localhost:${PORT}`));

// ── Cron ──────────────────────────────────────────────────
cron.schedule(CRON_SCHEDULE, () => {
  console.log("Weekly blast triggered...");
  sendWeeklyMarks();
});

// ── Start ─────────────────────────────────────────────────
console.log("MMU Marks Bot starting...");
console.log(`Schedule: ${CRON_SCHEDULE} | Next: ${getNextRunTime()}`);
if (!hasImage()) console.warn("images/caption.png not found — text-only mode");
connectToWhatsApp();