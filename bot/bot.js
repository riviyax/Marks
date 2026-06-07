// ============================================================
//  Ayanakoji_X | Marks Bot  —  Baileys + node-cron + Express
//  Folder: whatsapp-bot/
//  Run:    node bot.js
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
const API_BASE      = process.env.API_BASE         || "http://localhost:3000/api/members";
const MEMBER_VIEW   = process.env.MEMBER_VIEW_BASE || "https://mmumarks.vercel.app/memberview";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE    || "0 9 * * 1";
const GROUP_ID      = process.env.GROUP_ID         || "120363428923888353@g.us";
const IMAGE_PATH    = path.resolve(__dirname, "images/caption.png"); // always use local image
// ─────────────────────────────────────────────────────────

let sock        = null;
let botStartTime = Date.now();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (t) => new Promise((r) => rl.question(t, r));

// ── Helpers ───────────────────────────────────────────────

function displayName(member) {
  return member.grade && member.grade.trim() !== ""
    ? `${member.name} - ${member.grade}`
    : member.name;
}

// Check if local image exists
function hasImage() {
  return fs.existsSync(IMAGE_PATH);
}

// Send message — always with image if available
async function dispatchMessage(jid, text) {
  if (hasImage()) {
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    await sock.sendMessage(jid, { image: imageBuffer, caption: text });
  } else {
    await sock.sendMessage(jid, { text });
  }
}

// Weekly marks message per member
function buildMessage(member) {
  const profileLink = `${MEMBER_VIEW}?id=${member._id}`;
  const gradeInfo   = member.grade    ? `\n   *Grade* : ${member.grade}`    : "";
  const catInfo     = member.category ? `\n   *Category* : ${member.category}` : "";

  return (
    `◢◤ *Marks Bot | Mudalians' Media Unit* ◢◤\n\n` +
    `👋 Hello *${displayName(member)}*,\n` +
    `Your evaluation metrics have been updated.\n\n` +
    `❖ *WEEKLY STATUS EVALUATION* ❖\n` +
    ` ─── ─── ─── ─── ─── ───\n` +
    `   *Position* : ${member.rank}${gradeInfo}${catInfo}\n` +
    `   *Marks* : [ *${member.marks}* ]\n` +
    ` ─── ─── ─── ─── ─── ───\n\n` +
    `🔗 *View Full Activity Log:*\n${profileLink}\n\n` +
    `◆ ─── ─── ─── ─── ─── ◆\n` +
    `⚡ _Developed by Riviya_X_`
  );
}

// Message sent to group when member is added
function buildGroupAddMessage(member) {
  const gradeInfo = member.grade    ? `\n 🎓  *Grade* : ${member.grade}`    : "";
  const catInfo   = member.category ? `\n 📌  *Category* : ${member.category}` : "";
  return (
    `✅ *New Member Added* ✅\n\n` +
    `   *Name* : ${member.name}${gradeInfo}${catInfo}\n` +
    `   *Marks* : [ *${member.marks}* ]\n` +
    `   *Position* : ${member.rank}\n\n` +
    `◆ ─── ─── ─── ─── ─── ◆\n` +
    `⚡ _MMU Marks Bot_`
  );
}

