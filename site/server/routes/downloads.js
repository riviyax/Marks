import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { issueDownloadToken, verifyAndConsumeDownloadToken } from '../utils/downloadToken.js';

const router = Router();

// Step 1: authenticated + unlocked users get a short-lived, single-use token.
router.get('/bot', requireAuth, async (req, res) => {
  if (!req.user.unlocked) {
    return res.status(403).json({ error: 'Your account is not unlocked yet' });
  }

  const botPath = process.env.BOT_PACKAGE_PATH;
  if (!botPath || !fs.existsSync(botPath)) {
    return res.status(503).json({ error: 'The bot package is not available right now. Please contact support.' });
  }

  const token = issueDownloadToken(req.user._id);
  const url = `/api/downloads/bot/file?token=${encodeURIComponent(token)}`;
  res.json({ url });
});

// Step 2: the actual file stream. Requires auth AND a valid, unexpired,
// not-yet-redeemed token bound to this exact user — defense in depth so a
// leaked/shared link can't be replayed and can't be used by another account.
router.get('/bot/file', requireAuth, async (req, res) => {
  if (!req.user.unlocked) {
    return res.status(403).json({ error: 'Your account is not unlocked yet' });
  }

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const result = verifyAndConsumeDownloadToken(token, req.user._id);
  if (!result.valid) {
    return res.status(403).json({ error: result.reason });
  }

  const botPath = process.env.BOT_PACKAGE_PATH;
  if (!botPath || !fs.existsSync(botPath)) {
    return res.status(503).json({ error: 'The bot package is not available right now.' });
  }

  res.download(botPath, 'ayanakoji-x-bot.zip');
});

export default router;
