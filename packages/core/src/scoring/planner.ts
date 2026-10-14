import type { RoleTier } from '@careerforge/contracts';
import { PRIOR_MASTERY, type SkillProjection } from './mastery';

/**
 * The deterministic planner (docs/04 §3, ADR-009). Every item carries an enum reason code;
 * the UI renders copy from the code, so "why is this here?" always has an honest answer.
 */

export type ReasonCode =
  | 'WEAKEST_PREREQ'
  | 'ROLE_GAP'
  | 'SPACED_REVIEW'
  | 'INTERVIEW_PRACTICE'
  | 'NEW_TOPIC';

export const REASON_COPY: Record<ReasonCode, string> = {
  WEAKEST_PREREQ: 'Unblocks a weaker skill your role needs',
  ROLE_GAP: 'Largest gap against your role target',
  SPACED_REVIEW: 'Your confidence here is decaying — review before it slips',
  INTERVIEW_PRACTICE: 'Pressure-test what you know',
  NEW_TOPIC: 'Next skill in prerequisite order',
};

export type PlannerRequirement = {
  skillId: string;
  name: string;
  tier: RoleTier;
  weight: number;
  target: number;
};

export type CatalogItem = {
  kind: 'lesson' | 'visualize' | 'practice' | 'interview';
  refId: string;
  title: string;
  href: string;
  minutes: number;
  /** 1..5 for practice items. */
  difficulty?: number;
};

export type PlanItem = CatalogItem & {
  skillId: string;
  skillName: string;
  reasonCode: ReasonCode;
  reasonDetail: string;
  done: boolean;
};

export type PlannerInput = {
  requirements: PlannerRequirement[];
  states: Map<string, SkillProjection>;
  prereqsOf: (skillId: string) => string[];
  nameOf: (skillId: string) => string;
  /** What can be scheduled per skill. */
  catalog: Map<string, CatalogItem[]>;
  /** refIds the user has already completed (solved problems, finished lessons). */
  completed: Set<string>;
  /** refIds completed today — shown as done rather than replaced. */
  completedToday: Set<string>;
  dailyMinutes: number;
  now: Date;
  /** Day of week in the user's timezone, 0 = Sunday. */
  weekday: number;
  readiness: number;
};

const TIER_MULT: Record<RoleTier, number> = { core: 1.5, strong: 1, nice: 0.5 };

const mastery = (states: Map<string, SkillProjection>, id: string) =>
  states.get(id)?.mastery ?? PRIOR_MASTERY;

/** Follows prerequisites down to the weakest unmet one (gating: never attack DP with broken recursion). */
export function weakestUnmetPrereq(
  skillId: string,
  input: Pick<PlannerInput, 'states' | 'prereqsOf'>,
  seen = new Set<string>(),
): string | null {
  let worst: { id: string; m: number } | null = null;
  for (const p of input.prereqsOf(skillId)) {
    if (seen.has(p)) continue;
    seen.add(p);
    const m = mastery(input.states, p);
    if (m < 0.5) {
      const deeper = weakestUnmetPrereq(p, input, seen) ?? p;
      const dm = mastery(input.states, deeper);
      if (!worst || dm < worst.m) worst = { id: deeper, m: dm };
    }
  }
  return worst?.id ?? null;
}

export type Priority = {
  skillId: string;
  score: number;
  reasonCode: ReasonCode;
  via: string | null;
};

export function prioritize(input: PlannerInput): Priority[] {
  const scores = new Map<string, Priority>();
  const bump = (p: Priority) => {
    const cur = scores.get(p.skillId);
    if (!cur || p.score > cur.score) scores.set(p.skillId, p);
    else cur.score += p.score * 0.25;
  };
  for (const r of input.requirements) {
    const gap =
      Math.max(0, r.target - mastery(input.states, r.skillId)) * r.weight * TIER_MULT[r.tier];
    if (gap <= 0) continue;
    const blocker = weakestUnmetPrereq(r.skillId, input);
    if (blocker)
      bump({ skillId: blocker, score: gap, reasonCode: 'WEAKEST_PREREQ', via: r.skillId });
    else
      bump({
        skillId: r.skillId,
        score: gap,
        reasonCode: input.states.has(r.skillId) ? 'ROLE_GAP' : 'NEW_TOPIC',
        via: null,
      });
  }
  return [...scores.values()].sort(
    (a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId),
  );
}

