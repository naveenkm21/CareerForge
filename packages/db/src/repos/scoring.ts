import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import {
  BADGES,
  computeReadiness,
  computeStreak,
  computeXp,
  earnedBadges,
  interviewPillar,
  LEVEL_SCORES,
  planDay,
  projectSkills,
  RUBRIC_VERSION,
  rollUp,
  scoreResume,
  studyDay,
  type CatalogItem,
  type EvidenceInput,
  type ReadinessResult,
  type SkillProjection,
} from '@careerforge/core';
import { getDb } from '../client';
import {
  enrollments,
  evidenceEvents,
  interviewScores,
  interviewSessions,
  lessonProgress,
  lessons,
  problems,
  readinessSnapshots,
  resumes,
  roleSkillReqs,
  roles,
  skillEdges,
  skills,
  submissions,
  topics,
  userBadges,
  userSkillState,
  users,
  xpLedger,
  algorithms,
  battleParticipants,
  battles,
} from '../schema';

export type NewEvidence = {
  skillId: string;
  kind: string;
  sourceType: string;
  sourceId: string;
  outcome: number;
  difficulty?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
  occurredAt?: Date;
};

const KIND_WEIGHT_HINT = 1; // the stored weight column records the kind weight used at write time

/** Appends evidence without recomputing — for bulk imports that recompute once at the end. */
export async function appendEvidence(userId: string, events: NewEvidence[]): Promise<void> {
  if (!events.length) return;
  await getDb()
    .insert(evidenceEvents)
    .values(
      events.map((e) => ({
        userId,
        skillId: e.skillId,
        kind: e.kind,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        outcome: Math.min(1, Math.max(0, e.outcome)),
        difficulty: e.difficulty ?? 0.5,
        weight: KIND_WEIGHT_HINT,
        durationMs: e.durationMs ?? null,
        meta: e.meta ?? {},
        occurredAt: e.occurredAt ?? new Date(),
      })),
    );
}

/** Appends evidence (never updates — ADR-001) and refreshes every projection for the user. */
export async function recordEvidence(userId: string, events: NewEvidence[]): Promise<void> {
  if (!events.length) return;
  const db = getDb();
  await db.insert(evidenceEvents).values(
    events.map((e) => ({
      userId,
      skillId: e.skillId,
      kind: e.kind,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      outcome: Math.min(1, Math.max(0, e.outcome)),
      difficulty: e.difficulty ?? 0.5,
      weight: KIND_WEIGHT_HINT,
      durationMs: e.durationMs ?? null,
      meta: e.meta ?? {},
      occurredAt: e.occurredAt ?? new Date(),
    })),
  );
  await recomputeUser(userId);
}

// ── Scoring context ──────────────────────────────────────────────────────────

export type ScoringContext = Awaited<ReturnType<typeof loadScoringContext>>;

/**
 * Everything scoring needs for one user, computed fresh from the evidence log. Pure core
 * functions do the math; this only gathers rows.
 */
