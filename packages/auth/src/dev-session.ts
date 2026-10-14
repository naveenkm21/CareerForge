/**
 * Local-development sessions: an HMAC-signed cookie. Uses Web Crypto only, so the same code
 * verifies in the edge middleware and in Node server components.
 *
 * This is NOT a production auth system: it exists so the app runs end to end without a Clerk
 * account. It refuses to run in production unless ALLOW_DEV_AUTH=1 is set explicitly.
 */
export const DEV_COOKIE = 'cf_dev_session';
const DEV_FALLBACK_SECRET = 'careerforge-local-development-secret-do-not-use-in-prod';

export type DevSession = { sub: string; email: string; name: string; iat: number };

export class DevAuthDisabledError extends Error {
  constructor() {
    super(
      'Dev auth is disabled in production. Configure Clerk, or set ALLOW_DEV_AUTH=1 and AUTH_SECRET for a demo.',
    );
    this.name = 'DevAuthDisabledError';
  }
}

export function devAuthSecret(): string {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && process.env.ALLOW_DEV_AUTH !== '1') throw new DevAuthDisabledError();
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (isProd)
    throw new Error('AUTH_SECRET (≥ 16 chars) is required when dev auth runs in production.');
  return DEV_FALLBACK_SECRET;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function signDevSession(session: DevSession, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(session)));
  return `${payload}.${b64url(await hmac(secret, payload))}`;
}

export async function verifyDevSession(
  token: string | undefined,
  secret: string,
): Promise<DevSession | null> {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    if (!timingSafeEqual(fromB64url(sig), await hmac(secret, payload))) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as DevSession;
    return typeof parsed.sub === 'string' && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/** Stable subject per email, so signing in twice as the same person maps to the same user. */
export function devSubject(email: string): string {
  return `dev|${email.trim().toLowerCase()}`;
}
