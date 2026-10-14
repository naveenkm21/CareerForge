import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getIdentity } from '@careerforge/auth/server';
import { ensureUserForIdentity, type User } from '@careerforge/db';

/** The current user row (created on first sight), memoized per request. */
export const getActor = cache(async (): Promise<User | null> => {
  const identity = await getIdentity();
  if (!identity) return null;
  return ensureUserForIdentity(identity);
});

export async function requireActor(): Promise<User> {
  const actor = await getActor();
  if (!actor) redirect('/sign-in');
  return actor;
}

/** Signed in AND onboarded; otherwise send them to the right step. */
export async function requireOnboarded(): Promise<User> {
  const actor = await requireActor();
  if (!actor.onboardedAt) redirect('/onboarding');
  return actor;
}

/** Only same-origin relative paths survive, so a crafted link cannot bounce users off-site. */
export function safeRedirectPath(raw: unknown, fallback = '/dashboard'): string {
  if (
    typeof raw !== 'string' ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.startsWith('/\\')
  )
    return fallback;
  return raw;
}

/** Admin/author routes: the role claim is re-checked server-side on every request. */
export async function requireAdmin(): Promise<User> {
  const actor = await requireOnboarded();
  if (actor.role !== 'admin' && actor.role !== 'author') redirect('/dashboard');
  return actor;
}
