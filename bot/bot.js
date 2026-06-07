// ============================================================
//  Ayanakoji_X | Marks Bot  —  Baileys + node-cron + Express
// ============================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");
const cron     = require("node-cron");
const axios    = require("axios");
const pino     = require("pino");
const readline = require("readline");
const express  = require("express");
const cors     = require("cors");
const fs       = require("fs");
const path     = require("path");
require("dotenv").config();

// ── Config ────────────────────────────────────────────────
const PORT          = process.env.BOT_PORT          || 3001;
const API_BASE      = process.env.API_BASE          || "http://localhost:3000/api/members";
const MEMBER_VIEW   = process.env.MEMBER_VIEW_BASE || "https://mmumarks.vercel.app/memberview";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE    || "0 9 * * 1";
const GROUP_ID      = process.env.GROUP_ID          || "";
const IMAGE_PATH    = path.resolve(__dirname, "images/caption.png");

let sock         = null;
let botStartTime = Date.now();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (t) => new Promise((r) => rl.question(t, r));

// ── Suppress noisy Baileys errors ─────────────────────────
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...args) => {
  const msg = typeof chunk === "string" ? chunk : chunk.toString();
  if (
    msg.includes("Bad MAC") ||
    msg.includes("Key used already or never filled") ||
    msg.includes("Failed to decrypt message") ||
    msg.includes("Session error") ||
    msg.includes("Closing open session") ||
    msg.includes("Closing session: SessionEntry")
  ) return true;
  return originalStderrWrite(chunk, ...args);
};
// ─────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────

function displayName(member) {
  return member.grade?.trim()
    ? `${member.name} - ${member.grade}`
    : member.name;
}

function hasImage() {
  return fs.existsSync(IMAGE_PATH);
}

async function saveContact(jid, member) {
  try {
    const name   = displayName(member);
    const number = member.whatsappNumber.replace(/\D/g, "");
    const vcard  =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `FN:${name}\n` +
      `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\n` +
      `END:VCARD`;
    await sock.sendMessage(jid, {
      contacts: { displayName: name, contacts: [{ vcard }] },
    });
  } catch {
    // Non-critical
  }
}

async function dispatchMessage(jid, text) {
  if (hasImage()) {
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    await sock.sendMessage(jid, { image: imageBuffer, caption: text });
  } else {
    await sock.sendMessage(jid, { text });
  }
}

function buildMessage(member) {
  const profileLink = `${MEMBER_VIEW}?id=${member._id}`;
  const gradeInfo   = member.grade    ? `\n   *Grade* : ${member.grade}`    : "";
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
  } catch {
    return false;
  }
}

async function getGroupInviteLink(groupId) {
  try {
    const code = await sock.groupInviteCode(groupId);
    console.log(`Invite link fetched successfully for group: ${groupId}`);
    return `https://chat.whatsapp.com/${code}`;
  } catch (err) {
    console.error(`Failed to get invite link for group ${groupId}: ${err.message}`);
    console.error(`Make sure the bot is a group admin.`);
    return null;
  }
}

/**
 * Searches the dynamic data trees inside Baileys responses or error contents 
 * to capture the private invite code accurately.
 */
function extractPersonalInviteLink(content, jid) {
  if (!content) return null;
  try {
    // Case 1: content is a direct status array returned on a clean response resolve
    if (Array.isArray(content)) {
      const target = content.find(item => item.jid === jid || item.id === jid);
      if (target?.content?.length) {
        const inviteNode = target.content.find(node => node.tag === 'invite');
        if (inviteNode?.attrs?.code) {
          return `https://chat.whatsapp.com/invite/${inviteNode.attrs.code}`;
        }
      }
    }
    
    // Case 2: content is nested under an error structure object array
    const searchTarget = Array.isArray(content) ? content : content.content || [];
    const groupUpdateNode = searchTarget.find(node => node.tag === 'group');
    if (groupUpdateNode && Array.isArray(groupUpdateNode.content)) {
      const addNode = groupUpdateNode.content.find(node => node.tag === 'add');
      if (addNode && Array.isArray(addNode.content)) {
        const userNode = addNode.content.find(node => node.tag === 'user' && node.attrs?.jid === jid);
        if (userNode && Array.isArray(userNode.content)) {
          const inviteNode = userNode.content.find(node => node.tag === 'invite');
          if (inviteNode && inviteNode.attrs?.code) {
            return `https://chat.whatsapp.com/invite/${inviteNode.attrs.code}`;
          }
        }
      }
    }
  } catch (parseErr) {
    console.error("Failed parsing logic during invite verification:", parseErr.message);
  }
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
      list += `     Marks: *${m.marks}* |  ${m.rank}\n`;
      if (m.category) list += `     ${m.category}\n`;
      list += "\n";
    });
    list += `Total: ${members.length} members\n`;
    list += `_MMU Marks Bot_`;
    await dispatchMessage(jid, list);
  } catch {
    await sock.sendMessage(jid, { text: "Failed to fetch marks list." });
  }
}

