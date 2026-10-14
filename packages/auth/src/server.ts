import 'server-only';
import { cookies } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { authProvider, type Identity } from './config';
import {
  DEV_COOKIE,
  devAuthSecret,
  devSubject,
  signDevSession,
  verifyDevSession,
} from './dev-session';

/** The signed-in identity for this request, or null. Never throws for "signed out". */
export async function getIdentity(): Promise<Identity | null> {
  if (authProvider() === 'clerk') {
    const { userId } = await auth();
    if (!userId) return null;
    const u = await currentUser();
    return {
      provider: 'clerk',
      subject: userId,
      email: u?.primaryEmailAddress?.emailAddress ?? null,
      name: u?.fullName ?? u?.firstName ?? null,
      avatarUrl: u?.imageUrl ?? null,
    };
  }
  const jar = await cookies();
  const session = await verifyDevSession(jar.get(DEV_COOKIE)?.value, devAuthSecret());
  if (!session) return null;
  return {
    provider: 'dev',
    subject: session.sub,
    email: session.email,
    name: session.name,
    avatarUrl: null,
  };
}

/** Dev provider only: establishes a local session. Called from a server action. */
export async function devSignIn(input: { email: string; name: string }): Promise<void> {
  if (authProvider() !== 'dev')
    throw new Error('Dev sign-in is only available with the dev auth provider.');
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email');
  const token = await signDevSession(
    {
      sub: devSubject(email),
      email,
      name: input.name.trim() || email.split('@')[0]!,
      iat: Date.now(),
    },
    devAuthSecret(),
  );
  const jar = await cookies();
  jar.set(DEV_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies(),
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Secure cookies are dropped by browsers over plain http, which is how a fresh Elastic Beanstalk
 * URL is served. AUTH_COOKIE_SECURE=0 allows that for a demo; it is read at runtime (unlike
 * NEXT_PUBLIC_* values, which are fixed at build time).
 */
function secureCookies(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === '0' || override === '1') return override === '1';
  return process.env.NODE_ENV === 'production';
}

export async function devSignOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEV_COOKIE);
}

export { authProvider };
