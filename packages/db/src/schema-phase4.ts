import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { LessonBlockDef } from '@careerforge/content';
import { roles, skills, users } from './schema-core';
import { uuidv7 } from './uuid';

/*
 * Phases 4–12: content, evidence + projections, career, interviews, social, platform.
 * docs/02-data-model.md is the reference; deviations are listed in docs/10-build-log.md.
 */

const id = () => uuid('id').primaryKey().$defaultFn(uuidv7);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

// ─── Learning content (Phases 4–5) ───────────────────────────────────────────

export const topics = pgTable(
  'topics',
  {
    id: id(),
    slug: text('slug').notNull(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    title: text('title').notNull(),
    blurb: text('blurb').notNull().default(''),
    sort: integer('sort').notNull().default(0),
    estMinutes: integer('est_minutes').notNull().default(30),
    status: text('status').$type<'draft' | 'published'>().notNull().default('published'),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('topics_slug_uq').on(t.slug)],
);

export type LessonBlock = LessonBlockDef;

export const lessons = pgTable(
  'lessons',
  {
    id: id(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    /** Ladder stage 1..8: Understand, Visualize, Trace, Predict, Implement, Test, Explain, Interview. */
    stage: integer('stage').notNull(),
    sort: integer('sort').notNull().default(0),
    estMinutes: integer('est_minutes').notNull().default(10),
    blocks: jsonb('blocks').$type<LessonBlock[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('lessons_topic_slug_uq').on(t.topicId, t.slug)],
);

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    secondsSpent: integer('seconds_spent').notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const problems = pgTable(
  'problems',
  {
    id: id(),
    slug: text('slug').notNull(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    title: text('title').notNull(),
    difficulty: integer('difficulty').notNull(),
    statement: text('statement').notNull(),
    inputFormat: text('input_format').notNull().default(''),
    outputFormat: text('output_format').notNull().default(''),
    constraints: text('constraints').notNull().default(''),
    starterCode: jsonb('starter_code').$type<Record<string, string>>().notNull().default({}),
    referenceSolution: jsonb('reference_solution')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    hints: jsonb('hints').$type<string[]>().notNull().default([]),
    timeLimitMs: integer('time_limit_ms').notNull().default(2000),
    tags: text('tags').array().notNull().default([]),
    algorithmId: text('algorithm_id'),
    status: text('status').$type<'draft' | 'published'>().notNull().default('published'),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('problems_slug_uq').on(t.slug), index('problems_skill_idx').on(t.skillId)],
);

export const problemTestcases = pgTable(
  'problem_testcases',
  {
    id: id(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id, { onDelete: 'cascade' }),
    input: text('input').notNull(),
    expected: text('expected').notNull(),
    isSample: boolean('is_sample').notNull().default(false),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('testcases_problem_idx').on(t.problemId)],
);

export type SubmissionStatus = 'ac' | 'wa' | 'tle' | 're' | 'ce' | 'error';
export type FailedCase = { input: string; expected: string; actual: string; stderr?: string };

export const submissions = pgTable(
  'submissions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id),
    lang: text('lang').notNull(),
    code: text('code').notNull(),
    status: text('status').$type<SubmissionStatus>().notNull(),
    passed: integer('passed').notNull().default(0),
    total: integer('total').notNull().default(0),
    runtimeMs: integer('runtime_ms'),
    failedCase: jsonb('failed_case').$type<FailedCase | null>(),
    judge: text('judge').notNull(),
    battleId: uuid('battle_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('submissions_user_idx').on(t.userId, t.createdAt),
    index('submissions_problem_idx').on(t.problemId),
  ],
);

export const questions = pgTable(
  'questions',
  {
    id: id(),
    slug: text('slug').notNull(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<string[]>().notNull(),
    answer: text('answer').notNull(),
    explanation: text('explanation').notNull().default(''),
    difficulty: real('difficulty').notNull().default(0.5),
    placement: boolean('placement').notNull().default(false),
    source: text('source').$type<'authored' | 'harvested'>().notNull().default('authored'),
  },
  (t) => [uniqueIndex('questions_slug_uq').on(t.slug)],
);

// ─── Evidence & projections (Phase 6) ────────────────────────────────────────

/**
 * APPEND ONLY (ADR-001). A database trigger rejects UPDATE and DELETE. Every score in the
 * product is a projection of these rows.
 */
export const evidenceEvents = pgTable(
  'evidence_events',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    kind: text('kind').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    outcome: real('outcome').notNull(),
    difficulty: real('difficulty').notNull().default(0.5),
    weight: real('weight').notNull(),
    durationMs: integer('duration_ms'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('evidence_user_skill_time_idx').on(t.userId, t.skillId, t.occurredAt),
    index('evidence_user_time_idx').on(t.userId, t.occurredAt),
  ],
);

/** PROJECTION — rebuilt by recomputeUser from evidence_events. */
export const userSkillState = pgTable(
  'user_skill_state',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    alpha: real('alpha').notNull(),
    beta: real('beta').notNull(),
    mastery: real('mastery').notNull(),
    confidence: real('confidence').notNull(),
    status: text('status').notNull(),
    evidenceCount: integer('evidence_count').notNull(),
    lastEvidenceAt: timestamp('last_evidence_at', { withTimezone: true }),
    rubricVersion: integer('rubric_version').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);

export const readinessSnapshots = pgTable(
  'readiness_snapshots',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    takenOn: date('taken_on').notNull(),
    overall: real('overall').notNull(),
    pillars: jsonb('pillars').$type<Record<string, number | null>>().notNull(),
    rubricVersion: integer('rubric_version').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('readiness_user_role_day_uq').on(t.userId, t.roleId, t.takenOn)],
);

/** APPEND ONLY. Idempotent per (user, reason, source). */
export const xpLedger = pgTable(
  'xp_ledger',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    amount: integer('amount').notNull(),
    reasonCode: text('reason_code').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('xp_idempotency_uq').on(t.userId, t.reasonCode, t.sourceType, t.sourceId),
    index('xp_user_time_idx').on(t.userId, t.occurredAt),
  ],
);

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeSlug: text('badge_slug').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeSlug] })],
);

