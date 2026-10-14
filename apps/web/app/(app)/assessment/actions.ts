'use server';

import { revalidatePath } from 'next/cache';
import { getPlacementQuestions, recordEvidence } from '@careerforge/db';
import { requireActor } from '@/lib/session';

/** Placement: one `assessment.completed` event per question (timed, no hints → weight 2.0). */
export async function submitPlacementAction(answers: Record<string, string>) {
  const actor = await requireActor();
  const qs = await getPlacementQuestions();
  const results = qs.map((q) => ({
    q,
    given: answers[q.slug] ?? '',
    correct: (answers[q.slug] ?? '') === q.answer,
  }));
  await recordEvidence(
    actor.id,
    results
      .filter((r) => r.given)
      .map((r) => ({
        skillId: r.q.skillId,
        kind: 'assessment.completed',
        sourceType: 'question',
        sourceId: r.q.id,
        outcome: r.correct ? 1 : 0,
        difficulty: r.q.difficulty,
        meta: { given: r.given, placement: true },
      })),
  );
  revalidatePath('/dashboard');
  return results.map((r) => ({
    slug: r.q.slug,
    correct: r.correct,
    answer: r.q.answer,
    explanation: r.q.explanation,
  }));
}
