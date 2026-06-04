// ============================================================
//  MMU Marks WhatsApp Bot  —  Baileys + node-cron
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
require("dotenv").config();

// ── Config ────────────────────────────────────────────────
const API_BASE = process.env.API_BASE || "http://localhost:3000"; // your Express server
const MEMBER_VIEW_BASE =
  process.env.MEMBER_VIEW_BASE || "https://mmumarks.vercel.app/memberview";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 9 * * 1"; // Every Monday 9:00 AM
// ─────────────────────────────────────────────────────────

let sock = null; // global socket reference

// ── Build the WhatsApp message for one member ─────────────
function buildMessage(member) {
  const profileLink = `${MEMBER_VIEW_BASE}?id=${member._id}`;

  return (
    `👋 Hello *${member.name}*!\n\n` +
    `📋 *Weekly Marks Update*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🏷️  Position : ${member.rank}\n` +
    `⭐  Marks     : *${member.marks}*\n\n` +
    `🔗 View your full activity log:\n` +
    `${profileLink}\n\n` +
    `_MMU Media Unit — Automated Update_`
  );
}

// ── Send marks to all members ─────────────────────────────
async function sendWeeklyMarks() {
  if (!sock) {
    console.error("❌ Bot is not connected yet.");
    return;
  }

  try {
    const { data: members } = await axios.get(`${API_BASE}/api/members`);

    const eligible = members.filter(
      (m) => m.whatsappNumber && m.whatsappNumber.trim() !== ""
    );

    console.log(
      `📤 Sending to ${eligible.length} members (${members.length - eligible.length} skipped — no number)`
    );

    for (const member of eligible) {
      const jid = `${member.whatsappNumber}@s.whatsapp.net`;
      const message = buildMessage(member);

      try {
        await sock.sendMessage(jid, { text: message });
        console.log(`✅ Sent to ${member.name} (${member.whatsappNumber})`);
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.error(
          `❌ Failed to send to ${member.name}: ${err.message}`
        );
      }
    }

    console.log("🎉 Weekly marks blast complete!");
  } catch (err) {
    console.error("❌ Error fetching members:", err.message);
  }
}

// ── Connect to WhatsApp ───────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }), // change to "debug" to see full logs
    printQRInTerminal: true,            // scan this QR with your WhatsApp
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("⚠️  Connection closed. Reason:", reason);

      if (reason === DisconnectReason.loggedOut) {
        console.log("🚪 Logged out. Delete auth_info folder and restart.");
      } else {
        console.log("🔄 Reconnecting...");
        connectToWhatsApp();
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp bot connected!");
    }
  });
}

// ── Cron scheduler ────────────────────────────────────────
// Default: every Monday at 9:00 AM
// Change CRON_SCHEDULE in .env to customise
cron.schedule(CRON_SCHEDULE, () => {
  console.log("⏰ Cron triggered — sending weekly marks...");
  sendWeeklyMarks();
});

// ── Manual trigger via env flag ───────────────────────────
// Run:  SEND_NOW=true node bot.js
if (process.env.SEND_NOW === "true") {
  setTimeout(() => {
    console.log("🚀 Manual send triggered (SEND_NOW=true)");
    sendWeeklyMarks();
  }, 5000); // wait 5s for connection to settle
}

// ── Start ─────────────────────────────────────────────────
console.log("🤖 MMU Marks Bot starting...");
console.log(`📅 Scheduled: ${CRON_SCHEDULE}`);
connectToWhatsApp();