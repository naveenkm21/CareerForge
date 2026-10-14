import type { RoleTier, SkillDomain } from '@careerforge/contracts';
import { PRIOR_MASTERY, RUBRIC_VERSION, type SkillProjection } from './mastery';

/**
 * Readiness: a transparent composite (docs/04 §2). Every number here comes with the tree of
 * contributors that produced it, so `/explain` can drill from the headline to single events.
 */

export type PillarKey = 'dsa' | 'fundamentals' | 'dev' | 'projects' | 'resume' | 'interview';

export const PILLAR_LABELS: Record<PillarKey, string> = {
  dsa: 'DSA',
  fundamentals: 'CS Fundamentals',
  dev: 'Development',
  projects: 'Projects',
  resume: 'Resume',
  interview: 'Interview',
};

/** Weight vectors are data, versioned with the rubric. A new role is a data change. */
export const PILLAR_WEIGHTS: Record<string, Record<PillarKey, number>> = {
  sde: { dsa: 0.3, fundamentals: 0.18, dev: 0.15, projects: 0.12, resume: 0.1, interview: 0.15 },
  frontend: {
    dsa: 0.12,
    fundamentals: 0.08,
    dev: 0.38,
    projects: 0.17,
    resume: 0.1,
    interview: 0.15,
  },
  backend: { dsa: 0.2, fundamentals: 0.2, dev: 0.3, projects: 0.1, resume: 0.08, interview: 0.12 },
  'data-ml': {
    dsa: 0.15,
    fundamentals: 0.15,
    dev: 0.35,
    projects: 0.15,
    resume: 0.08,
    interview: 0.12,
  },
};

export const CORE_BLOCKER_THRESHOLD = 0.35;
export const CORE_BLOCKER_CAP = 0.7;

export type ReadinessSkillInput = {
  skillId: string;
  slug: string;
  name: string;
  domain: SkillDomain;
  tier: RoleTier;
  weight: number;
  target: number;
};

export type Explanation = {
  key: string;
  label: string;
  value: number | null;
  weight: number;
  detail?: string;
  href?: string;
  contributors: Explanation[];
  caps?: { reason: 'PREREQ' | 'CORE_BLOCKER' | 'COVERAGE'; by: string; amount: number }[];
};

export type ReadinessResult = {
  overall: number;
  pillars: Record<PillarKey, number | null>;
  blockers: { skillId: string; name: string; effective: number }[];
  explanation: Explanation;
  rubricVersion: number;
};

export function pillarOf(skill: Pick<ReadinessSkillInput, 'slug' | 'domain'>): PillarKey {
  if (skill.slug === 'dev.projects') return 'projects';
  if (skill.domain === 'dsa') return 'dsa';
  if (skill.domain === 'cs') return 'fundamentals';
  if (skill.domain === 'dev') return 'dev';
  return 'interview'; // soft skills are evidenced in interviews
}

/** Effective mastery after prerequisite gating (docs/04 §1.4). Unmeasured skills sit at the prior. */
export function gatedMastery(
  skillId: string,
  states: Map<string, SkillProjection>,
  prereqsOf: (skillId: string) => string[],
): { effective: number; cap: { by: string; amount: number } | null } {
  const own = states.get(skillId)?.mastery ?? PRIOR_MASTERY;
  let cap: { by: string; amount: number } | null = null;
  for (const p of prereqsOf(skillId)) {
    const pm = states.get(p)?.mastery ?? PRIOR_MASTERY;
    const c = 0.55 + 0.45 * pm;
    if (c < own && (!cap || c < own - cap.amount)) cap = { by: p, amount: own - c };
  }
  return { effective: cap ? own - cap.amount : own, cap };
}

