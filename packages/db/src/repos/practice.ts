import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  problems,
  problemTestcases,
  skills,
  submissions,
  type FailedCase,
  type SubmissionStatus,
} from '../schema';
import { recordEvidence } from './scoring';

export async function listProblems(userId: string | null) {
  const db = getDb();
  const rows = await db
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
      tags: problems.tags,
      skillName: skills.name,
      skillSlug: skills.slug,
      skillId: skills.id,
    })
    .from(problems)
    .innerJoin(skills, eq(skills.id, problems.skillId))
    .where(eq(problems.status, 'published'))
    .orderBy(asc(skills.slug), asc(problems.difficulty));
  if (!userId) return rows.map((r) => ({ ...r, status: 'unattempted' as const }));
  const subs = await db
    .select({
      problemId: submissions.problemId,
      ac: sql<boolean>`bool_or(${submissions.status} = 'ac')`,
    })
    .from(submissions)
    .where(eq(submissions.userId, userId))
    .groupBy(submissions.problemId);
  const by = new Map(subs.map((s) => [s.problemId, s.ac]));
  return rows.map((r) => ({
    ...r,
    status: by.has(r.id)
      ? by.get(r.id)
        ? ('solved' as const)
        : ('attempted' as const)
      : ('unattempted' as const),
  }));
}

export async function getProblem(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({ problem: problems, skill: skills })
    .from(problems)
    .innerJoin(skills, eq(skills.id, problems.skillId))
    .where(eq(problems.slug, slug));
  if (!row) return null;
  const cases = await db
    .select()
    .from(problemTestcases)
    .where(eq(problemTestcases.problemId, row.problem.id))
    .orderBy(asc(problemTestcases.sort));
  return { ...row, samples: cases.filter((c) => c.isSample), testcases: cases };
}

export async function listSubmissions(userId: string, problemId: string, limit = 10) {
  return getDb()
    .select()
    .from(submissions)
    .where(and(eq(submissions.userId, userId), eq(submissions.problemId, problemId)))
    .orderBy(desc(submissions.createdAt))
    .limit(limit);
}

export type JudgedSubmission = {
  problemId: string;
  lang: string;
  code: string;
  status: SubmissionStatus;
  passed: number;
  total: number;
  runtimeMs: number | null;
  failedCase: FailedCase | null;
  judge: string;
  battleId?: string | null;
  meta?: { hintsUsed?: number; solutionViewed?: boolean };
};

/**
 * Stores a judged submission and its evidence: `submission.judged`, the strongest signal there
 * is (weight 2.5). Partial credit is passed/total, discounted, so "almost" is not "solved".
 */
export async function saveSubmission(userId: string, s: JudgedSubmission) {
  const db = getDb();
  const [problem] = await db.select().from(problems).where(eq(problems.id, s.problemId));
  if (!problem) throw new Error('problem not found');
  const prior = await db
    .select({ status: submissions.status })
    .from(submissions)
    .where(and(eq(submissions.userId, userId), eq(submissions.problemId, s.problemId)));
  const [row] = await db
    .insert(submissions)
    .values({
      userId,
      problemId: s.problemId,
      lang: s.lang,
      code: s.code,
      status: s.status,
      passed: s.passed,
      total: s.total,
      runtimeMs: s.runtimeMs,
      failedCase: s.failedCase,
      judge: s.judge,
      battleId: s.battleId ?? null,
    })
    .returning();
  if (s.status !== 'error') {
    const outcome =
      s.status === 'ac' ? 1 : s.status === 'ce' ? 0 : (s.passed / Math.max(1, s.total)) * 0.6;
    await recordEvidence(userId, [
      {
        skillId: problem.skillId,
        kind: 'submission.judged',
        sourceType: 'submission',
        sourceId: row!.id,
        outcome,
        difficulty: (problem.difficulty - 1) / 4,
        meta: {
          problemId: problem.id,
          status: s.status,
          attempt: prior.length + 1,
          hintsUsed: s.meta?.hintsUsed ?? 0,
          solutionViewed: s.meta?.solutionViewed ?? false,
          lang: s.lang,
          aiReviewed: s.judge.startsWith('ai'),
        },
      },
    ]);
  }
  return row!;
}

export async function getSubmission(id: string, userId: string) {
  const [row] = await getDb()
    .select({ submission: submissions, problem: problems })
    .from(submissions)
    .innerJoin(problems, eq(problems.id, submissions.problemId))
    .where(and(eq(submissions.id, id), eq(submissions.userId, userId)));
  return row ?? null;
}

export async function hasSolved(userId: string, problemId: string) {
  const [row] = await getDb()
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, userId),
        eq(submissions.problemId, problemId),
        eq(submissions.status, 'ac'),
      ),
    )
    .limit(1);
  return !!row;
}
