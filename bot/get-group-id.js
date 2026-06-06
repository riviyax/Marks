// ── Run this once to find your WhatsApp Group ID ──────────
// Usage: node get-group-id.js
// It will print all groups the bot is in with their IDs.

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

async function main() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version, auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      console.log("✅ Connected! Fetching groups...\n");
      const groups = await sock.groupFetchAllParticipating();
      console.log("📋 Your WhatsApp Groups:\n");
      Object.values(groups).forEach((g) => {
        console.log(`  Name : ${g.subject}`);
        console.log(`  ID   : ${g.id}`);
        console.log(`  ────────────────`);
      });
      console.log("\n✅ Copy the ID of your target group into bot/.env as GROUP_ID");
      process.exit(0);
    }
  });
}

main();