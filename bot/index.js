const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const fs = require("fs")
const path = require("path")
const config = require("./config")

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const sock = makeWASocket({ auth: state, printQRInTerminal: true })

    sock.ev.on("creds.update", saveCreds)

    const commands = new Map()
    const commandFiles = fs.readdirSync(path.join(__dirname, "commands"))
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`)
        commands.set(command.name, command)
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const jid = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if (!text || !text.startsWith(config.prefix)) return

        const args = text.trim().split(/ +/).slice(1)
        const commandName = text.trim().split(/ +/)[0].slice(config.prefix.length).toLowerCase()
        const command = commands.get(commandName)

        if (command) {
            try {
                await command.execute(sock, jid, msg, args, config)
            } catch (e) {
                console.error(e)
                await sock.sendMessage(jid, { text: "❌ Command Error" })
            }
        }
    })
}

startBot()
