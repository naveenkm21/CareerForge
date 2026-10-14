import { INTERVIEW_DIMENSIONS, type InterviewDimension, type RubricLevel } from '@careerforge/core';
import type { InterviewQuestion } from '@careerforge/content';

/**
 * The deterministic judge used when no LLM is configured (AI_MODE=fixtures: dev, CI, and a
 * demo that must never depend on a live API key — docs/09 §3). It measures coverage of the
 * question's key points and emits the same QUALITATIVE levels an LLM would.
 */

export type DimensionJudgment = {
  dimension: InterviewDimension;
  level: RubricLevel;
  justification: string;
};
export type RoundJudgment = {
  levels: DimensionJudgment[];
  strengths: string[];
  improvements: string[];
};

const has = (text: string, terms: string[]) => terms.some((t) => text.includes(t.toLowerCase()));

export function coverage(q: Pick<InterviewQuestion, 'keyPoints'>, text: string) {
  const lower = ` ${text.toLowerCase()} `;
  const hit = q.keyPoints.filter((k) => has(lower, k.terms));
  const miss = q.keyPoints.filter((k) => !has(lower, k.terms));
  return { hit, miss, ratio: q.keyPoints.length ? hit.length / q.keyPoints.length : 0 };
}

const level = (x: number): RubricLevel =>
  x >= 0.8 ? 'strong' : x >= 0.55 ? 'solid' : x >= 0.3 ? 'developing' : 'weak';

export function fixtureJudge(
  q: InterviewQuestion,
  answer: string,
  followUpAnswer = '',
): RoundJudgment {
  const text = `${answer}\n${followUpAnswer}`;
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 3).length;
  const { hit, miss, ratio } = coverage(q, text);
  const complexityTerms =
    /o\([^)]*\)|linear|logarithmic|quadratic|constant time|time complexity|space complexity/;
  const edgeTerms =
    /edge case|empty|null|zero|negative|duplicate|overflow|single element|boundary|k = 0|k=0/;

  const scores: Record<InterviewDimension, number> = {
    understanding: Math.min(
      1,
      (words >= 25 ? 0.4 : words / 60) +
        (hit.length > 0 ? 0.3 : 0) +
        (/assume|clarif|constraint|input|output/.test(lower) ? 0.3 : 0),
    ),
    approach: ratio,
    complexity:
      q.kind === 'behavioral'
        ? Math.min(1, ratio + 0.1)
        : complexityTerms.test(lower)
          ? hit.some((h) => /o\(|log|linear/i.test(h.label))
            ? 0.9
            : 0.6
          : 0.15,
    communication: Math.min(
      1,
      (words >= 40 && words <= 320 ? 0.55 : words >= 20 ? 0.35 : 0.1) +
        Math.min(0.45, sentences * 0.08),
    ),
    edge_cases: edgeTerms.test(lower)
      ? followUpAnswer.trim()
        ? 0.85
        : 0.65
      : followUpAnswer.trim().length > 30
        ? 0.4
        : 0.15,
  };

  const levels = INTERVIEW_DIMENSIONS.map((d) => ({
    dimension: d,
    level: level(scores[d]),
    justification: justify(d, scores[d], {
      hit: hit.map((h) => h.label),
      miss: miss.map((m) => m.label),
      words,
    }),
  }));
  return {
    levels,
    strengths: hit.slice(0, 3).map((h) => `You covered: ${h.label.toLowerCase()}.`),
    improvements: miss.slice(0, 3).map((m) => `Bring in: ${m.label.toLowerCase()}.`),
  };
}

function justify(
  d: InterviewDimension,
  s: number,
  c: { hit: string[]; miss: string[]; words: number },
): string {
  switch (d) {
    case 'understanding':
      return s >= 0.55
        ? 'Restated the problem and worked from the constraints.'
        : 'Jumped in without pinning down inputs, outputs or constraints.';
    case 'approach':
      return c.hit.length
        ? `Covered ${c.hit.length} of ${c.hit.length + c.miss.length} key ideas (${c.hit.join(', ')}).`
        : 'The core idea of a strong solution did not come through.';
    case 'complexity':
      return s >= 0.55 ? 'Stated time/space complexity.' : 'No clear time or space complexity.';
    case 'communication':
      return c.words < 40
        ? `Very short answer (${c.words} words) — think out loud more.`
        : 'Structured and easy to follow.';
    case 'edge_cases':
      return s >= 0.55 ? 'Discussed edge cases.' : 'Edge cases were not addressed.';
  }
}

/** Follow-up: probe the most important missing key point, else the authored follow-up. */
export function fixtureFollowUp(q: InterviewQuestion, answer: string): string {
  const { miss } = coverage(q, answer);
  if (miss.length && miss[0]!.label.toLowerCase().includes('complex'))
    return 'What are the time and space complexities of your approach?';
  if (miss.some((m) => /edge/i.test(m.label)))
    return `Good. ${q.followUps[0] ?? 'Which edge cases would break a naive version?'} And which edge cases would you test first?`;
  return q.followUps[0] ?? 'Can you do better?';
}

export function fixtureExplanation(
  keyPoints: string[],
  answer: string,
): { level: RubricLevel; covered: string[]; missing: string[] } {
  const lower = answer.toLowerCase();
  const covered = keyPoints.filter(
    (k) =>
      lower.includes(k.toLowerCase().replace(/[()]/g, '').split(' ')[0]!) ||
      lower.includes(k.toLowerCase()),
  );
  const missing = keyPoints.filter((k) => !covered.includes(k));
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const ratio = keyPoints.length ? covered.length / keyPoints.length : 0;
  return { level: level(words < 15 ? Math.min(ratio, 0.3) : ratio), covered, missing };
}
