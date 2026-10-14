'use server';

import { revalidatePath } from 'next/cache';
import { judgeExplanation } from '@careerforge/ai';
import { LEVEL_SCORES } from '@careerforge/core';
import { getAlgorithmMeta } from '@careerforge/viz';
import {
  answerQuestion,
  completeLesson,
  logAiUsage,
  recordCheckpoint,
  recordEvidence,
} from '@careerforge/db';
import { requireActor } from '@/lib/session';
import { skillIdForSlug } from '@/lib/skills';

export async function completeLessonAction(lessonId: string, seconds: number) {
  const actor = await requireActor();
  await completeLesson(actor.id, lessonId, Math.max(0, Math.min(3600, Math.round(seconds))));
  revalidatePath('/learn');
  revalidatePath('/dashboard');
}

export async function answerQuizAction(
  questionSlug: string,
  given: string,
  lessonId: string | null,
) {
  const actor = await requireActor();
  return answerQuestion(actor.id, questionSlug, given, { lessonId: lessonId ?? undefined });
}

/** Wired to the player's onCheckpointAnswered — every prediction becomes evidence. */
export async function recordCheckpointAction(input: {
  algorithmId: string;
  step: number;
  anchor: string;
  correct: boolean;
  given: string;
}) {
  const actor = await requireActor();
  const meta = getAlgorithmMeta(input.algorithmId);
  if (!meta) return;
  const skillId = await skillIdForSlug(meta.skillId);
  if (!skillId) return;
  await recordCheckpoint(actor.id, {
    skillId,
    ...input,
    difficulty: Math.min(1, 0.2 + meta.difficulty * 0.15),
  });
}

export async function explainAction(input: {
  skillSlug: string;
  lessonId: string;
  prompt: string;
  keyPoints: string[];
  answer: string;
}) {
  const actor = await requireActor();
  if (input.answer.trim().length < 10)
    return { error: 'Write at least a sentence or two.' } as const;
  const result = await judgeExplanation(
    { prompt: input.prompt, keyPoints: input.keyPoints, answer: input.answer.slice(0, 4000) },
    (u) => logAiUsage({ userId: actor.id, ...u }),
  );
  const skillId = await skillIdForSlug(input.skillSlug);
  if (skillId) {
    await recordEvidence(actor.id, [
      {
        skillId,
        kind: 'explanation.scored',
        sourceType: 'lesson',
        sourceId: `${input.lessonId}:${Date.now()}`,
        outcome: LEVEL_SCORES[result.level] / 10,
        difficulty: 0.5,
        meta: {
          level: result.level,
          covered: result.covered,
          missing: result.missing,
          mode: result.mode,
        },
      },
    ]);
  }
  return result;
}
