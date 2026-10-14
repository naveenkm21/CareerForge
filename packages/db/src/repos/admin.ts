import { asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  auditLog,
  evidenceEvents,
  lessonProgress,
  lessons,
  problems,
  problemTestcases,
  questions,
  skills,
  submissions,
  topics,
  users,
} from '../schema';

/**
 * Admin analytics read our own tables (docs/01 §8), not an analytics vendor: the three charts
 * the v1 schedule commits to — hardest items, ladder drop-off, completion time.
 */
export async function getAnalytics() {
  const db = getDb();
  const [hardestQuestions, hardestProblems, ladder, completion, totals] = await Promise.all([
    db
      .select({
        prompt: questions.prompt,
        slug: questions.slug,
        attempts: sql<number>`count(*)::int`,
        correctRate: sql<number>`avg(${evidenceEvents.outcome})`,
      })
      .from(evidenceEvents)
      .innerJoin(questions, sql`${questions.id}::text = ${evidenceEvents.sourceId}`)
      .where(sql`${evidenceEvents.kind} in ('question.answered', 'assessment.completed')`)
      .groupBy(questions.prompt, questions.slug)
      .having(sql`count(*) >= 2`)
      .orderBy(asc(sql`avg(${evidenceEvents.outcome})`))
      .limit(6),
    db
      .select({
        title: problems.title,
        slug: problems.slug,
        attempts: sql<number>`count(*)::int`,
        acRate: sql<number>`avg(case when ${submissions.status} = 'ac' then 1.0 else 0 end)`,
      })
      .from(submissions)
      .innerJoin(problems, eq(problems.id, submissions.problemId))
      .groupBy(problems.title, problems.slug)
      .having(sql`count(*) >= 2`)
      .orderBy(asc(sql`avg(case when ${submissions.status} = 'ac' then 1.0 else 0 end)`))
      .limit(6),
    db
      .select({
        stage: lessons.stage,
        learners: sql<number>`count(distinct ${lessonProgress.userId})::int`,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .where(sql`${lessonProgress.completedAt} is not null`)
      .groupBy(lessons.stage)
      .orderBy(asc(lessons.stage)),
    db
      .select({
        topic: topics.title,
        avgSeconds: sql<number>`avg(${lessonProgress.secondsSpent})::int`,
        completions: sql<number>`count(*)::int`,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .innerJoin(topics, eq(topics.id, lessons.topicId))
      .where(sql`${lessonProgress.completedAt} is not null`)
      .groupBy(topics.title)
      .orderBy(desc(sql`avg(${lessonProgress.secondsSpent})`))
      .limit(8),
    db
      .select({
        users: sql<number>`(select count(*) from ${users} where ${users.onboardedAt} is not null)::int`,
        events: sql<number>`(select count(*) from ${evidenceEvents})::int`,
        submissions: sql<number>`(select count(*) from ${submissions})::int`,
        problems: sql<number>`(select count(*) from ${problems})::int`,
      })
      .from(sql`(select 1) as one`),
  ]);
  return { hardestQuestions, hardestProblems, ladder, completion, totals: totals[0]! };
}

export async function listProblemsForAdmin() {
  return getDb()
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
      status: problems.status,
      version: problems.version,
      skill: skills.name,
      cases: sql<number>`(select count(*) from ${problemTestcases} where ${problemTestcases.problemId} = ${problems.id})::int`,
    })
    .from(problems)
    .innerJoin(skills, eq(skills.id, problems.skillId))
    .orderBy(asc(skills.slug), asc(problems.difficulty));
}

export type ProblemDraft = {
  slug: string;
  title: string;
  skillId: string;
  difficulty: number;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  status: 'draft' | 'published';
  testcases: { input: string; expected: string; isSample: boolean }[];
  referenceCpp: string;
};

/** Create or update a problem (bumping its version) with an audit-log entry. */
export async function saveProblem(actorId: string, draft: ProblemDraft) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(problems).where(eq(problems.slug, draft.slug));
    const values = {
      slug: draft.slug,
      title: draft.title,
      skillId: draft.skillId,
      difficulty: draft.difficulty,
      statement: draft.statement,
      inputFormat: draft.inputFormat,
      outputFormat: draft.outputFormat,
      constraints: draft.constraints,
      status: draft.status,
      referenceSolution: (draft.referenceCpp ? { cpp: draft.referenceCpp } : {}) as Record<
        string,
        string
      >,
    };
    const [row] = existing
      ? await tx
          .update(problems)
          .set({ ...values, version: existing.version + 1 })
          .where(eq(problems.id, existing.id))
          .returning()
      : await tx.insert(problems).values(values).returning();
    await tx.delete(problemTestcases).where(eq(problemTestcases.problemId, row!.id));
    if (draft.testcases.length)
      await tx
        .insert(problemTestcases)
        .values(draft.testcases.map((t, i) => ({ problemId: row!.id, ...t, sort: i })));
    await tx.insert(auditLog).values({
      actorId,
      action: existing ? 'problem.update' : 'problem.create',
      entityType: 'problem',
      entityId: row!.id,
      diff: { version: row!.version, status: draft.status, testcases: draft.testcases.length },
    });
    return row!;
  });
}

export async function listAudit(limit = 20) {
  return getDb()
    .select({ log: auditLog, actor: users.name })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function listSkillsForSelect() {
  return getDb()
    .select({ id: skills.id, slug: skills.slug, name: skills.name })
    .from(skills)
    .orderBy(asc(skills.slug));
}

export async function setUserRole(userId: string, role: 'user' | 'admin' | 'author') {
  await getDb().update(users).set({ role }).where(eq(users.id, userId));
}
