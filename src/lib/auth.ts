import crypto from 'crypto';
import type { DatabaseAdapter } from '@/db';

export interface UserSessionPayload {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'partner' | 'customer';
  partnerId: string | null;
  partnerCode: string | null;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'rbs-criacao-v3-secret-key-3d-studio-2026';
export const SESSION_COOKIE_NAME = 'rbs_session_token';
export const SESSION_DURATION_HOURS = 24;

// 1. Password Hashing using Node.js crypto.scryptSync with OWASP recommendations (N=65536, r=8, p=1, ~280ms, 64MB RAM)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  });
  return `scrypt:v2:${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Strict Production Hardening: Disable raw demonstration rbs_hash in production environments!
  if (storedHash.startsWith('rbs_hash:')) {
    if (process.env.NODE_ENV === 'production') {
      // In production, force a secure password reset rather than accepting unhashed legacy credentials!
      return false;
    }
    const rawExpected = storedHash.slice('rbs_hash:'.length);
    return password === rawExpected;
  }

  // OWASP Recommended v2 (N=65536)
  if (storedHash.startsWith('scrypt:v2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;
    const [, , salt, expectedHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64, {
      N: 65536,
      r: 8,
      p: 1,
      maxmem: 128 * 1024 * 1024,
    });
    const keyBuf = Buffer.from(derivedKey.toString('hex'), 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (keyBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, expectedBuf);
  }

  // Backward compatible with v1 (N=16384)
  if (storedHash.startsWith('scrypt:v1:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;
    const [, , salt, expectedHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const keyBuf = Buffer.from(derivedKey.toString('hex'), 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (keyBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, expectedBuf);
  }

  return false;
}

// Helper to validate redirect destinations (must be internal paths, preventing Open Redirect attacks)
export function sanitizeRedirectPath(pathParam: string | null | undefined): string {
  if (!pathParam || typeof pathParam !== 'string') return '/';
  const trimmed = pathParam.trim();
  // Must start with a single slash '/' and not '//' (protocol relative URL) or contain ':\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\') || trimmed.includes('://')) {
    return '/';
  }
  return trimmed;
}

// 2. Token Signing & Verification (HMAC-SHA256)
export function signSessionToken(payload: UserSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(tokenString: string): UserSessionPayload | null {
  if (!tokenString || typeof tokenString !== 'string') return null;
  const parts = tokenString.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedSigBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) return null;

  try {
    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr) as UserSessionPayload;
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// 3. Database session lookup & revocation
export async function createSessionInDb(
  db: DatabaseAdapter,
  user: { id: string; name: string; email: string; role: string }
): Promise<{ token: string; payload: UserSessionPayload }> {
  // If user is a partner, find their partnerId
  let partnerId: string | null = null;
  let partnerCode: string | null = null;
  if (user.role === 'partner') {
    const pRows = await db.query<{ id: string; partner_code: string }>(
      'SELECT id, partner_code FROM partners WHERE user_id = $1 OR email = $2 LIMIT 1',
      [user.id, user.email]
    );
    if (pRows[0]) {
      partnerId = pRows[0].id;
      partnerCode = pRows[0].partner_code;
    }
  }

  const sessionId = `sess-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_HOURS * 3600 * 1000;
  const expiresAtDate = new Date(expiresAt).toISOString();

  const payload: UserSessionPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role as any,
    partnerId,
    partnerCode,
    sessionId,
    createdAt: now,
    expiresAt,
  };

  const token = signSessionToken(payload);

  // Store token hash in DB to prevent arbitrary length issues and enhance privacy
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Store in DB for instant server-side revocation
  await db.query(
    `INSERT INTO sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, user.id, tokenHash, expiresAtDate]
  );

  return { token, payload };
}

export async function validateSessionFromCookie(
  db: DatabaseAdapter,
  tokenCookieValue: string | undefined | null
): Promise<UserSessionPayload | null> {
  if (!tokenCookieValue) return null;
  const payload = verifySessionToken(tokenCookieValue);
  if (!payload) return null;

  try {
    // Verify against users table to ensure user exists and is active, and fetch up-to-date role
    const rows = await db.query<{ id: string; name: string; email: string; is_active: boolean; role: string }>(
      `SELECT id, name, email, is_active, role
       FROM users
       WHERE id = $1 AND is_active = TRUE
       LIMIT 1`,
      [payload.userId]
    );

    if (rows.length === 0) {
      return null; // User deleted, suspended or not found
    }

    // Verify session has not been revoked in the database
    if (payload.sessionId) {
      const sessionRows = await db.query<{ id: string }>(
        `SELECT id FROM sessions WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
        [payload.sessionId]
      );
      if (sessionRows.length === 0) {
        return null; // Session revoked or expired
      }
    }

    // Keep payload in sync with real database state
    payload.role = rows[0].role as any;
    payload.name = rows[0].name;
    payload.email = rows[0].email;
    return payload;
  } catch (err) {
    console.error('Error validating session in database:', err);
    // If DB check encounters a transient query error, fallback to cryptographically verified payload
    return payload;
  }
}

export async function revokeSessionInDb(db: DatabaseAdapter, sessionId: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

export async function revokeAllUserSessions(db: DatabaseAdapter, userId: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}
