# Ayanakoji_X — Web App

Vite + React frontend, Node/Express + MongoDB backend. Google-only sign-in via
Firebase Auth, PayPal + manual receipt checkout, admin-reviewed unlock, and a
gated download for the licensed bot package.

## What's NOT included on purpose

This project does **not** include the WhatsApp bot itself (the thing that
actually logs into WhatsApp and sends messages). That's the zip you'll drop
into `server/secure/` yourself — see "Bot package" below. The reason: depending
on how it connects to WhatsApp, that kind of automation can violate WhatsApp's
Terms of Service, so it isn't something built here.

---

## 1. Firebase setup (Google sign-in)

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project.
2. **Authentication** → Sign-in method → enable **Google**. Leave every other
   provider off — the app only ever offers Google.
3. **Project Settings → General → Your apps** → add a Web app. Copy the config
   values into `client/.env` (see `client/.env.example`).
4. **Project Settings → Service accounts** → Generate new private key. This
   downloads a JSON file — paste its *entire contents as one line* into
   `server/.env` as `FIREBASE_SERVICE_ACCOUNT_JSON`.

### About the "unverified app" warning

Firebase Google Auth uses the same Google OAuth consent screen as anything
else — there's no special bypass for it. Two real options:

- **While testing**: in Google Cloud Console → APIs & Services → OAuth consent
  screen, add your own Google account under "Test users." Test users never see
  the warning, and you can add up to 100 of them without review.
- **For real customers**: submit the app for verification (Cloud Console →
  OAuth consent screen → Publish app). For a basic scope like email/profile
  this is usually a quick review, not a deep audit — there's no faster
  legitimate path, so budget a few days before launch rather than looking for
  a workaround.

## 2. MongoDB setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user + allow your server's IP (or `0.0.0.0/0` while developing).
3. Copy the connection string into `server/.env` as `MONGODB_URI`.

## 3. PayPal setup

1. Create an app at [developer.paypal.com](https://developer.paypal.com) (Sandbox first).
2. Copy the Client ID into **both**:
   - `client/.env` → `VITE_PAYPAL_CLIENT_ID`
   - `server/.env` → `PAYPAL_CLIENT_ID` (and the Secret → `PAYPAL_CLIENT_SECRET`)
3. Leave `PAYPAL_ENV=sandbox` until you're ready to take real payments, then
   switch to `live` with your live app's credentials.

## 4. Admin access

Set `ADMIN_EMAILS` in `server/.env` to a comma-separated list of Google emails
that should be able to review receipts. Anyone signed in with one of those
emails sees an **Admin** link in the navbar and can use the dashboard at
`/admin` to:

- view pending / approved / rejected receipt uploads,
- preview the uploaded image or PDF inline,
- **Approve** (unlocks the user immediately) or **Reject** (with a reason).

Note that `/admin` in the React app is just a convenience UI — the real
security boundary is server-side. Every `/api/admin/*` call independently
re-checks the requester's email against `ADMIN_EMAILS`, so even if someone
guessed the `/admin` URL, the API would reject them with a 403.

If you'd rather call the API directly (e.g. scripting bulk approvals), the
same endpoints work standalone:

```
GET  /api/admin/orders?status=receipt_submitted
GET  /api/admin/orders/:id/receipt        # view the uploaded image/pdf
POST /api/admin/orders/:id/approve        # unlocks the user
POST /api/admin/orders/:id/reject         # body: { "reason": "..." }
```

## 5. Bot package ("the file needed")

Put your own bot zip at the path you set in `server/.env` as
`BOT_PACKAGE_PATH` — for example `server/secure/ayanakoji-x-bot.zip`.
`server/secure/` is never registered as a static folder, so the only way to
reach that file is through `/api/downloads/bot`, which:

1. requires a valid Firebase session,
2. requires `unlocked: true` on that user's record,
3. issues a single-use, HMAC-signed link that expires in ~2 minutes
   (`DOWNLOAD_LINK_TTL_SECONDS`), and
4. re-checks all of the above again when the link is actually redeemed.

Generate `DOWNLOAD_SIGNING_SECRET` with:

```
openssl rand -hex 32
```

## 6. Run it

```bash
# Terminal 1
cd server
cp .env.example .env   # fill in the values above
npm install
npm run dev

# Terminal 2
cd client
cp .env.example .env   # fill in the values above
npm install
npm run dev
```

Visit `http://localhost:5173`. Sign in with Google → Account page shows
"locked" → Checkout → pay via PayPal (auto-unlocks) or upload a receipt
(unlocks after you approve it via the admin API) → Download page.

## Security notes baked in

- The backend verifies every request's Firebase ID token server-side
  (`middleware/auth.js`) — the client can never just claim to be a given user.
- The license price ($5) is set server-side when the order is created; the
  client never sends an amount that gets trusted.
- PayPal capture is verified server-side (status + amount) before unlocking —
  approving a popup on the frontend alone does nothing.
- Receipts and the bot package live outside any `express.static()` folder and
  are only reachable through authenticated, ownership-checked routes.
- Download links are single-use and short-lived, bound to the requesting
  user's id.
