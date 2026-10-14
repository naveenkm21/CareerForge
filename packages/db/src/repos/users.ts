import { and, eq, isNull, ne } from 'drizzle-orm';
import { getDb } from '../client';
import { enrollments, roles, userSettings, users, type User } from '../schema';

export type IdentityInput = {
  provider: string;
  subject: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/**
 * Returns our user row for an auth identity, creating it (and default settings) on first sight.
 * Profile fields from the provider only fill blanks — a user's edits are never overwritten.
 */
export async function ensureUserForIdentity(identity: IdentityInput): Promise<User> {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: and(eq(users.authProvider, identity.provider), eq(users.authSubject, identity.subject)),
  });
  if (existing) {
    if (existing.deletedAt) throw new Error('This account has been deleted.');
    return existing;
  }
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        authProvider: identity.provider,
        authSubject: identity.subject,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
      })
      .onConflictDoNothing({ target: [users.authProvider, users.authSubject] })
      .returning();
    const row =
      created ??
      (await tx.query.users.findFirst({
        where: and(
          eq(users.authProvider, identity.provider),
          eq(users.authSubject, identity.subject),
        ),
      }));
    if (!row) throw new Error('Failed to create user');
    await tx.insert(userSettings).values({ userId: row.id }).onConflictDoNothing();
    return row;
  });
}

export async function getUserSettings(userId: string) {
  return getDb().query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
}

export async function isHandleAvailable(handle: string, exceptUserId?: string): Promise<boolean> {
  const row = await getDb().query.users.findFirst({
    columns: { id: true },
    where: exceptUserId
      ? and(eq(users.handle, handle), ne(users.id, exceptUserId))
      : eq(users.handle, handle),
  });
  return !row;
}

export class HandleTakenError extends Error {
  constructor(handle: string) {
    super(`The handle "${handle}" is taken`);
    this.name = 'HandleTakenError';
  }
}

export type CompleteOnboardingInput = {
  name: string;
  handle: string;
  roleSlug: string;
  dailyMinutes: number;
  timezone: string;
  targetDate?: string;
  college?: string;
  gradYear?: number;
};

/**
 * Onboarding writes the profile and the primary enrollment atomically. Re-running it (e.g. to
 * change role) demotes the previous primary enrollment rather than deleting history.
 */
export async function completeOnboarding(
  actor: Pick<User, 'id'>,
  input: CompleteOnboardingInput,
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const role = await tx.query.roles.findFirst({ where: eq(roles.slug, input.roleSlug) });
    if (!role) throw new Error(`Unknown role "${input.roleSlug}"`);

    const clash = await tx.query.users.findFirst({
      columns: { id: true },
      where: and(eq(users.handle, input.handle), ne(users.id, actor.id)),
    });
    if (clash) throw new HandleTakenError(input.handle);

    await tx
      .update(users)
      .set({
        name: input.name,
        handle: input.handle,
        timezone: input.timezone,
        dailyMinutesTarget: input.dailyMinutes,
        college: input.college ?? null,
        gradYear: input.gradYear ?? null,
        onboardedAt: new Date(),
      })
      .where(and(eq(users.id, actor.id), isNull(users.deletedAt)));

    const current = await tx.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, actor.id), eq(enrollments.isPrimary, true)),
    });
    if (current?.roleId === role.id) {
      await tx
        .update(enrollments)
        .set({ targetDate: input.targetDate ?? null, status: 'active' })
        .where(eq(enrollments.id, current.id));
      return;
    }
    if (current) {
      await tx
        .update(enrollments)
        .set({ isPrimary: false, status: 'paused' })
        .where(eq(enrollments.id, current.id));
    }
    await tx.insert(enrollments).values({
      userId: actor.id,
      roleId: role.id,
      targetDate: input.targetDate ?? null,
      isPrimary: true,
    });
  });
}

export async function getPrimaryEnrollment(userId: string) {
  const db = getDb();
  const rows = await db
    .select({ enrollment: enrollments, role: roles })
    .from(enrollments)
    .innerJoin(roles, eq(roles.id, enrollments.roleId))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.isPrimary, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateUserPreferences(
  userId: string,
  prefs: { theme?: 'system' | 'light' | 'dark'; reducedMotion?: boolean; editorLang?: string },
): Promise<void> {
  await getDb()
    .insert(userSettings)
    .values({ userId, ...prefs })
    .onConflictDoUpdate({ target: userSettings.userId, set: prefs });
}