export function dueReviews(input: Pick<PlannerInput, 'states' | 'now'>): string[] {
  return [...input.states.values()]
    .filter(
      (s) =>
        s.evidenceCount > 0 && s.nextReviewAt && s.nextReviewAt <= input.now && s.mastery >= 0.4,
    )
    .sort((a, b) => a.nextReviewAt!.getTime() - b.nextReviewAt!.getTime())
    .map((s) => s.skillId);
}

/**
 * Builds today's plan: 1 new-learning item, 2–3 practice items, 1 review, and a mock interview
 * at weekends once readiness is meaningful. Greedy fit to the daily budget (±15%).
 */
export function planDay(input: PlannerInput): PlanItem[] {
  const priorities = prioritize(input);
  const items: PlanItem[] = [];
  const used = new Set<string>();
  const budget = input.dailyMinutes * 1.15;
  let minutes = 0;

  const detail = (p: Priority) =>
    p.via
      ? `${input.nameOf(p.skillId)} gates ${input.nameOf(p.via)}`
      : `${input.nameOf(p.skillId)} is ${Math.round(mastery(input.states, p.skillId) * 100)}% mastered`;

  const take = (
    skillId: string,
    kinds: CatalogItem['kind'][],
    reasonCode: ReasonCode,
    reasonDetail: string,
    preferUndone = true,
  ): boolean => {
    const options = (input.catalog.get(skillId) ?? []).filter(
      (c) => kinds.includes(c.kind) && !used.has(c.refId),
    );
    const pick =
      options.find((c) => input.completedToday.has(c.refId)) ??
      (preferUndone ? options.find((c) => !input.completed.has(c.refId)) : undefined) ??
      options[0];
    if (!pick) return false;
    if (minutes + pick.minutes > budget && items.length > 0) return false;
    used.add(pick.refId);
    minutes += pick.minutes;
    items.push({
      ...pick,
      skillId,
      skillName: input.nameOf(skillId),
      reasonCode,
      reasonDetail,
      done: input.completedToday.has(pick.refId),
    });
    return true;
  };

  // 1. One new-learning item for the top priority.
  for (const p of priorities)
    if (take(p.skillId, ['lesson', 'visualize'], p.reasonCode, detail(p))) break;
  // 2. Practice on the top priorities.
  let practice = 0;
  for (const p of priorities) {
    if (practice >= 3) break;
    if (take(p.skillId, ['practice'], p.reasonCode, detail(p))) practice++;
  }
  // 3. Spaced review driven by decay.
  for (const id of dueReviews(input)) {
    if (
      take(
        id,
        ['practice', 'visualize'],
        'SPACED_REVIEW',
        `Last practiced a while ago — confidence ${Math.round((input.states.get(id)?.confidence ?? 0) * 100)}%`,
        false,
      )
    )
      break;
  }
  // 4. Weekend mock interview once there is something to test.
  if ((input.weekday === 0 || input.weekday === 6) && input.readiness >= 0.3) {
    const interview = input.catalog.get('*')?.find((c) => c.kind === 'interview');
    if (interview && minutes + interview.minutes <= budget + 30) {
      items.push({
        ...interview,
        skillId: '*',
        skillName: 'Interview',
        reasonCode: 'INTERVIEW_PRACTICE',
        reasonDetail: REASON_COPY.INTERVIEW_PRACTICE,
        done: input.completedToday.has(interview.refId),
      });
    }
  }
  return items;
}