export function computeReadiness(input: {
  roleSlug: string;
  skills: ReadinessSkillInput[];
  states: Map<string, SkillProjection>;
  prereqsOf: (skillId: string) => string[];
  resumeScore: number | null;
  interviewScore: number | null;
  nameOf?: (skillId: string) => string;
}): ReadinessResult {
  const weights = PILLAR_WEIGHTS[input.roleSlug] ?? PILLAR_WEIGHTS.sde!;
  const nameOf = input.nameOf ?? ((id: string) => id);
  const byPillar = new Map<PillarKey, Explanation[]>();
  const sums = new Map<PillarKey, { num: number; den: number; measured: number }>();
  const blockers: ReadinessResult['blockers'] = [];

  for (const s of input.skills) {
    const pillar = pillarOf(s);
    const state = input.states.get(s.skillId);
    const measured = (state?.evidenceCount ?? 0) > 0;
    const { effective, cap } = gatedMastery(s.skillId, input.states, input.prereqsOf);
    // No evidence, no credit: an unmeasured skill contributes 0, never the prior.
    const ratio = measured ? Math.min(1, effective / s.target) : 0;
    const acc = sums.get(pillar) ?? { num: 0, den: 0, measured: 0 };
    acc.num += s.weight * ratio;
    acc.den += s.weight;
    acc.measured += measured ? 1 : 0;
    sums.set(pillar, acc);
    if (s.tier === 'core' && (!measured || effective < CORE_BLOCKER_THRESHOLD)) {
      blockers.push({ skillId: s.skillId, name: s.name, effective: measured ? effective : 0 });
    }
    byPillar.set(pillar, [
      ...(byPillar.get(pillar) ?? []),
      {
        key: `skill:${s.skillId}`,
        label: s.name,
        value: measured ? ratio : null,
        weight: s.weight,
        detail: measured
          ? `effective ${pct(effective)} of target ${pct(s.target)} · ${state!.evidenceCount} evidence`
          : 'not measured yet',
        href: `/explain/skill/${s.skillId}`,
        contributors: [],
        ...(cap
          ? { caps: [{ reason: 'PREREQ' as const, by: nameOf(cap.by), amount: cap.amount }] }
          : {}),
      },
    ]);
  }

  const pillars = {} as Record<PillarKey, number | null>;
  for (const key of Object.keys(weights) as PillarKey[]) {
    if (key === 'resume') pillars[key] = input.resumeScore;
    else if (key === 'interview' && input.interviewScore !== null) {
      // Soft skills feed the interview pillar too; mock interviews dominate.
      const soft = sums.get('interview');
      const softScore = soft && soft.measured > 0 ? soft.num / soft.den : null;
      pillars[key] =
        softScore === null ? input.interviewScore : 0.75 * input.interviewScore + 0.25 * softScore;
    } else {
      const acc = sums.get(key);
      pillars[key] = acc && acc.measured > 0 ? acc.num / acc.den : null;
    }
  }

  let raw = 0;
  for (const key of Object.keys(weights) as PillarKey[]) raw += (pillars[key] ?? 0) * weights[key];
  const measuredBlockers = blockers.filter((b) => b.effective > 0 || input.states.has(b.skillId));
  const capped = blockers.length > 0 && raw > CORE_BLOCKER_CAP;
  const overall = capped ? CORE_BLOCKER_CAP : raw;

  const explanation: Explanation = {
    key: 'readiness',
    label: `Readiness`,
    value: overall,
    weight: 1,
    contributors: (Object.keys(weights) as PillarKey[]).map((key) => ({
      key: `pillar:${key}`,
      label: PILLAR_LABELS[key],
      value: pillars[key],
      weight: weights[key],
      detail:
        key === 'resume'
          ? 'from your latest resume analysis'
          : key === 'interview'
            ? 'rolling mean of recent mock-interview rubrics'
            : undefined,
      contributors: (byPillar.get(key) ?? []).sort((a, b) => (a.value ?? -1) - (b.value ?? -1)),
    })),
    ...(capped
      ? {
          caps: [
            {
              reason: 'CORE_BLOCKER' as const,
              by: (measuredBlockers[0] ?? blockers[0])!.name,
              amount: raw - CORE_BLOCKER_CAP,
            },
          ],
        }
      : {}),
  };

  return { overall, pillars, blockers, explanation, rubricVersion: RUBRIC_VERSION };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Parent mastery = coverage-capped weighted mean of children (docs/04 §1.3). */
export function rollUp(
  children: { mastery: number; confidence: number; weight: number }[],
): number | null {
  if (children.length === 0) return null;
  const den = children.reduce((s, c) => s + c.weight, 0);
  if (den === 0) return null;
  const raw = children.reduce((s, c) => s + c.weight * c.mastery, 0) / den;
  const coverage = children.filter((c) => c.confidence >= 0.4).length / children.length;
  return raw * (0.55 + 0.45 * coverage);
}
