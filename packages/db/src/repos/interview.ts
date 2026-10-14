import { and, asc, desc, eq } from 'drizzle-orm';
import { LEVEL_SCORES, type RubricLevel } from '@careerforge/core';
import { getDb } from '../client';
import {
  aiUsage,
  interviewScores,
  interviewSessions,
  interviewTurns,
  roles,
  skills,
  type InterviewRound,
} from '../schema';
import { recordEvidence } from './scoring';

export async function createInterviewSession(input: {
  userId: string;
  roleId: string;
  companyProfile: string;
  rounds: InterviewRound[];
  aiMode: string;
  opening: string;
}) {
  const db = getDb();
  const [session] = await db
    .insert(interviewSessions)
    .values({
      userId: input.userId,
      roleId: input.roleId,
      companyProfile: input.companyProfile,
      rounds: input.rounds,
      aiMode: input.aiMode,
    })
    .returning();
  await db
    .insert(interviewTurns)
    .values({ sessionId: session!.id, round: 0, idx: 0, actor: 'ai', content: input.opening });
  return session!;
}

export async function getInterviewSession(sessionId: string, userId: string) {
  const db = getDb();
  const [session] = await db
    .select({ session: interviewSessions, role: roles })
    .from(interviewSessions)
    .innerJoin(roles, eq(roles.id, interviewSessions.roleId))
    .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId)));
  if (!session) return null;
  const [turns, scores] = await Promise.all([
    db
      .select()
      .from(interviewTurns)
      .where(eq(interviewTurns.sessionId, sessionId))
      .orderBy(asc(interviewTurns.round), asc(interviewTurns.idx)),
    db
      .select()
      .from(interviewScores)
      .where(eq(interviewScores.sessionId, sessionId))
      .orderBy(asc(interviewScores.round)),
  ]);
  return { ...session, turns, scores };
}

export async function listInterviewSessions(userId: string) {
  const db = getDb();
  const sessions = await db
    .select({ session: interviewSessions, role: roles })
    .from(interviewSessions)
    .innerJoin(roles, eq(roles.id, interviewSessions.roleId))
    .where(eq(interviewSessions.userId, userId))
    .orderBy(desc(interviewSessions.startedAt));
  const scores = await db.select().from(interviewScores);
  return sessions.map((s) => {
    const mine = scores.filter((x) => x.sessionId === s.session.id);
    return {
      ...s,
      average: mine.length ? mine.reduce((a, b) => a + b.score, 0) / mine.length : null,
    };
  });
}

export async function appendTurn(
  sessionId: string,
  round: number,
  actor: 'ai' | 'user',
  content: string,
) {
  const db = getDb();
  const existing = await db
    .select({ idx: interviewTurns.idx })
    .from(interviewTurns)
    .where(and(eq(interviewTurns.sessionId, sessionId), eq(interviewTurns.round, round)));
  const idx = existing.length ? Math.max(...existing.map((e) => e.idx)) + 1 : 0;
  await db.insert(interviewTurns).values({ sessionId, round, idx, actor, content });
}

/**
 * Stores a round's rubric. The judge supplies qualitative LEVELS; this function — code — maps
 * them to numbers (ADR-006) and turns the round into one `interview.scored` evidence event.
 */
export async function scoreRound(input: {
  userId: string;
  sessionId: string;
  round: number;
  skillSlug: string;
  levels: { dimension: string; level: RubricLevel; justification: string }[];
}) {
  const db = getDb();
  const [skill] = await db.select().from(skills).where(eq(skills.slug, input.skillSlug));
  const rows = input.levels.map((l) => ({
    sessionId: input.sessionId,
    round: input.round,
    dimension: l.dimension,
    level: l.level,
    score: LEVEL_SCORES[l.level],
    justification: l.justification,
    skillId: skill?.id ?? null,
  }));
  await db.insert(interviewScores).values(rows);
  if (skill) {
    const mean = rows.reduce((s, r) => s + r.score, 0) / rows.length / 10;
    await recordEvidence(input.userId, [
      {
        skillId: skill.id,
        kind: 'interview.scored',
        sourceType: 'interview',
        sourceId: input.sessionId,
        outcome: mean,
        difficulty: 0.6,
        meta: {
          round: input.round,
          levels: Object.fromEntries(input.levels.map((l) => [l.dimension, l.level])),
        },
      },
    ]);
  }
}

export async function advanceSession(sessionId: string, nextRound: number, done: boolean) {
  await getDb()
    .update(interviewSessions)
    .set(
      done
        ? { currentRound: nextRound, status: 'completed', endedAt: new Date() }
        : { currentRound: nextRound },
    )
    .where(eq(interviewSessions.id, sessionId));
}

export async function logAiUsage(row: typeof aiUsage.$inferInsert) {
  await getDb().insert(aiUsage).values(row);
}