// ─── Career (Phase 9) ────────────────────────────────────────────────────────

export type ParsedResume = {
  skills: { skillId: string; slug: string; name: string; snippet: string; verified: boolean }[];
  sections: Record<string, string>;
  warnings: string[];
};

export const resumes = pgTable('resumes', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  rawText: text('raw_text').notNull(),
  parsed: jsonb('parsed').$type<ParsedResume>().notNull(),
  createdAt: createdAt(),
});

export const jobs = pgTable(
  'jobs',
  {
    id: id(),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull(),
    remote: boolean('remote').notNull().default(false),
    url: text('url'),
    description: text('description').notNull(),
    minExp: integer('min_exp').notNull().default(0),
    roleSlug: text('role_slug'),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (t) => [uniqueIndex('jobs_source_ext_uq').on(t.source, t.externalId)],
);

export const jobSkills = pgTable(
  'job_skills',
  {
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
    importance: real('importance').notNull(),
    snippet: text('snippet').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.skillId] })],
);

export type ApplicationStatus = 'saved' | 'applied' | 'oa' | 'interview' | 'offer' | 'rejected';

export const applications = pgTable(
  'applications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    status: text('status').$type<ApplicationStatus>().notNull().default('saved'),
    notes: text('notes').notNull().default(''),
    timeline: jsonb('timeline')
      .$type<{ status: ApplicationStatus; at: string }[]>()
      .notNull()
      .default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('applications_user_job_uq').on(t.userId, t.jobId)],
);

// ─── Interviews (Phase 10) ───────────────────────────────────────────────────

export type InterviewRound = { kind: string; title: string; questionSlug: string };

export const interviewSessions = pgTable('interview_sessions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id),
  companyProfile: text('company_profile').notNull(),
  rounds: jsonb('rounds').$type<InterviewRound[]>().notNull(),
  currentRound: integer('current_round').notNull().default(0),
  status: text('status').$type<'active' | 'completed'>().notNull().default('active'),
  aiMode: text('ai_mode').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

export const interviewTurns = pgTable(
  'interview_turns',
  {
    id: id(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    idx: integer('idx').notNull(),
    actor: text('actor').$type<'ai' | 'user'>().notNull(),
    content: text('content').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('turns_session_idx').on(t.sessionId, t.round, t.idx)],
);

export const interviewScores = pgTable('interview_scores', {
  id: id(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  round: integer('round').notNull(),
  dimension: text('dimension').notNull(),
  /** The qualitative judgment — the only thing an LLM may produce (ADR-006). */
  level: text('level').$type<'weak' | 'developing' | 'solid' | 'strong'>().notNull(),
  /** Deterministic mapping of `level`, done by code. */
  score: integer('score').notNull(),
  justification: text('justification').notNull(),
  skillId: uuid('skill_id').references(() => skills.id),
});

// ─── Social (Phase 11) ───────────────────────────────────────────────────────

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followeeId: uuid('followee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followeeId] })],
);

export const battles = pgTable('battles', {
  id: id(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  opponentId: uuid('opponent_id')
    .notNull()
    .references(() => users.id),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id),
  problemIds: uuid('problem_ids').array().notNull(),
  durationS: integer('duration_s').notNull(),
  status: text('status').$type<'active' | 'finished'>().notNull().default('active'),
  createdAt: createdAt(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
});

export const battleParticipants = pgTable(
  'battle_participants',
  {
    battleId: uuid('battle_id')
      .notNull()
      .references(() => battles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    solved: integer('solved').notNull().default(0),
    penaltyS: integer('penalty_s').notNull().default(0),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.battleId, t.userId] })],
);

// ─── Platform ────────────────────────────────────────────────────────────────

export const aiUsage = pgTable('ai_usage', {
  id: id(),
  userId: uuid('user_id'),
  purpose: text('purpose').notNull(),
  model: text('model').notNull(),
  mode: text('mode').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  ok: boolean('ok').notNull(),
  error: text('error'),
  createdAt: createdAt(),
});

export const auditLog = pgTable('audit_log', {
  id: id(),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  diff: jsonb('diff').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export type Topic = typeof topics.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type EvidenceEvent = typeof evidenceEvents.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type InterviewSession = typeof interviewSessions.$inferSelect;