async function handleMarksMember(jid, query) {
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 15000 });
    const match = members.find((m) =>
      m.name.toLowerCase().includes(query.toLowerCase())
    );
    if (!match) {
      await sock.sendMessage(jid, { text: `No member found for "*${query}*".\nTry .markslist to see all names.` });
      return;
    }
    const profileLink = `${MEMBER_VIEW}?id=${match._id}`;
    const gradeInfo   = match.grade    ? `\n   *Grade* : ${match.grade}`    : "";
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
    const eligible = members.filter((m) => m.whatsappNumber?.trim());
    skippedCount = members.length - eligible.length;
    console.log(`Sending to ${eligible.length} members (${skippedCount} skipped)...`);
    for (const member of eligible) {
      const jid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      try {
        await dispatchMessage(jid, buildMessage(member));
        console.log(`Sent -> ${displayName(member)}`);
        sentCount++;
        await new Promise((r) => setTimeout(r, 1500));
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

// ── WhatsApp Connect ──────────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    getMessage: async () => undefined,
  });

  if (!sock.authState.creds.registered) {
    console.log("\nPairing sequence started...");
    const phone   = await question("Enter phone with country code (e.g. 94771234567): ");
    const cleaned = phone.replace(/\D/g, "");
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(cleaned);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\nPairing Code: ${code}\n`);
      } catch (err) { console.error("Pairing failed:", err.message); }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.remoteJid === "status@broadcast") continue;

      const botJid     = sock.user?.id.split(":")[0] + "@s.whatsapp.net";
      const isSelfChat = msg.key.remoteJid === botJid;
      if (msg.key.fromMe && !isSelfChat) continue;

      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text || ""
      ).trim();
      if (!text.startsWith(".")) continue;

      const jid = msg.key.remoteJid;
      const cmd = text.toLowerCase();
      console.log(`Command: "${text}"`);

      try {
        if (cmd === ".about") {
          await handleAbout(jid);
        } else if (cmd === ".markslist") {
          await handleMarksList(jid);
        } else if (cmd.startsWith(".marks ")) {
          const query = text.slice(7).trim();
          query
            ? await handleMarksMember(jid, query)
            : await sock.sendMessage(jid, { text: "Usage: `.marks MemberName`\nExample: `.marks Helika`" });
        }
      } catch (err) {
        console.error(`Command error: ${err.message}`);
      }
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(`Disconnected (reason: ${reason})`);
      if (reason === DisconnectReason.loggedOut) {
        console.log("Logged out. Delete auth_info and restart.");
      } else {
        console.log("Reconnecting in 3s...");
        setTimeout(connectToWhatsApp, 3000);
      }
    }
    if (connection === "open") {
      botStartTime = Date.now();
      console.log("Bot connected!");
      console.log(`Image: ${hasImage() ? "Found" : "Missing — place caption.png in images/"}`);
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        await sock.sendMessage(userJid, {
          text:
            `*Ayanakoji_X | Online*\n\n` +
            `Status    : Operational\n` +
            `Image     : ${hasImage() ? "Loaded" : "Missing"}\n` +
            `Next blast: ${getNextRunTime()}\n\n` +
            `Commands: .about | .markslist | .marks Name\n\n` +
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

// Add single member to group (Fixed Invitation Delivery Fallbacks)
// Add single member to group (Fixed Error Handler Logic)
app.post("/api/bot/add-to-group", async (req, res) => {
  const { memberId, groupId } = req.body;
  if (!sock)                 return res.status(503).json({ error: "Bot not connected." });
  if (!memberId || !groupId) return res.status(400).json({ error: "Missing memberId or groupId." });

  try {
    const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 15000 });
    if (!member?.whatsappNumber) return res.status(404).json({ error: "No WhatsApp number." });

    const number = member.whatsappNumber.replace(/\D/g, "");
    const jid    = `${number}@s.whatsapp.net`;
    const name   = displayName(member);

    const valid = await isValidWhatsAppNumber(number);
    if (!valid) {
      console.log(`Invalid WA number: ${member.name} (${number})`);
      await dispatchMessage(groupId,
        `*Group Add Report*\n\n` +
        `Could not add member:\n` +
        `   *${name}* — Invalid or unregistered WhatsApp number (${number})\n\n` +
        `_MMU Marks Bot_`
      );
      return res.json({ success: false, status: "invalid_number", message: "Invalid WhatsApp number." });
    }

    await saveContact(jid, member);

    // Dedicated fallback handler for sending private links
    const triggerInviteFallback = async (originError) => {
      console.log(`Privacy restriction or add failure detected for ${name}. Sending DM invite...`);
      
      // Try to find a specific invite code inside the response first
      let targetedInviteLink = extractPersonalInviteLink(originError, jid);
      
      // If Baileys didn't extract a unique one, generate a standard group invite link manually
      if (!targetedInviteLink) {
        console.log(`No direct user invite code found. Generating general group invite link...`);
        targetedInviteLink = await getGroupInviteLink(groupId);
      }

      if (targetedInviteLink) {
        try {
          await sock.sendMessage(jid, {
            text:
              `*Group Invitation | MMU*\n\n` +
              `Hello *${member.name}*,\n` +
              `We couldn't add you directly due to your privacy settings.\n\n` +
              `Please join using this link:\n${targetedInviteLink}\n\n` +
              `_MMU Marks Bot_`
          });
          console.log(`Invite DM successfully delivered to ${name}`);

          const gradeInfo = member.grade    ? `\n   *Grade* : ${member.grade}`    : "";
          const catInfo   = member.category ? `\n   *Category* : ${member.category}` : "";
          
          // Post the Invite Report to the group instead of the "Successfully Added" message
          await dispatchMessage(groupId,
            `*Group Add Report*\n\n` +
            `Invite Link Sent (Privacy Restricted):\n` +
            `   *Name* : ${member.name}${gradeInfo}${catInfo}\n` +
            `   *Marks* : [ *${member.marks}* ]\n` +
            `   *Position* : ${member.rank}\n\n` +
            `   Privacy settings prevented direct add.\n` +
            `   A join link has been sent to their DM.\n\n` +
            `_MMU Marks Bot_`
          );
          return res.json({ success: true, status: "invited", message: "Invite link sent to DM." });
        } catch (dmErr) {
          console.error("Failed to send DM to member:", dmErr.message);
          return res.json({ success: false, status: "dm_failed", message: `Could not send DM to ${name}` });
        }
      } else {
        return res.json({ success: false, status: "invite_failed", message: "Privacy restriction encountered — link generation failed." });
      }
    };

    try {
      const response = await sock.groupParticipantsUpdate(groupId, [jid], "add");
      console.log("Baileys Raw Response payload:", JSON.stringify(response));
      
      // FIX: Check if ANY item in the response contains a 403 status code
      if (response && Array.isArray(response)) {
        const hasPrivacyBlock = response.some(item => item.status === '403' || parseInt(item.status) === 403);
        if (hasPrivacyBlock) {
          return await triggerInviteFallback(response);
        }
      }

      // If we got past the response array check, it was added successfully 
      console.log(`Added ${name} directly to group`);
      const gradeInfo = member.grade    ? `\n   *Grade* : ${member.grade}`    : "";
      const catInfo   = member.category ? `\n   *Category* : ${member.category}` : "";
      
      await dispatchMessage(groupId,
        `*New Member Added*\n\n` +
        `Successfully Added:\n` +
        `   *Name* : ${member.name}${gradeInfo}${catInfo}\n` +
        `   *Marks* : [ *${member.marks}* ]\n` +
        `   *Position* : ${member.rank}\n\n` +
        `_MMU Marks Bot_`
      );
      return res.json({ success: true, status: "added", message: `${name} added!` });

    } catch (addErr) {
      // Handles classic thrown rejections
      return await triggerInviteFallback(addErr);
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal error.", details: err.message });
  }
});

