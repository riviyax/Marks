import crypto from 'crypto';

// In-memory single-use tracking. For a multi-instance deployment, swap this
// for a MongoDB collection or Redis key with a TTL index — the important
// property is "can only be redeemed once," not where it's stored.
const redeemedTokens = new Set();

function secret() {
  const s = process.env.DOWNLOAD_SIGNING_SECRET;
  if (!s) throw new Error('DOWNLOAD_SIGNING_SECRET is not set');
  return s;
}

export function issueDownloadToken(userId) {
  const ttl = Number(process.env.DOWNLOAD_LINK_TTL_SECONDS || 120);
  const expiresAt = Date.now() + ttl * 1000;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}.${expiresAt}.${nonce}`;
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  return token;
}

export function verifyAndConsumeDownloadToken(token, expectedUserId) {
  let decoded;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return { valid: false, reason: 'Malformed token' };
  }

  const parts = decoded.split('.');
  if (parts.length !== 4) return { valid: false, reason: 'Malformed token' };
  const [userId, expiresAtStr, nonce, signature] = parts;

  const payload = `${userId}.${expiresAtStr}.${nonce}`;
  const expectedSig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  if (userId !== String(expectedUserId)) {
    return { valid: false, reason: 'Token does not belong to this user' };
  }

  if (Date.now() > Number(expiresAtStr)) {
    return { valid: false, reason: 'Link expired' };
  }

  if (redeemedTokens.has(token)) {
    return { valid: false, reason: 'Link already used' };
  }
  redeemedTokens.add(token);

  return { valid: true };
}