// Countdown to next cron run
function getNextRunTime() {
  try {
    const parts     = CRON_SCHEDULE.split(" ");
    const min       = parseInt(parts[0]) || 0;
    const hour      = parseInt(parts[1]) || 9;
    const now       = new Date();
    const next      = new Date();
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

// .about — bot status + next blast
async function handleAbout(jid) {
  const text =
    `◢◤ *Marks Bot | System Status* ◢◤\n\n` +
    `🤖  *Bot Name* : Ayanakoji_X\n` +
    `🟢  *Status* : Online\n` +
    `⏱️  *Uptime* : ${formatUptime()}\n` +
    `🖼️  *Image* : ${hasImage() ? "✅ Loaded" : "❌ Not found (images/caption.png)"}\n\n` +
    `📅 *Next Weekly Blast:*\n   ${getNextRunTime()}\n\n` +
    `📋 *Commands:*\n` +
    `   .about       — Show this status\n` +
    `   .markslist   — All members & marks\n` +
    `   .marks Name  — One member's details\n\n` +
    `◆ ─── ─── ─── ─── ─── ◆\n` +
    `⚡ _Developed by Riviya_X_`;
  await dispatchMessage(jid, text);
}

// .markslist — all members + marks
async function handleMarksList(jid) {
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 15000 });
    if (!Array.isArray(members) || members.length === 0) {
      await sock.sendMessage(jid, { text: "⚠️ No members found in database." });
      return;
    }

    // Sort by marks descending
    const sorted = [...members].sort((a, b) => Number(b.marks) - Number(a.marks));

    let list = `◢◤ *MMU Marks List* ◢◤\n\n`;
    sorted.forEach((m, i) => {
      const grade = m.grade ? ` (${m.grade})` : "";
      list += `${i + 1}. *${m.name}*${grade}\n`;
      list += `     Marks: *${m.marks}* |   ${m.rank}\n`;
      if (m.category) list += `     ${m.category}\n`;
      list += "\n";
    });
    list += `Total members: ${members.length}\n`;
    list += `◆ ─── ─── ─── ─── ─── ◆\n⚡ _MMU Marks Bot_`;

    await dispatchMessage(jid, list);
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to fetch marks list.` });
  }
}

// .marks Name — single member details
async function handleMarksMember(jid, query) {
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 15000 });
    if (!Array.isArray(members)) {
      await sock.sendMessage(jid, { text: "⚠️ Failed to fetch members." });
      return;
    }

    const match = members.find((m) =>
      m.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!match) {
      await sock.sendMessage(jid, { text: `❌ No member found matching "*${query}*". Try .markslist to see all names.` });
      return;
    }

    const profileLink = `${MEMBER_VIEW}?id=${match._id}`;
    const gradeInfo   = match.grade    ? `\n 🎓  *Grade* : ${match.grade}`    : "";
    const catInfo     = match.category ? `\n 📌  *Category* : ${match.category}` : "";

    const text =
      `◢◤ *Member Details* ◢◤\n\n` +
      `   *Name* : ${match.name}${gradeInfo}${catInfo}\n` +
      `   *Position* : ${match.rank}\n` +
      `   *Marks* : [ *${match.marks}* ]\n\n` +
      `🔗 *Full Activity Log:*\n${profileLink}\n\n` +
      `◆ ─── ─── ─── ─── ─── ◆\n⚡ _MMU Marks Bot_`;

    await dispatchMessage(jid, text);
  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ Failed to resolve member details.` });
  }
}