// Add selected members to group (bulk)
app.post("/api/bot/add-selected-to-group", async (req, res) => {
  const { memberIds, groupId } = req.body;
  if (!sock)                          return res.status(503).json({ error: "Bot not connected." });
  if (!memberIds?.length || !groupId) return res.status(400).json({ error: "Missing memberIds or groupId." });

  const addedList   = [];
  const invitedList = [];
  const invalidList = [];

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

      const valid = await isValidWhatsAppNumber(number);
      if (!valid) {
        invalidList.push({ name: member.name, number, reason: "Not on WhatsApp" });
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      await saveContact(jid, member);

      try {
        const response = await sock.groupParticipantsUpdate(groupId, [jid], "add");
        console.log(`Raw bulk response for ${name}:`, JSON.stringify(response));
        
        // FIX: Scan if ANY item inside the response status array contains a 403 status code
        let isRestricted = false;
        if (response && Array.isArray(response)) {
          isRestricted = response.some(item => item.status === '403' || parseInt(item.status) === 403);
        }

        if (isRestricted) {
          throw { content: response, message: "Privacy restricted state arrays caught" };
        }

        console.log(`Added ${name}`);
        addedList.push(member);

      } catch (addErr) {
        console.log(`Add variant check flagged or privacy filter hit for ${name}`);

        // Try to read a direct dynamic code out of the error content payload
        let targetedInviteLink = extractPersonalInviteLink(addErr?.content || addErr, jid);

        // Fallback to the main group link if a custom individual one wasn't provided
        if (!targetedInviteLink) {
          if (!backupInviteLink) {
            backupInviteLink = await getGroupInviteLink(groupId);
          }
          targetedInviteLink = backupInviteLink;
        }

        if (targetedInviteLink) {
          try {
            await sock.sendMessage(jid, {
              text:
                `*Group Invitation | MMU*\n\n` +
                `Hello *${member.name}*,\n` +
                `We couldn't add you directly due to your privacy settings.\n\n` +
                `Please join using this link:\n${targetedInviteLink}\n\n` +
                `_MMU Marks Bot_`
            });
            console.log(`Invite link successfully sent to ${name}'s DM`);
            invitedList.push(member);
          } catch (dmErr) {
            console.error(`Failed sending DM link to ${name}:`, dmErr.message);
            invalidList.push({ name: member.name, number, reason: `Could not send DM` });
          }
        } else {
          invalidList.push({ name: member.name, number, reason: "Privacy restriction — invite link unavailable" });
        }
      }

      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      invalidList.push({ name: memberId, number: "—", reason: "Fetch error" });
    }
  }

  // Combined group announcement report notice
  let announcement = `*Group Add Report*\n\n`;

  if (addedList.length > 0) {
    announcement += `Successfully Added (${addedList.length}):\n`;
    addedList.forEach((m, i) => {
      const grade = m.grade    ? ` | ${m.grade}`    : "";
      const cat   = m.category ? ` | ${m.category}` : "";
      announcement += `   ${i + 1}. *${m.name}*${grade}${cat} — ${m.marks} marks\n`;
    });
    announcement += "\n";
  }

  if (invitedList.length > 0) {
    announcement += `Invite Link Sent — Privacy Restricted (${invitedList.length}):\n`;
    invitedList.forEach((m, i) => {
      const grade = m.grade ? ` | ${m.grade}` : "";
      announcement += `   ${i + 1}. *${m.name}*${grade}\n`;
    });
    announcement += `   A join link was sent to each of their DMs.\n\n`;
  }

  if (invalidList.length > 0) {
    announcement += `Could Not Add (${invalidList.length}):\n`;
    invalidList.forEach((m, i) => {
      announcement += `   ${i + 1}. *${m.name}* — ${m.reason}\n`;
    });
    announcement += `   Please update their WhatsApp numbers in the database.\n\n`;
  }

  announcement +=
    `--- --- --- --- --- ---\n` +
    `Added: *${addedList.length}* |  Invited: *${invitedList.length}* |  Failed: *${invalidList.length}*\n\n` +
    `_MMU Marks Bot_`;

  if (addedList.length > 0 || invitedList.length > 0 || invalidList.length > 0) {
    await dispatchMessage(groupId, announcement);
  }

  return res.json({
    added:   addedList.length,
    invited: invitedList.length,
    failed:  invalidList.length,
    message: `${addedList.length} added, ${invitedList.length} invited, ${invalidList.length} failed.`,
  });
});

// Bot status
app.get("/api/bot/status", (req, res) => {
  res.json({
    connected:   !!sock,
    uptime:      formatUptime(),
    nextBlast:   getNextRunTime(),
    imageLoaded: hasImage(),
  });
});

app.listen(PORT, () => console.log(`Bot server on http://localhost:${PORT}`));

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