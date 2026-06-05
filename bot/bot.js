// ============================================================
//  Ayanakoji_X | Marks Bot  —  Baileys + node-cron + Express
//  Style: Full Anime Interface (Classroom of the Elite / Solo Leveling)
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
const cron = require("node-cron");
const axios = require("axios");
const pino = require("pino");
const readline = require("readline");
const express = require("express"); 
const cors = require("cors");       
require("dotenv").config();

// ── Config ────────────────────────────────────────────────
const PORT = process.env.BOT_PORT || 3001; 
const API_BASE = process.env.API_BASE || "https://marks.vercel.app/api/members"; 
const MEMBER_VIEW_BASE = process.env.MEMBER_VIEW_BASE || "https://mmumarks.vercel.app/memberview";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 9 * * 1"; // Every Monday 9:00 AM

// ✅ Drop your preferred Anime Banner link here (JPG/PNG) to include with the status update
const IMAGE_URL = process.env.UPDATE_IMAGE_URL || "images/caption.png"; // Example: "https://i.imgur.com/yourimage.png"
// ─────────────────────────────────────────────────────────

let sock = null; 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

function buildMessage(member) {
  const profileLink = `${MEMBER_VIEW_BASE}?id=${member._id}`;
  return (
    `◢◤ *Marks Bot | Mudalians' Media Unit* ◢◤\n\n` +
    `👋 Hello *${member.name}*,\n` +
    `Your system evaluation metrics have been updated.\n\n` +
    `❖ *WEEKLY STATUS EVALUATION* ❖\n` +
    ` ─── ─── ─── ─── ─── ───\n` +
    ` 📈  *Position* : ${member.rank}\n` +
    ` 🔥  *Marks* :  [ *${member.marks}* ]\n` +
    ` ─── ─── ─── ─── ─── ───\n\n` +
    `🔗 *Access Data Stream Link:* \n` +
    `${profileLink}\n\n` +
    `◆ ─── ─── ─── ─── ─── ◆\n` +
    `⚡ _Developed by Riviya_X with Gemini_`
  );
}

// ── Send Logic Helper (Handles Text vs Image+Caption) ─────
async function dispatchMessage(jid, textContent) {
  if (IMAGE_URL && IMAGE_URL.trim() !== "") {
    await sock.sendMessage(jid, {
      image: { url: IMAGE_URL },
      caption: textContent
    });
  } else {
    await sock.sendMessage(jid, { text: textContent });
  }
}

// ── Send marks to all members ─────────────────────────────
async function sendWeeklyMarks() {
  if (!sock) {
    console.error("❌ System core offline. Bot is not connected.");
    return { success: false, message: "Bot is not connected yet." };
  }

  let sentCount = 0;
  let skippedCount = 0;

  try {
    console.log(`⏳ [Ayanakoji_X] Fetching target files from: ${API_BASE}`);
    const { data: members } = await axios.get(API_BASE, { timeout: 30000 });

    if (!Array.isArray(members)) {
      console.error("❌ Core system returned corrupt non-array sequence:", members);
      return { success: false, message: "Invalid data format from backend API." };
    }

    const eligible = members.filter(
      (m) => m.whatsappNumber && m.whatsappNumber.trim() !== ""
    );
    skippedCount = members.length - eligible.length;

    console.log(`📤 Dispatching data packages to ${eligible.length} users (${skippedCount} profiles skipped)...`);

    for (const member of eligible) {
      const cleanNumber = member.whatsappNumber.replace(/[^0-9]/g, "");
      const jid = `${cleanNumber}@s.whatsapp.net`;
      const message = buildMessage(member);

      try {
        await dispatchMessage(jid, message);
        console.log(`✅ Transmission Success: ${member.name} (${cleanNumber})`);
        sentCount++;
        await new Promise((r) => setTimeout(r, 1500)); // Rate limit buffer delay
      } catch (err) {
        console.error(`❌ Transmission Failed for ${member.name}: ${err.message}`);
        skippedCount++;
      }
    }

    console.log("🎉 [Ayanakoji_X] Broadcast execution fully finalized!");
    return { sent: sentCount, skipped: skippedCount, message: "Blast complete!" };
  } catch (err) {
    console.error("❌ Data retrieval aborted:", err.message);
    return { sent: sentCount, skipped: skippedCount, error: err.message };
  }
}