export async function loadScoringContext(userId: string, now = new Date()) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('user not found');
  const [enrollment] = await db
    .select({ role: roles })
    .from(enrollments)
    .innerJoin(roles, eq(roles.id, enrollments.roleId))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.isPrimary, true)));
  const role = enrollment?.role ?? null;

  const [allSkills, edges, reqs, events] = await Promise.all([
    db.select().from(skills),
    db.select().from(skillEdges).where(eq(skillEdges.kind, 'prereq')),
    role
      ? db.select().from(roleSkillReqs).where(eq(roleSkillReqs.roleId, role.id))
      : Promise.resolve([]),
    db
      .select()
      .from(evidenceEvents)
      // Only evidence up to `now`: historical snapshots must not see the future.
      .where(and(eq(evidenceEvents.userId, userId), lte(evidenceEvents.occurredAt, now)))
      .orderBy(asc(evidenceEvents.occurredAt)),
  ]);
  const skillById = new Map(allSkills.map((s) => [s.id, s]));
  const prereqMap = new Map<string, string[]>();
  for (const e of edges)
    prereqMap.set(e.toSkillId, [...(prereqMap.get(e.toSkillId) ?? []), e.fromSkillId]);
  const prereqsOf = (id: string) => prereqMap.get(id) ?? [];

  const inputs: EvidenceInput[] = events.map((e) => ({
    id: e.id,
    skillId: e.skillId,
    kind: e.kind,
    outcome: e.outcome,
    difficulty: e.difficulty,
    occurredAt: e.occurredAt,
    meta: e.meta as EvidenceInput['meta'],
  }));
  const states = projectSkills(inputs, now);

  // Parent skills roll up from children (coverage-capped), so badges like "Graph Navigator" work.
  const rolled = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  for (const s of allSkills)
    if (s.parentId) childrenOf.set(s.parentId, [...(childrenOf.get(s.parentId) ?? []), s.id]);
  for (const s of allSkills) {
    const kids = childrenOf.get(s.id);
    const own = states.get(s.id);
    if (kids?.length) {
      const v = rollUp(
        kids.map((k) => ({
          mastery: states.get(k)?.mastery ?? 0,
          confidence: states.get(k)?.confidence ?? 0,
          weight: 1,
        })),
      );
      if (v !== null) rolled.set(s.slug, v);
    } else if (own) rolled.set(s.slug, own.mastery);
  }

  return { user, role, allSkills, skillById, prereqsOf, reqs, events, states, rolled, now };
}

async function resumeScoreFor(
  ctx: ScoringContext,
): Promise<{ score: number | null; checks: ReturnType<typeof scoreResume>['checks'] }> {
  const [latest] = await getDb()
    .select()
    .from(resumes)
    .where(eq(resumes.userId, ctx.user.id))
    .orderBy(desc(resumes.createdAt))
    .limit(1);
  if (!latest) return { score: null, checks: [] };
  const core = ctx.reqs
    .filter((r) => r.tier === 'core')
    .map((r) => ctx.skillById.get(r.skillId)!.slug);
  const claimed = new Set(latest.parsed.skills.map((s) => s.slug));
  return scoreResume(latest.rawText, core, claimed);
}

async function interviewScoreFor(userId: string): Promise<number | null> {
  const rows = await getDb()
    .select({
      sessionId: interviewSessions.id,
      endedAt: interviewSessions.endedAt,
      score: interviewScores.score,
    })
    .from(interviewSessions)
    .innerJoin(interviewScores, eq(interviewScores.sessionId, interviewSessions.id))
    .where(
      and(
        eq(interviewSessions.userId, userId),
        eq(interviewSessions.status, 'completed'),
        isNotNull(interviewSessions.endedAt),
      ),
    );
  const bySession = new Map<string, { endedAt: Date; scores: number[] }>();
  for (const r of rows) {
    const s = bySession.get(r.sessionId) ?? { endedAt: r.endedAt!, scores: [] };
    s.scores.push(r.score);
    bySession.set(r.sessionId, s);
  }
  return interviewPillar([...bySession.values()]);
}

export async function readinessFor(
  ctx: ScoringContext,
): Promise<ReadinessResult & { resumeChecks: ReturnType<typeof scoreResume>['checks'] }> {
  const [resume, interview] = await Promise.all([
    resumeScoreFor(ctx),
    interviewScoreFor(ctx.user.id),
  ]);
  const result = computeReadiness({
    roleSlug: ctx.role?.slug ?? 'sde',
    skills: ctx.reqs.map((r) => {
      const s = ctx.skillById.get(r.skillId)!;
      return {
        skillId: r.skillId,
        slug: s.slug,
        name: s.name,
        domain: s.domain,
        tier: r.tier,
        weight: r.weight,
        target: r.targetMastery,
      };
    }),
    states: ctx.states,
    prereqsOf: ctx.prereqsOf,
    resumeScore: resume.score,
    interviewScore: interview,
    nameOf: (id) => ctx.skillById.get(id)?.name ?? id,
  });
  return { ...result, resumeChecks: resume.checks };
}

