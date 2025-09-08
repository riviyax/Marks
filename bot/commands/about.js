const fs = require("fs")

module.exports = {
    name: "about",
    async execute(sock, jid, msg, args, config) {
        const banner = fs.readFileSync("./images/banner.jpg")

        // Get user's name (pushName from WhatsApp)
        const senderName = msg.pushName || "Friend"

        const caption = `
👋 *Hello ${senderName}*  

🔮 *Welcome To ${config.botName}* 🔮

┌─「 *ABOUT BOT* 」
│ 🤖 Bot   : ${config.botName}
│ 👨‍💻 Owner : ${config.ownerNumber.join(", ")}
│ 📌 Prefix : ${config.prefix}
│ 📊 Version: 1.0
│ 📅 Active : 24/7
└───────────────⭕

        `
        await sock.sendMessage(jid, { image: banner, caption })
    }
}
