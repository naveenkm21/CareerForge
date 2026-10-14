import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from './uuid';

/*
 * Schema for weeks 1–3 (Phases 0–3). The evidence log, projections, content and career tables
 * from docs/02-data-model.md land in later migrations, each with the phase that first writes them.
 */

const id = () => uuid('id').primaryKey().$defaultFn(uuidv7);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

// ─── Identity ────────────────────────────────────────────────────────────────

export const userRole = pgEnum('user_role', ['user', 'author', 'admin']);
export const themePref = pgEnum('theme_pref', ['system', 'light', 'dark']);

/**
 * The auth vendor owns credentials; we mirror the minimum and key everything to our own id.
 * `auth_provider` + `auth_subject` replace a vendor-specific `clerk_id` so the vendor stays
 * swappable behind packages/auth.
 */
export const users = pgTable(
  'users',
  {
    id: id(),
    authProvider: text('auth_provider').notNull(),
    authSubject: text('auth_subject').notNull(),
    email: text('email'),
    handle: text('handle'),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    role: userRole('role').notNull().default('user'),
    college: text('college'),
    gradYear: integer('grad_year'),
    timezone: text('timezone').notNull().default('UTC'),
    dailyMinutesTarget: integer('daily_minutes_target').notNull().default(60),
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_auth_identity_uq').on(t.authProvider, t.authSubject),
    uniqueIndex('users_handle_uq').on(t.handle),
  ],
);

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: themePref('theme').notNull().default('system'),
  reducedMotion: boolean('reduced_motion').notNull().default(false),
  editorLang: text('editor_lang').notNull().default('cpp'),
  emailPrefs: jsonb('email_prefs').$type<Record<string, boolean>>().notNull().default({}),
  updatedAt: updatedAt(),
});

// ─── Taxonomy ────────────────────────────────────────────────────────────────

export const skillDomain = pgEnum('skill_domain', ['dsa', 'cs', 'dev', 'soft']);
export const skillEdgeKind = pgEnum('skill_edge_kind', ['prereq', 'reinforces']);
export const roleTier = pgEnum('role_tier', ['core', 'strong', 'nice']);

export const skills = pgTable(
  'skills',
  {
    id: id(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    domain: skillDomain('domain').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => skills.id, { onDelete: 'set null' }),
    depth: integer('depth').notNull().default(0),
    sort: integer('sort').notNull().default(0),
    summary: text('summary').notNull().default(''),
    icon: text('icon'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('skills_slug_uq').on(t.slug), index('skills_parent_idx').on(t.parentId)],
);

export const skillEdges = pgTable(
  'skill_edges',
  {
    fromSkillId: uuid('from_skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    toSkillId: uuid('to_skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    kind: skillEdgeKind('kind').notNull(),
    strength: real('strength').notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.fromSkillId, t.toSkillId, t.kind] })],
);

export const roles = pgTable(
  'roles',
  {
    id: id(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    family: text('family').notNull(),
    description: text('description').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('roles_slug_uq').on(t.slug)],
);

export const roleSkillReqs = pgTable(
  'role_skill_reqs',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    targetMastery: real('target_mastery').notNull(),
    weight: real('weight').notNull(),
    tier: roleTier('tier').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.skillId] })],
);

// ─── Learning state ──────────────────────────────────────────────────────────

export const enrollmentStatus = pgEnum('enrollment_status', ['active', 'paused', 'completed']);

export const enrollments = pgTable(
  'enrollments',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    targetDate: date('target_date'),
    status: enrollmentStatus('status').notNull().default('active'),
    isPrimary: boolean('is_primary').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('enrollments_user_idx').on(t.userId),
    // At most one primary enrollment per user.
    uniqueIndex('enrollments_one_primary_uq')
      .on(t.userId)
      .where(sql`${t.isPrimary}`),
  ],
);

// ─── Content ─────────────────────────────────────────────────────────────────

/**
 * Metadata for visualized algorithms. `registry_id` links to a `defineAlgorithm` module in
 * packages/viz. The DB stores metadata; the code stores behaviour. Trace frames are never stored.
 */
export const algorithms = pgTable(
  'algorithms',
  {
    id: id(),
    registryId: text('registry_id').notNull(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    title: text('title').notNull(),
    structureKinds: text('structure_kinds').array().notNull(),
    complexity: jsonb('complexity').$type<{ time: string; space: string }>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('algorithms_registry_uq').on(t.registryId)],
);

// ─── Platform ────────────────────────────────────────────────────────────────

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  description: text('description').notNull().default(''),
  enabled: boolean('enabled').notNull().default(false),
  rolloutPct: integer('rollout_pct').notNull().default(100),
  allowlist: jsonb('allowlist').$type<string[]>().notNull().default([]),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
