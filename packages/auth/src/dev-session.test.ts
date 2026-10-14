import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPublicPath } from './config';
import {
  devAuthSecret,
  DevAuthDisabledError,
  devSubject,
  signDevSession,
  verifyDevSession,
} from './dev-session';

const session = {
  sub: devSubject('Ada@Example.com'),
  email: 'ada@example.com',
  name: 'Ada',
  iat: 1,
};

describe('dev session', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('round-trips a signed session', async () => {
    const token = await signDevSession(session, 'a-long-enough-secret');
    expect(await verifyDevSession(token, 'a-long-enough-secret')).toEqual(session);
  });

  it('rejects tampering and the wrong secret', async () => {
    const token = await signDevSession(session, 'a-long-enough-secret');
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...session, sub: 'dev|admin@x.io' })).toString(
      'base64url',
    );
    expect(await verifyDevSession(`${forged}.${sig}`, 'a-long-enough-secret')).toBeNull();
    expect(await verifyDevSession(`${payload}.${sig}`, 'another-secret-value')).toBeNull();
    expect(await verifyDevSession('garbage', 'a-long-enough-secret')).toBeNull();
  });

  it('subjects are case-insensitive per email', () => {
    expect(devSubject(' ADA@example.com ')).toBe('dev|ada@example.com');
  });

  it('is refused in production unless explicitly allowed', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => devAuthSecret()).toThrow(DevAuthDisabledError);
    vi.stubEnv('ALLOW_DEV_AUTH', '1');
    expect(() => devAuthSecret()).toThrow(/AUTH_SECRET/);
    vi.stubEnv('AUTH_SECRET', 'x'.repeat(32));
    expect(devAuthSecret()).toBe('x'.repeat(32));
  });
});

describe('public routes', () => {
  it('keeps the visualizer and landing public, protects the app', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/viz/binary-search')).toBe(true);
    expect(isPublicPath('/api/health')).toBe(true);
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/onboarding')).toBe(false);
    expect(isPublicPath('/vizzle')).toBe(false);
  });
});
