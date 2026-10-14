/**
 * Mastery as a Beta posterior with decay (docs/04 §1). Pure: the caller supplies events and
 * `now`. Replaying the same events always yields the same state — which is what makes
 * `recomputeUser` safe and `/explain` honest.
 */

export const RUBRIC_VERSION = 1;
export const PRIOR = { alpha0: 1.2, beta0: 2.8 } as const;
export const PRIOR_MASTERY = PRIOR.alpha0 / (PRIOR.alpha0 + PRIOR.beta0);
export const TAU_DAYS = 45;
const DAY_MS = 86_400_000;

export const KIND_WEIGHTS: Record<string, number> = {
  'lesson.viewed': 0.15,
  'lesson.explored': 0.3,
  'trace.completed': 0.4,
  'checkpoint.answered': 0.8,
  'question.answered': 1.0,
  'submission.judged': 2.5,
  'assessment.completed': 2.0,
  'explanation.scored': 1.2,
  'interview.scored': 1.8,
  'battle.result': 1.0,
  'project.reviewed': 2.0,
  'resume.claimed': 0.3,
};

export type EvidenceInput = {
  id: string;
  skillId: string;
  kind: string;
  outcome: number;
  difficulty: number;
  occurredAt: Date;
  meta?: {
    hintsUsed?: number;
    attempt?: number;
    solutionViewed?: boolean;
    /** Judged by an AI reviewer that read the code but did not run it. */
    aiReviewed?: boolean;
  } & Record<string, unknown>;
};

export type SkillStatus = 'untouched' | 'learning' | 'practicing' | 'strong' | 'stale';

export type Contribution = {
  eventId: string;
  kind: string;
  at: string;
  delta: number;
  weight: number;
};

export type SkillProjection = {
  skillId: string;
  alpha: number;
  beta: number;
  mastery: number;
  confidence: number;
  status: SkillStatus;
  evidenceCount: number;
  lastEvidenceAt: Date | null;
  nextReviewAt: Date | null;
  contributions: Contribution[];
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Asymmetric: hard-correct and easy-wrong are informative; easy-correct proves little. */
export function difficultyGain(difficulty: number, outcome: number): number {
  const d = clamp01(difficulty);
  return outcome >= 0.5 ? 0.4 + 1.2 * d : 1.6 - 1.2 * d;
}

export function integrity(meta: EvidenceInput['meta']): number {
  if (!meta) return 1;
  if (meta.solutionViewed) return 0.25;
  let f = 1;
  if ((meta.hintsUsed ?? 0) > 0) f *= 0.7;
  // An AI review is an estimate, not an execution: it counts for half.
  if (meta.aiReviewed) f *= 0.5;
  const attempt = meta.attempt ?? 1;
  if (attempt === 2) f *= 0.8;
  else if (attempt >= 3) f *= 0.6;
  return f;
}

export function eventWeight(e: EvidenceInput): number {
  return (
    (KIND_WEIGHTS[e.kind] ?? 0.5) * difficultyGain(e.difficulty, e.outcome) * integrity(e.meta)
  );
}

export function masteryOf(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

export function confidenceOf(alpha: number, beta: number): number {
  const nEff = Math.max(0, alpha + beta - (PRIOR.alpha0 + PRIOR.beta0));
  return 1 - Math.exp(-nEff / 6);
}

/** Pulls the posterior back toward the prior by exp(-gap / TAU). */
export function decay(
  alpha: number,
  beta: number,
  gapDays: number,
): { alpha: number; beta: number } {
  if (gapDays <= 0) return { alpha, beta };
  const k = Math.exp(-gapDays / TAU_DAYS);
  return {
    alpha: PRIOR.alpha0 + (alpha - PRIOR.alpha0) * k,
    beta: PRIOR.beta0 + (beta - PRIOR.beta0) * k,
  };
}

/** Date at which decayed confidence drops below 0.5, i.e. when a review is due. */
export function nextReviewAt(alpha: number, beta: number, last: Date): Date {
  const nEff = alpha + beta - (PRIOR.alpha0 + PRIOR.beta0);
  const threshold = 6 * Math.LN2; // n_eff at which confidence = 0.5
  if (nEff <= threshold) return last;
  const gapDays = -TAU_DAYS * Math.log(threshold / nEff);
  return new Date(last.getTime() + gapDays * DAY_MS);
}

export function statusFor(p: {
  evidenceCount: number;
  mastery: number;
  confidence: number;
  daysSince: number;
}): SkillStatus {
  if (p.evidenceCount === 0) return 'untouched';
  if (p.daysSince > 30 && p.confidence < 0.5) return 'stale';
  if (p.mastery >= 0.75 && p.confidence >= 0.5) return 'strong';
  if (p.mastery >= 0.5) return 'practicing';
  return 'learning';
}

/**
 * Replays one skill's events in time order, decaying across the gaps between them and once
 * more up to `now`. Records each event's effect on mastery for the explanation tree.
 */
export function replaySkill(skillId: string, events: EvidenceInput[], now: Date): SkillProjection {
  const sorted = [...events].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id),
  );
  let alpha: number = PRIOR.alpha0;
  let beta: number = PRIOR.beta0;
  let last: Date | null = null;
  const contributions: Contribution[] = [];

  for (const e of sorted) {
    if (last)
      ({ alpha, beta } = decay(alpha, beta, (e.occurredAt.getTime() - last.getTime()) / DAY_MS));
    const before = masteryOf(alpha, beta);
    const w = eventWeight(e);
    const o = clamp01(e.outcome);
    alpha += w * o;
    beta += w * (1 - o);
    contributions.push({
      eventId: e.id,
      kind: e.kind,
      at: e.occurredAt.toISOString(),
      delta: masteryOf(alpha, beta) - before,
      weight: w,
    });
    last = e.occurredAt;
  }

  const review = last ? nextReviewAt(alpha, beta, last) : null;
  const daysSince = last ? (now.getTime() - last.getTime()) / DAY_MS : 0;
  if (last) ({ alpha, beta } = decay(alpha, beta, daysSince));
  const mastery = masteryOf(alpha, beta);
  const confidence = confidenceOf(alpha, beta);
  return {
    skillId,
    alpha,
    beta,
    mastery,
    confidence,
    status: statusFor({ evidenceCount: sorted.length, mastery, confidence, daysSince }),
    evidenceCount: sorted.length,
    lastEvidenceAt: last,
    nextReviewAt: review,
    contributions,
  };
}

/** Groups events by skill and replays each. */
export function projectSkills(events: EvidenceInput[], now: Date): Map<string, SkillProjection> {
  const bySkill = new Map<string, EvidenceInput[]>();
  for (const e of events) bySkill.set(e.skillId, [...(bySkill.get(e.skillId) ?? []), e]);
  const out = new Map<string, SkillProjection>();
  for (const [skillId, list] of bySkill) out.set(skillId, replaySkill(skillId, list, now));
  return out;
}