// ── Projector ────────────────────────────────────────────────────────────────

/**
 * Rebuilds every projection for a user from the evidence log: skill states, today's readiness
 * snapshot, XP (idempotent inserts), and badges. Safe to run any number of times.
 */
export async function recomputeUser(
  userId: string,
  now = new Date(),
): Promise<{ readiness: number; xp: number; badges: string[] }> {
  const db = getDb();
  const ctx = await loadScoringContext(userId, now);
  const readiness = await readinessFor(ctx);

  await db.transaction(async (tx) => {
    await tx.delete(userSkillState).where(eq(userSkillState.userId, userId));
    const rows = [...ctx.states.values()].map((p: SkillProjection) => ({
      userId,
      skillId: p.skillId,
      alpha: p.alpha,
      beta: p.beta,
      mastery: p.mastery,
      confidence: p.confidence,
      status: p.status,
      evidenceCount: p.evidenceCount,
      lastEvidenceAt: p.lastEvidenceAt,
      rubricVersion: RUBRIC_VERSION,
    }));
    if (rows.length) await tx.insert(userSkillState).values(rows);

    if (ctx.role) {
      const day = studyDay(now, ctx.user.timezone);
      await tx
        .insert(readinessSnapshots)
        .values({
          userId,
          roleId: ctx.role.id,
          takenOn: day,
          overall: readiness.overall,
          pillars: readiness.pillars,
          rubricVersion: RUBRIC_VERSION,
        })
        .onConflictDoUpdate({
          target: [
            readinessSnapshots.userId,
            readinessSnapshots.roleId,
            readinessSnapshots.takenOn,
          ],
          set: {
            overall: readiness.overall,
            pillars: readiness.pillars,
            rubricVersion: RUBRIC_VERSION,
          },
        });
    }

    const xp = computeXp(
      ctx.events.map((e) => ({ ...e, meta: e.meta as Record<string, unknown> })),
      ctx.user.timezone,
    );
    if (xp.length)
      await tx
        .insert(xpLedger)
        .values(xp.map((x) => ({ userId, ...x })))
        .onConflictDoNothing();
  });

  const badges = await refreshBadges(ctx, readiness.overall, now);
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`coalesce(sum(${xpLedger.amount}), 0)::int` })
    .from(xpLedger)
    .where(eq(xpLedger.userId, userId));
  return { readiness: readiness.overall, xp: total, badges };
}

async function refreshBadges(ctx: ScoringContext, readiness: number, now: Date): Promise<string[]> {
  const db = getDb();
  const userId = ctx.user.id;
  const [solved, interviews, wins] = await Promise.all([
    db
      .selectDistinct({ p: submissions.problemId })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.status, 'ac'))),
    db
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.status, 'completed'))),
    db
      .select({ id: evidenceEvents.id })
      .from(evidenceEvents)
      .where(
        and(
          eq(evidenceEvents.userId, userId),
          eq(evidenceEvents.kind, 'battle.result'),
          eq(evidenceEvents.outcome, 1),
        ),
      ),
  ]);
  const streak = computeStreak(ctx.events, ctx.user.timezone, now);
  const slugs = earnedBadges({
    evidenceCount: ctx.events.length,
    distinctSolved: solved.length,
    longestStreak: streak.longest,
    interviewsCompleted: interviews.length,
    battlesWon: wins.length,
    readiness,
    masteryBySlug: Object.fromEntries(ctx.rolled),
  });
  if (slugs.length) {
    const inserted = await db
      .insert(userBadges)
      .values(slugs.map((badgeSlug) => ({ userId, badgeSlug, earnedAt: now })))
      .onConflictDoNothing()
      .returning({ slug: userBadges.badgeSlug });
    if (inserted.length)
      await db
        .insert(xpLedger)
        .values(
          inserted.map((b) => ({
            userId,
            amount: 75,
            reasonCode: 'BADGE_EARNED',
            sourceType: 'badge',
            sourceId: b.slug,
            occurredAt: now,
          })),
        )
        .onConflictDoNothing();
  }
  return slugs;
}