// ── Send All (weekly blast) ───────────────────────────────
async function sendWeeklyMarks() {
  if (!sock) return { success: false, message: "Bot not connected." };
  let sentCount = 0, skippedCount = 0;
  try {
    const { data: members } = await axios.get(API_BASE, { timeout: 30000 });
    if (!Array.isArray(members)) return { success: false, message: "Invalid data from API." };

    const eligible = members.filter((m) => m.whatsappNumber && m.whatsappNumber.trim() !== "");
    skippedCount = members.length - eligible.length;
    console.log(`📤 Sending to ${eligible.length} members (${skippedCount} skipped)...`);

    for (const member of eligible) {
      const jid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      try {
        await dispatchMessage(jid, buildMessage(member));
        console.log(`✅ Sent to ${displayName(member)}`);
        sentCount++;
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(`❌ Failed for ${member.name}`);
        skippedCount++;
      }
    }
    console.log("🎉 Blast complete!");
    return { sent: sentCount, skipped: skippedCount, message: "Blast complete!" };
  } catch (err) {
    return { sent: sentCount, skipped: skippedCount, error: "Network stream failure during bulk distribution." };
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
    shouldIgnoreJid: (jid) => false,
  });

  if (!sock.authState.creds.registered) {
    console.log("\n📲 Pairing sequence started...");
    const phone   = await question("Enter phone number with country code (e.g. 94771234567): ");
    const cleaned = phone.replace(/\D/g, "");
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(cleaned);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n🔑 Pairing Code: ${code}\n`);
      } catch (err) { console.error("❌ Pairing failed"); }
    }, 3000);
  }

  sock.ev.on("creds.update", saveCreds);

  // Incoming message handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      for (const msg of messages) {
        if (msg.key.fromMe) continue;

        const text = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text || ""
        ).trim();

        if (!text.startsWith(".")) continue;

        const jid = msg.key.remoteJid;
        console.log(`📩 Command "${text}" from ${jid}`);

        if (text.toLowerCase() === ".about") {
          await handleAbout(jid);

        } else if (text.toLowerCase() === ".markslist") {
          await handleMarksList(jid);

        } else if (text.toLowerCase().startsWith(".marks ")) {
          const query = text.slice(7).trim();
          if (query) {
            await handleMarksMember(jid, query);
          } else {
            await sock.sendMessage(jid, { text: "Usage: `.marks MemberName`\nExample: `.marks Helika`" });
          }
        }
      }
    } catch (upsertErr) {
      console.warn("⚠️ Intercepted dynamic read stream payload evaluation failure.");
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("🚪 Logged out. Delete auth_info and restart.");
      } else {
        connectToWhatsApp();
      }
    }
    if (connection === "open") {
      botStartTime = Date.now();
      console.log("✅ Bot connected!");
      console.log(`🖼️  Image: ${hasImage() ? "✅ Found" : "❌ Not found — place caption.png in images/"}`);
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        await sock.sendMessage(userJid, {
          text:
            `◢◤ *Ayanakoji_X | Online* ◢◤\n\n` +
            `⚙️ Status: *Operational*\n` +
            `🖼️ Image: ${hasImage() ? "✅ Loaded" : "❌ Missing (images/caption.png)"}\n` +
            `📅 Next blast: ${getNextRunTime()}\n\n` +
            `📋 Commands: .about | .markslist | .marks Name\n\n` +
            `⚡ _Type .about to see full status_`
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
    if (!member?.whatsappNumber) return res.status(404).json({ error: "No WhatsApp number for this member." });
    const jid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    await dispatchMessage(jid, buildMessage(member));
    console.log(`✅ Sent to ${displayName(member)}`);
    return res.json({ success: true, message: `Sent to ${displayName(member)}` });
  } catch (err) {
    return res.status(500).json({ error: "Failed to dispatch message payload." });
  }
});

// Send to all
app.post("/api/bot/send-all", async (req, res) => {
  if (!sock) return res.status(503).json({ error: "Bot not connected." });
  const result = await sendWeeklyMarks();
  return result.error ? res.status(500).json({ error: result.error }) : res.json(result);
});

// ✅ Add single member to group (With Clean Privacy Settings Fallback Join Link)
app.post("/api/bot/add-to-group", async (req, res) => {
  const { memberId, groupId } = req.body;
  if (!sock)               return res.status(503).json({ error: "Bot not connected." });
  if (!memberId || !groupId) return res.status(400).json({ error: "Missing memberId or groupId." });
  
  try {
    const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 15000 });
    if (!member?.whatsappNumber) return res.status(404).json({ error: "No WhatsApp number for this member." });

    const participantJid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    
    try {
      // Attempt direct add
      await sock.groupParticipantsUpdate(groupId, [participantJid], "add");
      console.log(`✅ Added ${displayName(member)} to group`);

      await dispatchMessage(groupId, buildGroupAddMessage(member));
      return res.json({ success: true, status: "added", message: `${displayName(member)} added directly.` });

    } catch (addErr) {
      // Direct add failed (Privacy restrictions found). Handle cleanly without logging the full big error dump.
      console.log(`⚠️ Privacy restriction hit for ${member.name}. Sending direct join link...`);
      
      const inviteCode = await sock.groupInviteCode(groupId);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      const dmText = 
        `◢◤ *Group Invitation | MMU* ◢◤\n\n` +
        `👋 Hello *${member.name}*,\n` +
        `We tried adding you to our official group, but your privacy settings didn't allow direct adds.\n\n` +
        `Please use the link below to join manually:\n` +
        `🔗 ${inviteLink}\n\n` +
        `◆ ─── ─── ─── ─── ─── ◆\n⚡ _MMU Marks Bot_`;

      await dispatchMessage(participantJid, dmText);
      
      return res.json({ 
        success: true, 
        status: "invited", 
        message: "Privacy settings prevented direct add. Invitation link has been sent to DM." 
      });
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal member data resolution failure." });
  }
});

