const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // QR will show in terminal
    });

    // save session
    sock.ev.on("creds.update", saveCreds);

    // message handler
    sock.ev.on("messages.upsert", async (msg) => {
        const m = msg.messages[0];
        if (!m.message) return;

        const text = m.message.conversation || m.message.extendedTextMessage?.text;

        if (text === "?hello") {
            await sock.sendMessage(m.key.remoteJid, { text: "Hey, Brother.." });
        }
    });
}

startBot();