// ── Read models ──────────────────────────────────────────────────────────────

export async function getReadinessHistory(userId: string, days = 30) {
  return getDb()
    .select({
      takenOn: readinessSnapshots.takenOn,
      overall: readinessSnapshots.overall,
      pillars: readinessSnapshots.pillars,
    })
    .from(readinessSnapshots)
    .where(eq(readinessSnapshots.userId, userId))
    .orderBy(desc(readinessSnapshots.takenOn))
    .limit(days)
    .then((rows) => rows.reverse());
}

export async function getGamification(userId: string, timeZone: string, now = new Date()) {
  const db = getDb();
  const [xpRows, badges, events] = await Promise.all([
    db.select().from(xpLedger).where(eq(xpLedger.userId, userId)),
    db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(asc(userBadges.earnedAt)),
    db
      .select({ kind: evidenceEvents.kind, occurredAt: evidenceEvents.occurredAt })
      .from(evidenceEvents)
      .where(eq(evidenceEvents.userId, userId)),
  ]);
  const today = studyDay(now, timeZone);
  const total = xpRows.reduce((s, x) => s + x.amount, 0);
  const todayXp = xpRows
    .filter((x) => studyDay(x.occurredAt, timeZone) === today)
    .reduce((s, x) => s + x.amount, 0);
  const streak = computeStreak(events, timeZone, now);
  const defs = new Map(BADGES.map((b) => [b.slug, b]));
  return {
    totalXp: total,
    todayXp,
    streak,
    level: Math.floor(Math.sqrt(total / 100)) + 1,
    badges: badges
      .map((b) => ({ ...defs.get(b.badgeSlug)!, earnedAt: b.earnedAt }))
      .filter((b) => b.name),
    allBadges: BADGES.map(({ slug, name, description, icon }) => ({
      slug,
      name,
      description,
      icon,
      earned: badges.some((b) => b.badgeSlug === slug),
    })),
  };
}

/** Evidence behind one skill, with each event's effect on mastery (the bottom of /explain). */
export async function getSkillExplanation(userId: string, skillId: string, now = new Date()) {
  const ctx = await loadScoringContext(userId, now);
  const skill = ctx.skillById.get(skillId);
  if (!skill) return null;
  const projection = ctx.states.get(skillId) ?? null;
  const byId = new Map(ctx.events.map((e) => [e.id, e]));
  const contributions = (projection?.contributions ?? [])
    .map((c) => ({ ...c, event: byId.get(c.eventId)! }))
    .reverse();
  const req = ctx.reqs.find((r) => r.skillId === skillId) ?? null;
  const prereqs = ctx
    .prereqsOf(skillId)
    .map((id) => ({ skill: ctx.skillById.get(id)!, state: ctx.states.get(id) ?? null }));
  return { skill, projection, contributions, requirement: req, prereqs };
}

// ── Planner ──────────────────────────────────────────────────────────────────