// ── Connect to WhatsApp ───────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,            
  });

  if (!sock.authState.creds.registered) {
    console.log("\n📲 [Ayanakoji_X] Pairing Initialization sequence started...");
    const phoneNumber = await question("Enter your host phone number with country code (e.g., 94771234567): ");
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, "");

    try {
      setTimeout(async () => {
        let code = await sock.requestPairingCode(cleanedNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`\n🔑 Key Generated. Pairing Code: ${code}`);
        console.log("Input this matrix key onto your mobile device safely.\n");
      }, 3000);
    } catch (error) {
      console.error("❌ Encryption code pipeline failed:", error.message);
    }
  }

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("🚪 Core session purged. Delete auth_info directory and start fresh.");
      } else {
        connectToWhatsApp();
      }
    }
    if (connection === "open") {
      console.log("✅ [Ayanakoji_X] Interface Matrix successfully established!");
      
      // ✅ Self-Notification update message to yourself on setup run
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        const selfMessage = 
          `◢◤ *Ayanakoji_X | System Status* ◢◤\n\n` +
          `⚙️ Status: *Operational*\n` +
          `🌐 Core: *Active*\n\n` +
          `⚡ _Developed by Riviya_X with Gemini_`;
        
        await sock.sendMessage(userJid, { text: selfMessage });
        console.log("📨 Status notification broadcast transmitted to host device terminal.");
      } catch (notifyErr) {
        console.error("⚠️ Couldn't establish local host report update:", notifyErr.message);
      }
    }
  });
}

// ── Express Setup ─────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to send a message to a SINGLE member card
app.post("/api/bot/send", async (req, res) => {
  const { memberId } = req.body;
  console.log(`🌐 Single terminal request caught for index payload: ${memberId}`);

  if (!sock) {
    return res.status(503).json({ error: "System core offline. WhatsApp terminal is not active." });
  }

  if (!memberId) {
    return res.status(400).json({ error: "Null pointer exception: Missing memberId identifier." });
  }

  try {
    const { data: member } = await axios.get(`${API_BASE}/${memberId}`, { timeout: 15000 });

    if (!member || !member.whatsappNumber) {
      return res.status(404).json({ error: "Target data log missing or entry phone records corrupted." });
    }

    const cleanNumber = member.whatsappNumber.replace(/[^0-9]/g, "");
    const jid = `${cleanNumber}@s.whatsapp.net`;
    const message = buildMessage(member);

    await dispatchMessage(jid, message);
    console.log(`✅ Individual card file transmitted successfully to ${member.name}`);

    return res.json({ success: true, message: `Data packet delivered safely to ${member.name}` });
  } catch (err) {
    console.error(`❌ Single block pipeline delivery failed for payload ID ${memberId}:`, err.message);
    return res.status(500).json({ error: "Failed to dispatch unique individual data update pack.", details: err.message });
  }
});

// Send-All Route
app.post("/api/bot/send-all", async (req, res) => {
  console.log("🌐 Complete directory sequence dump triggered via UI panel");
  
  if (!sock) {
    return res.status(503).json({ error: "System core offline. WhatsApp terminal is not active." });
  }

  const result = await sendWeeklyMarks();
  
  if (result.error) {
    return res.status(500).json(result);
  }
  
  return res.json(result); 
});

app.listen(PORT, () => {
  console.log(`🌐 Main Core Server monitoring ports on local address: http://localhost:${PORT}`);
});

// ── Cron scheduler ────────────────────────────────────────
cron.schedule(CRON_SCHEDULE, () => {
  console.log("⏰ Automated timeline event triggered — executing marks broadcast sync...");
  sendWeeklyMarks();
});

// ── Start ─────────────────────────────────────────────────
connectToWhatsApp();