// ✅ Add multiple selected members to group (With Clean Privacy Settings Fallback Join Link)
app.post("/api/bot/add-selected-to-group", async (req, res) => {
  const { memberIds, groupId } = req.body;
  if (!sock) return res.status(503).json({ error: "Bot not connected." });
  if (!memberIds?.length || !groupId) return res.status(400).json({ error: "Missing memberIds or groupId." });

  let added = 0, invited = 0, failed = 0;
  const addedNames = [];
  let inviteLink = null;

  for (const memberId of memberIds) {
    try {
      const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 10000 });
      if (!member?.whatsappNumber) { failed++; continue; }

      const jid = `${member.whatsappNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      
      try {
        await sock.groupParticipantsUpdate(groupId, [jid], "add");
        addedNames.push(displayName(member));
        added++;
      } catch (addErr) {
        // Privacy catch block executed cleanly without big console error spam
        if (!inviteLink) {
          const inviteCode = await sock.groupInviteCode(groupId);
          inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        }

        const dmText = 
          `◢◤ *Group Invitation | MMU* ◢◤\n\n` +
          `👋 Hello *${member.name}*,\n` +
          `We tried adding you to our official group, but your privacy settings don't allow direct additions.\n\n` +
          `Please use this link to join us manually:\n` +
          `🔗 ${inviteLink}\n\n` +
          `◆ ─── ─── ─── ─── ─── ◆\n⚡ _MMU Marks Bot_`;

        await dispatchMessage(jid, dmText);
        invited++;
      }
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      failed++;
    }
  }

  if (addedNames.length > 0) {
    const announcementText =
      `✅ *New Members Added to Group* ✅\n\n` +
      addedNames.map((n, i) => `${i + 1}. *${n}*`).join("\n") +
      `\n\n` +
      `Total added directly: *${added}*\n` +
      (invited > 0 ? `Sent DM invites due to privacy settings: *${invited}*\n` : "") +
      `◆ ─── ─── ─── ─── ─── ◆\n⚡ _MMU Marks Bot_`;
    await dispatchMessage(groupId, announcementText);
  }

  return res.json({ added, invited, failed, message: `${added} added, ${invited} invited via DM, ${failed} failed.` });
});

// Bot status
app.get("/api/bot/status", (req, res) => {
  res.json({
    connected: !!sock,
    uptime: formatUptime(),
    nextBlast: getNextRunTime(),
    schedule: CRON_SCHEDULE,
    imageLoaded: hasImage(),
  });
});

app.listen(PORT, () => console.log(`🌐 Bot server on http://localhost:${PORT}`));

// ── Cron ──────────────────────────────────────────────────
cron.schedule(CRON_SCHEDULE, () => {
  console.log("⏰ Cron triggered — weekly blast...");
  sendWeeklyMarks();
});

// ── Start ─────────────────────────────────────────────────
console.log("🤖 MMU Marks Bot starting...");
console.log(`📅 Schedule: ${CRON_SCHEDULE} | Next: ${getNextRunTime()}`);
if (!hasImage()) console.warn("⚠️  images/caption.png not found — messages will be text-only");
connectToWhatsApp();