export async function getTodayPlan(userId: string, now = new Date()) {
  const db = getDb();
  const ctx = await loadScoringContext(userId, now);
  const readiness = await readinessFor(ctx);
  const [topicRows, lessonRows, progress, problemRows, solvedRows, algoRows] = await Promise.all([
    db.select().from(topics).orderBy(asc(topics.sort)),
    db
      .select({
        id: lessons.id,
        topicId: lessons.topicId,
        slug: lessons.slug,
        title: lessons.title,
        stage: lessons.stage,
        estMinutes: lessons.estMinutes,
      })
      .from(lessons)
      .orderBy(asc(lessons.sort)),
    db
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt))),
    db
      .select({
        id: problems.id,
        slug: problems.slug,
        title: problems.title,
        skillId: problems.skillId,
        difficulty: problems.difficulty,
      })
      .from(problems)
      .where(eq(problems.status, 'published'))
      .orderBy(asc(problems.difficulty)),
    db
      .selectDistinct({ problemId: submissions.problemId, createdAt: submissions.createdAt })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.status, 'ac'))),
    db.select().from(algorithms),
  ]);

  const tz = ctx.user.timezone;
  const today = studyDay(now, tz);
  const completed = new Set<string>([
    ...progress.map((p) => p.lessonId),
    ...solvedRows.map((s) => s.problemId),
  ]);
  const completedToday = new Set<string>([
    ...progress
      .filter((p) => p.completedAt && studyDay(p.completedAt, tz) === today)
      .map((p) => p.lessonId),
    ...solvedRows.filter((s) => studyDay(s.createdAt, tz) === today).map((s) => s.problemId),
  ]);

  const catalog = new Map<string, CatalogItem[]>();
  const add = (skillId: string, item: CatalogItem) =>
    catalog.set(skillId, [...(catalog.get(skillId) ?? []), item]);
  const topicById = new Map(topicRows.map((t) => [t.id, t]));
  for (const l of lessonRows) {
    const t = topicById.get(l.topicId);
    if (!t || l.stage === 5 || l.stage === 6) continue;
    add(t.skillId, {
      kind: 'lesson',
      refId: l.id,
      title: `${t.title}: ${l.title}`,
      href: `/learn/${t.slug}/${l.slug}`,
      minutes: l.estMinutes,
    });
  }
  for (const a of algoRows)
    add(a.skillId, {
      kind: 'visualize',
      refId: `viz:${a.registryId}`,
      title: `Visualize ${a.title}`,
      href: `/viz/${a.registryId}`,
      minutes: 10,
    });
  for (const p of problemRows)
    add(p.skillId, {
      kind: 'practice',
      refId: p.id,
      title: p.title,
      href: `/practice/${p.slug}`,
      minutes: 10 + p.difficulty * 6,
      difficulty: p.difficulty,
    });
  catalog.set('*', [
    {
      kind: 'interview',
      refId: 'mock-interview',
      title: 'Mock interview (3 rounds)',
      href: '/interview',
      minutes: 30,
    },
  ]);

  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const items = planDay({
    requirements: ctx.reqs.map((r) => ({
      skillId: r.skillId,
      name: ctx.skillById.get(r.skillId)!.name,
      tier: r.tier,
      weight: r.weight,
      target: r.targetMastery,
    })),
    states: ctx.states,
    prereqsOf: ctx.prereqsOf,
    nameOf: (id) => ctx.skillById.get(id)?.name ?? id,
    catalog,
    completed,
    completedToday,
    dailyMinutes: ctx.user.dailyMinutesTarget,
    now,
    weekday,
    readiness: readiness.overall,
  });
  return { items, readiness, ctx };
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

/** Weekly XP leaderboard. (Redis ZSETs in the full design; Postgres is fine at demo scale.) */
export async function getLeaderboard(opts: { since: Date; userIds?: string[]; limit?: number }) {
  const db = getDb();
  // `gte` maps the Date through the column type. A raw sql`… >= ${date}` works on PGlite but
  // postgres-js (Neon) cannot serialize a bare Date parameter and the query throws.
  const since = gte(xpLedger.occurredAt, opts.since);
  const where = opts.userIds ? and(since, inArray(xpLedger.userId, opts.userIds)) : since;
  return db
    .select({
      userId: users.id,
      name: users.name,
      handle: users.handle,
      college: users.college,
      xp: sql<number>`sum(${xpLedger.amount})::int`,
    })
    .from(xpLedger)
    .innerJoin(users, eq(users.id, xpLedger.userId))
    .where(where)
    .groupBy(users.id, users.name, users.handle, users.college)
    .orderBy(desc(sql`sum(${xpLedger.amount})`))
    .limit(opts.limit ?? 20);
}

export async function battleWins(userId: string) {
  return getDb()
    .select({ battleId: battles.id })
    .from(battles)
    .innerJoin(battleParticipants, eq(battleParticipants.battleId, battles.id))
    .where(and(eq(battleParticipants.userId, userId), eq(battles.status, 'finished')));
}

export const LEVEL_TO_SCORE = LEVEL_SCORES;
