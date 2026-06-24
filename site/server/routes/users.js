import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// requireAuth already finds-or-creates the local User record for this
// Firebase UID, so by the time we're here req.user is up to date.
router.get('/me', requireAuth, (req, res) => {
  const u = req.user;

  // This flag is purely cosmetic (shows/hides the Admin nav link). It is
  // computed from the same ADMIN_EMAILS allowlist that requireAdmin enforces
  // server-side on every /api/admin/* call, so spoofing this value client-side
  // would only show a link to a dashboard whose API calls would still 403.
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes((u.email || '').toLowerCase());

  res.json({
    user: {
      id: u._id,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      unlocked: u.unlocked,
      unlockedAt: u.unlockedAt,
      isAdmin,
    },
  });
});

export default router;
