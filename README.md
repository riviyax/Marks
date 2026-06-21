# MMU Marks System

A simple **MMU Students Database** built using the **MERN stack**, with an integrated **WhatsApp bot** for automated weekly marks notifications and group management.

> Proudly made by **Riviya_X**

---

## Project Structure

```
Marks/
├── bot/      # WhatsApp bot (Baileys) + admin panel
├── client/   # ReactJS + TailwindCSS frontend
└── server/   # ExpressJS + MongoDB backend
```

| Folder   | Description                                              |
|----------|-----------------------------------------------------------|
| `bot`    | WhatsApp bot, group management, and admin web panel       |
| `client` | Student-facing dashboard and marks viewer                 |
| `server` | REST API and database layer                               |

---

## Tech Stack

- **Frontend**: ReactJS, TailwindCSS
- **Backend**: ExpressJS, MongoDB
- **Bot**: Node.js, Baileys (WhatsApp Web API), node-cron, Express

---

## Getting Started

### Backend Setup

To deploy the backend locally:

```bash
cd server
npm install
npm start
```

#### Backend Environment Variables

Create a `.env` file inside the `server` folder:

```env
MONGO_URI=
```

### Frontend Setup

To deploy the frontend locally:

```bash
cd client
npm install
npm run dev
```

To build for production:

```bash
cd client
npm install
npm run build
```

#### Frontend Environment Variables

Create a `.env` file inside the `client` folder:

```env
VITE_API_URL=http://localhost:3000/api/members
VITE_API_DATE=http://localhost:3000/api/last-update
VITE_LOGIN_PASS=123
VITE_TEMPIP_LOGIN_PASS=123
VITE_BOT_URL=http://localhost:3001
```

### Bot Setup

To run the WhatsApp bot locally:

```bash
cd bot
npm install
npm start
```

On first run, the bot will prompt for a phone number (with country code) in the terminal to generate a pairing code, or you can pair through the admin web panel at `http://localhost:3000`.

#### Bot Environment Variables

Create a `.env` file inside the `bot` folder:

```env
API_BASE=
MEMBER_VIEW_BASE=
CRON_SCHEDULE=0 9 * * 1
BOT_PORT=3000
CLOUDFLARE_TOKEN=
BOT_SUBHEADING=Riviya_x
```

#### Bot Commands (WhatsApp)

| Command          | Description                              |
|------------------|-------------------------------------------|
| `.about`         | Bot status, uptime & next blast time      |
| `.markslist`     | All members ranked by marks               |
| `.marks <name>`  | Look up a single member's details         |

---

## Deploying on a VPS

The `server` and `bot` both default to **port 3000**. If you're running both on the same VPS, they will conflict — you must give them different ports:

1. Set a different `BOT_PORT` in `bot/.env` (e.g. `3001`) so it doesn't clash with the backend server.
2. Make sure your backend server is also running on its own distinct port if it isn't already.
3. Update `client/.env` to point at the correct hosts/ports for your VPS instead of `localhost`:
   ```env
   VITE_API_URL=http://your-server-ip:3000/api/members
   VITE_API_DATE=http://your-server-ip:3000/api/last-update
   VITE_BOT_URL=http://your-server-ip:3001
   ```
4. Rebuild the frontend (`npm run build`) after changing any `VITE_*` variables — Vite bakes them in at build time, so editing `.env` after building has no effect until you rebuild.
5. Update `API_BASE` in `bot/.env` to point at the backend's actual reachable URL (not `localhost`, if the bot and server are on different ports/processes).

---

## Features

- Weekly automated marks notifications via WhatsApp (cron-scheduled)
- Admin panel for pairing, group selection, and password management
- Bulk and single-member group add with automatic invite-link fallback for privacy-restricted numbers
- Live bot status dashboard (connection, uptime, next blast countdown)

---

## License

See [SECURITY.md](./SECURITY.md) for security policy details.