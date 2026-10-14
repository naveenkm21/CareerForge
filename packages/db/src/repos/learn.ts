import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { getDb } from '../client';
import {
  lessonProgress,
  lessons,
  problems,
  questions,
  skills,
  submissions,
  topics,
} from '../schema';
import { recordEvidence } from './scoring';

export async function listTopicsWithProgress(userId: string | null) {
  const db = getDb();
  const [topicRows, lessonRows, done] = await Promise.all([
    db
      .select({ topic: topics, skill: skills })
      .from(topics)
      .innerJoin(skills, eq(skills.id, topics.skillId))
      .where(eq(topics.status, 'published'))
      .orderBy(asc(topics.sort)),
    db.select({ id: lessons.id, topicId: lessons.topicId, stage: lessons.stage }).from(lessons),
    userId
      ? db
          .select({ lessonId: lessonProgress.lessonId })
          .from(lessonProgress)
          .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt)))
      : Promise.resolve([]),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  return topicRows.map(({ topic, skill }) => {
    const ls = lessonRows.filter((l) => l.topicId === topic.id);
    return {
      ...topic,
      skill,
      lessonCount: ls.length,
      completed: ls.filter((l) => doneSet.has(l.id)).length,
      stages: ls.map((l) => l.stage).sort((a, b) => a - b),
    };
  });
}

export async function getTopic(slug: string, userId: string | null) {
  const db = getDb();
  const [row] = await db
    .select({ topic: topics, skill: skills })
    .from(topics)
    .innerJoin(skills, eq(skills.id, topics.skillId))
    .where(eq(topics.slug, slug));
  if (!row) return null;
  const ls = await db
    .select()
    .from(lessons)
    .where(eq(lessons.topicId, row.topic.id))
    .orderBy(asc(lessons.sort));
  const done =
    userId && ls.length
      ? await db
          .select()
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, userId),
              inArray(
                lessonProgress.lessonId,
                ls.map((l) => l.id),
              ),
            ),
          )
      : [];
  const doneSet = new Set(done.filter((d) => d.completedAt).map((d) => d.lessonId));
  return { ...row, lessons: ls.map((l) => ({ ...l, completed: doneSet.has(l.id) })) };
}

export async function getQuestionsBySlug(slugs: string[]) {
  if (!slugs.length) return [];
  return getDb().select().from(questions).where(inArray(questions.slug, slugs));
}

export async function getPlacementQuestions() {
  return getDb()
    .select()
    .from(questions)
    .where(eq(questions.placement, true))
    .orderBy(asc(questions.difficulty));
}

export async function getProblemsBySlug(slugs: string[], userId: string | null) {
  if (!slugs.length) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
    })
    .from(problems)
    .where(inArray(problems.slug, slugs));
  const solved = userId
    ? new Set(
        (
          await db
            .selectDistinct({ id: submissions.problemId })
            .from(submissions)
            .where(and(eq(submissions.userId, userId), eq(submissions.status, 'ac')))
        ).map((r) => r.id),
      )
    : new Set<string>();
  return rows.map((r) => ({ ...r, solved: solved.has(r.id) }));
}

/** Completing a lesson writes `lesson.viewed` evidence (weak by design: watching proves little). */
export async function completeLesson(userId: string, lessonId: string, secondsSpent: number) {
  const db = getDb();
  const [lesson] = await db
    .select({ lesson: lessons, topic: topics })
    .from(lessons)
    .innerJoin(topics, eq(topics.id, lessons.topicId))
    .where(eq(lessons.id, lessonId));
  if (!lesson) throw new Error('lesson not found');
  const [existing] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, completedAt: new Date(), secondsSpent })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        completedAt: existing?.completedAt ?? new Date(),
        secondsSpent: (existing?.secondsSpent ?? 0) + secondsSpent,
      },
    });
  if (!existing?.completedAt) {
    await recordEvidence(userId, [
      {
        skillId: lesson.topic.skillId,
        kind: 'lesson.viewed',
        sourceType: 'lesson',
        sourceId: lessonId,
        outcome: 1,
        difficulty: 0.3,
        durationMs: secondsSpent * 1000,
        meta: { stage: lesson.lesson.stage },
      },
    ]);
  }
}

export async function answerQuestion(
  userId: string,
  questionSlug: string,
  given: string,
  context: { lessonId?: string; placement?: boolean },
) {
  const [q] = await getDb().select().from(questions).where(eq(questions.slug, questionSlug));
  if (!q) throw new Error('question not found');
  const correct = given.trim() === q.answer.trim();
  await recordEvidence(userId, [
    {
      skillId: q.skillId,
      kind: context.placement ? 'assessment.completed' : 'question.answered',
      sourceType: 'question',
      sourceId: q.id,
      outcome: correct ? 1 : 0,
      difficulty: q.difficulty,
      meta: { given, lessonId: context.lessonId ?? null, placement: context.placement ?? false },
    },
  ]);
  return { correct, answer: q.answer, explanation: q.explanation };
}

/** One event per checkpoint answer, attributed to the algorithm's skill. */
export async function recordCheckpoint(
  userId: string,
  input: {
    skillId: string;
    algorithmId: string;
    step: number;
    anchor: string;
    correct: boolean;
    given: string;
    difficulty: number;
  },
) {
  await recordEvidence(userId, [
    {
      skillId: input.skillId,
      kind: 'checkpoint.answered',
      sourceType: 'checkpoint',
      sourceId: `${input.algorithmId}#${input.step}`,
      outcome: input.correct ? 1 : 0,
      difficulty: input.difficulty,
      meta: {
        algorithmId: input.algorithmId,
        step: input.step,
        anchor: input.anchor,
        given: input.given,
      },
    },
  ]);
}
