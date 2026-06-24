import { admin } from '../utils/firebaseAdmin.js';
import User from '../models/User.js';

/**
 * Verifies the Firebase ID token sent in the Authorization header.
 * This is the only source of truth for "who is this request from" —
 * the client never gets to assert its own identity.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    // Find-or-create the local user record keyed by Firebase UID.
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email,
        photoURL: decoded.picture,
      });
    }

    req.firebaseToken = decoded;
    req.user = user;
    next();
  } catch (err) {
    console.error('[auth] token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

/**
 * Gate for admin-only routes. Must run after requireAuth.
 * Admin status is determined by an allowlist of emails in env config —
 * never by anything the client sends.
 */
export function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!req.user?.email || !adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
