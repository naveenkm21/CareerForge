import { describe, expect, it } from 'vitest';
import { computeReadiness, gatedMastery, rollUp, type ReadinessSkillInput } from './readiness';
import {
  confidenceOf,
  decay,
  difficultyGain,
  PRIOR,
  projectSkills,
  replaySkill,
  type EvidenceInput,
} from './mastery';
import { computeStreak, computeXp, earnedBadges, studyDay } from './gamification';
import {
  planDay,
  prioritize,
  weakestUnmetPrereq,
  type CatalogItem,
  type PlannerInput,
} from './planner';
import { extractSkills, interviewPillar, jobFit, scoreResume } from '../career';

const DAY = 86_400_000;
const t0 = new Date('2026-09-01T10:00:00Z');
let n = 0;
const ev = (over: Partial<EvidenceInput> & { daysAfter?: number }): EvidenceInput => ({
  id: `e${n++}`,
  skillId: 's',
  kind: 'submission.judged',
  outcome: 1,
  difficulty: 0.5,
  occurredAt: new Date(t0.getTime() + (over.daysAfter ?? 0) * DAY),
  ...over,
});

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

describe('mastery (Beta posterior)', () => {
  it('no evidence → prior, zero confidence, untouched', () => {
    const p = replaySkill('s', [], t0);
    expect(p.mastery).toBeCloseTo(PRIOR.alpha0 / (PRIOR.alpha0 + PRIOR.beta0));
    expect(p.confidence).toBe(0);
    expect(p.status).toBe('untouched');
  });

  it('property: mastery and confidence stay within [0, 1] for random streams', () => {
    const r = rng(9);
    for (let k = 0; k < 200; k++) {
      const events = Array.from({ length: 1 + Math.floor(r() * 30) }, (_, i) =>
        ev({
          outcome: r(),
          difficulty: r(),
          daysAfter: i * r() * 5,
          kind: ['submission.judged', 'checkpoint.answered', 'question.answered'][
            Math.floor(r() * 3)
          ]!,
        }),
      );
      const p = replaySkill('s', events, new Date(t0.getTime() + 200 * DAY));
      expect(p.mastery).toBeGreaterThan(0);
      expect(p.mastery).toBeLessThan(1);
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThan(1);
    }
  });

  it('property: a wrong answer never raises mastery; a right one never lowers it', () => {
    const r = rng(3);
    for (let k = 0; k < 200; k++) {
      const history = Array.from({ length: Math.floor(r() * 8) }, () => ev({ outcome: r() }));
      const before = replaySkill('s', history, t0).mastery;
      expect(
        replaySkill('s', [...history, ev({ outcome: 0, difficulty: r() })], t0).mastery,
      ).toBeLessThanOrEqual(before + 1e-12);
      expect(
        replaySkill('s', [...history, ev({ outcome: 1, difficulty: r() })], t0).mastery,
      ).toBeGreaterThanOrEqual(before - 1e-12);
    }
  });

  it('hard-correct moves more than easy-correct; easy-wrong hurts more than hard-wrong', () => {
    expect(difficultyGain(1, 1)).toBeGreaterThan(difficultyGain(0, 1));
    expect(difficultyGain(0, 0)).toBeGreaterThan(difficultyGain(1, 0));
  });

  it('submissions prove more than lesson views', () => {
    const sub = replaySkill('s', [ev({ kind: 'submission.judged' })], t0).mastery;
    const view = replaySkill('s', [ev({ kind: 'lesson.viewed' })], t0).mastery;
    expect(sub).toBeGreaterThan(view);
  });

  it('property: decay is monotone toward the prior and erodes confidence', () => {
    const strong = { alpha: 12, beta: 2 };
    let prev = strong;
    for (const days of [1, 10, 30, 90, 365]) {
      const d = decay(strong.alpha, strong.beta, days);
      expect(d.alpha / (d.alpha + d.beta)).toBeLessThanOrEqual(
        prev.alpha / (prev.alpha + prev.beta),
      );
      prev = d;
    }
    expect(confidenceOf(prev.alpha, prev.beta)).toBeLessThan(
      confidenceOf(strong.alpha, strong.beta),
    );
  });

  it('stale status and a review date appear after a long gap', () => {
    const events = Array.from({ length: 6 }, (_, i) => ev({ daysAfter: i }));
    const fresh = replaySkill('s', events, new Date(t0.getTime() + 6 * DAY));
    const later = replaySkill('s', events, new Date(t0.getTime() + 200 * DAY));
    expect(fresh.status).not.toBe('stale');
    expect(later.status).toBe('stale');
    expect(fresh.nextReviewAt!.getTime()).toBeGreaterThan(t0.getTime());
  });

  it('replay is deterministic regardless of input order (recomputeUser invariant)', () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      ev({ daysAfter: i * 2, outcome: i % 3 === 0 ? 0 : 1, skillId: i % 2 ? 'a' : 'b' }),
    );
    const now = new Date(t0.getTime() + 40 * DAY);
    const a = projectSkills(events, now);
    const b = projectSkills([...events].reverse(), now);
    const sorted = (m: typeof a) => [...m.entries()].sort(([x], [y]) => x.localeCompare(y));
    expect(sorted(b)).toEqual(sorted(a));
  });

  it('integrity penalties shrink the update', () => {
    const clean = replaySkill('s', [ev({})], t0).mastery;
    const hinted = replaySkill('s', [ev({ meta: { hintsUsed: 1 } })], t0).mastery;
    const peeked = replaySkill('s', [ev({ meta: { solutionViewed: true } })], t0).mastery;
    expect(clean).toBeGreaterThan(hinted);
    expect(hinted).toBeGreaterThan(peeked);
  });

  it('an AI-reviewed solve counts half of an executed one', () => {
    const judged = replaySkill('s', [ev({})], t0);
    const reviewed = replaySkill('s', [ev({ meta: { aiReviewed: true } })], t0);
    expect(reviewed.mastery).toBeLessThan(judged.mastery);
    expect(reviewed.mastery).toBeGreaterThan(replaySkill('s', [], t0).mastery);
  });
});

describe('gating, roll-up and readiness', () => {
  const strong = (id: string) =>
    replaySkill(
      id,
      Array.from({ length: 10 }, (_, i) => ev({ skillId: id, daysAfter: i * 0.1 })),
      t0,
    );
  const weak = (id: string) =>
    replaySkill(
      id,
      Array.from({ length: 6 }, () => ev({ skillId: id, outcome: 0 })),
      t0,
    );

  it('a skill cannot outrun its prerequisites', () => {
    const states = new Map([
      ['dijkstra', strong('dijkstra')],
      ['heaps', weak('heaps')],
    ]);
    const g = gatedMastery('dijkstra', states, (id) => (id === 'dijkstra' ? ['heaps'] : []));
    expect(g.effective).toBeLessThan(states.get('dijkstra')!.mastery);
    expect(g.cap?.by).toBe('heaps');
  });

  it('roll-up is capped by coverage', () => {
    const full = rollUp([
      { mastery: 0.9, confidence: 0.9, weight: 1 },
      { mastery: 0.9, confidence: 0.9, weight: 1 },
    ])!;
    const partial = rollUp([
      { mastery: 0.9, confidence: 0.9, weight: 1 },
      { mastery: 0.9, confidence: 0.1, weight: 1 },
    ])!;
    expect(partial).toBeLessThan(full);
  });

  const skills: ReadinessSkillInput[] = [
    {
      skillId: 'arrays',
      slug: 'dsa.arrays',
      name: 'Arrays',
      domain: 'dsa',
      tier: 'core',
      weight: 1,
      target: 0.8,
    },
    {
      skillId: 'graphs',
      slug: 'dsa.graphs',
      name: 'Graphs',
      domain: 'dsa',
      tier: 'core',
      weight: 1,
      target: 0.7,
    },
    {
      skillId: 'os',
      slug: 'cs.os',
      name: 'OS',
      domain: 'cs',
      tier: 'strong',
      weight: 1,
      target: 0.6,
    },
  ];

  it('no evidence → 0, with every pillar unmeasured', () => {
    const r = computeReadiness({
      roleSlug: 'sde',
      skills,
      states: new Map(),
      prereqsOf: () => [],
      resumeScore: null,
      interviewScore: null,
    });
    expect(r.overall).toBe(0);
    expect(Object.values(r.pillars).every((v) => v === null)).toBe(true);
  });

  it('property: a core blocker always caps readiness at 0.70', () => {
    const states = new Map([
      ['arrays', strong('arrays')],
      ['os', strong('os')],
      ['graphs', weak('graphs')],
    ]);
    const r = computeReadiness({
      roleSlug: 'sde',
      skills,
      states,
      prereqsOf: () => [],
      resumeScore: 1,
      interviewScore: 1,
    });
    expect(r.blockers.map((b) => b.skillId)).toContain('graphs');
    expect(r.overall).toBeLessThanOrEqual(0.7);
  });

  it('exceeding a target never compensates for another skill', () => {
    const states = new Map([['arrays', strong('arrays')]]);
    const r = computeReadiness({
      roleSlug: 'sde',
      skills,
      states,
      prereqsOf: () => [],
      resumeScore: null,
      interviewScore: null,
    });
    expect(r.pillars.dsa).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it('the explanation tree sums back to the headline (before caps)', () => {
    const states = new Map([
      ['arrays', strong('arrays')],
      ['graphs', strong('graphs')],
      ['os', strong('os')],
    ]);
    const r = computeReadiness({
      roleSlug: 'sde',
      skills,
      states,
      prereqsOf: () => [],
      resumeScore: 0.6,
      interviewScore: 0.7,
    });
    const sum = r.explanation.contributors.reduce((s, c) => s + (c.value ?? 0) * c.weight, 0);
    expect(r.overall).toBeCloseTo(sum);
    expect(
      r.explanation.contributors.find((c) => c.key === 'pillar:dsa')!.contributors,
    ).toHaveLength(2);
  });
});

describe('planner', () => {
  const s = (id: string, m: number) => ({
    ...replaySkill(id, [], t0),
    mastery: m,
    evidenceCount: 3,
    confidence: 0.6,
  });
  const prereqs: Record<string, string[]> = { dijkstra: ['heaps'], heaps: ['trees'], trees: [] };
  const base = (states: Map<string, ReturnType<typeof s>>): PlannerInput => {
    const catalog = new Map<string, CatalogItem[]>(
      ['dijkstra', 'heaps', 'trees', 'arrays'].map((id) => [
        id,
        [
          { kind: 'visualize', refId: `viz-${id}`, title: `Viz ${id}`, href: '#', minutes: 15 },
          {
            kind: 'practice',
            refId: `p1-${id}`,
            title: `P1 ${id}`,
            href: '#',
            minutes: 20,
            difficulty: 2,
          },
        ],
      ]),
    );
    catalog.set('*', [{ kind: 'interview', refId: 'mock', title: 'Mock', href: '#', minutes: 30 }]);
    return {
      requirements: [
        { skillId: 'dijkstra', name: 'Dijkstra', tier: 'core', weight: 1, target: 0.7 },
        { skillId: 'arrays', name: 'Arrays', tier: 'core', weight: 0.5, target: 0.8 },
      ],
      states,
      prereqsOf: (id) => prereqs[id] ?? [],
      nameOf: (id) => id,
      catalog,
      completed: new Set(),
      completedToday: new Set(),
      dailyMinutes: 60,
      now: t0,
      weekday: 2,
      readiness: 0.4,
    };
  };

  it('routes a gap to the weakest unmet prerequisite, not the weakest leaf', () => {
    const states = new Map([
      ['dijkstra', s('dijkstra', 0.3)],
      ['heaps', s('heaps', 0.2)],
      ['trees', s('trees', 0.1)],
    ]);
    expect(weakestUnmetPrereq('dijkstra', base(states))).toBe('trees');
    expect(prioritize(base(states))[0]).toMatchObject({
      skillId: 'trees',
      reasonCode: 'WEAKEST_PREREQ',
      via: 'dijkstra',
    });
  });

  it('fits the daily budget and gives every item a reason code', () => {
    const states = new Map([
      ['dijkstra', s('dijkstra', 0.3)],
      ['heaps', s('heaps', 0.6)],
      ['trees', s('trees', 0.6)],
    ]);
    const plan = planDay(base(states));
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.reduce((m, i) => m + i.minutes, 0)).toBeLessThanOrEqual(60 * 1.15);
    expect(plan.every((i) => i.reasonCode)).toBe(true);
  });

  it('is deterministic', () => {
    const states = new Map([['dijkstra', s('dijkstra', 0.3)]]);
    expect(planDay(base(states))).toEqual(planDay(base(states)));
  });

  it('adds a mock interview at weekends', () => {
    const plan = planDay({ ...base(new Map()), weekday: 6, dailyMinutes: 120 });
    expect(plan.some((i) => i.kind === 'interview')).toBe(true);
  });
});

describe('XP, streaks, badges', () => {
  const tz = 'Asia/Kolkata';
  const x = (over: Partial<Parameters<typeof computeXp>[0][number]>) => ({
    id: `x${n++}`,
    skillId: 's',
    kind: 'submission.judged',
    sourceType: 'submission',
    sourceId: `sub${n}`,
    outcome: 1,
    difficulty: 0.5,
    occurredAt: t0,
    meta: { problemId: 'p1' },
    ...over,
  });

  it('re-solving a problem earns 20%, and the first solve of the day is a bonus once', () => {
    const entries = computeXp([x({}), x({ occurredAt: new Date(t0.getTime() + 1000) })], tz);
    const solved = entries.filter((e) => e.reasonCode === 'PROBLEM_SOLVED');
    const resolved = entries.filter((e) => e.reasonCode === 'PROBLEM_RESOLVED');
    expect(solved).toHaveLength(1);
    expect(resolved[0]!.amount).toBe(Math.round(solved[0]!.amount * 0.2));
    expect(entries.filter((e) => e.reasonCode === 'FIRST_SOLVE_OF_DAY')).toHaveLength(1);
  });

  it('caps XP per skill per day (anti-farming)', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      x({ meta: { problemId: `p${i}` }, difficulty: 1 }),
    );
    const perSkill = computeXp(many, tz)
      .filter((e) => e.sourceType !== 'day')
      .reduce((s, e) => s + e.amount, 0);
    expect(perSkill).toBeLessThanOrEqual(300);
  });

  it('XP entries are unique per idempotency key', () => {
    const entries = computeXp(
      [
        x({}),
        x({ kind: 'lesson.viewed', sourceType: 'lesson', sourceId: 'L1' }),
        x({ kind: 'lesson.viewed', sourceType: 'lesson', sourceId: 'L1' }),
      ],
      tz,
    );
    const keys = entries.map((e) => `${e.reasonCode}|${e.sourceType}|${e.sourceId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('streak day boundary is 04:00 local', () => {
    // 01:30 IST on the 2nd still counts as the 1st.
    expect(studyDay(new Date('2026-09-01T20:00:00Z'), tz)).toBe('2026-09-01');
  });

  it('counts current and longest streaks', () => {
    const days = [0, 1, 2, 5, 6].map((d) => x({ occurredAt: new Date(t0.getTime() + d * DAY) }));
    const s = computeStreak(days, tz, new Date(t0.getTime() + 6 * DAY));
    expect(s).toEqual({ current: 2, longest: 3, activeToday: true });
    expect(computeStreak(days, tz, new Date(t0.getTime() + 7 * DAY)).current).toBe(2);
    expect(computeStreak(days, tz, new Date(t0.getTime() + 8 * DAY)).current).toBe(0);
  });

  it('badges are declarative', () => {
    const slugs = earnedBadges({
      evidenceCount: 5,
      distinctSolved: 12,
      longestStreak: 8,
      interviewsCompleted: 0,
      battlesWon: 0,
      readiness: 0.5,
      masteryBySlug: { 'dsa.arrays': 0.8 },
    });
    expect(slugs).toEqual(
      expect.arrayContaining(['first-steps', 'ten-problems', 'streak-7', 'array-master']),
    );
    expect(slugs).not.toContain('interview-ready');
  });
});

describe('career scoring', () => {
  it('extracts skills with evidence snippets', () => {
    const m = extractSkills(
      'Built a React dashboard with Redis caching; solved 300 DP problems using BFS/DFS.',
    );
    const slugs = m.map((x) => x.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'dev.web.react',
        'dev.backend.caching',
        'dsa.dp.1d',
        'dsa.graphs.traversal',
      ]),
    );
    expect(m.find((x) => x.slug === 'dev.web.react')!.snippet).toContain('React');
    expect(slugs).not.toContain('dev.web.nextjs');
  });

  it('scores a resume with visible checks', () => {
    const text = `Experience\n- Cut p95 latency by 40% with Redis\n- Shipped 3 features\nProjects\n- CareerForge\nEducation\nB.Tech\nSkills\nC++, SQL`;
    const r = scoreResume(text, ['cs.dbms.sql', 'dsa.graphs.traversal'], new Set(['cs.dbms.sql']));
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.checks.find((c) => c.key === 'quantified')!.passed).toBe(true);
    expect(r.checks.find((c) => c.key === 'length')!.passed).toBe(false);
  });

  it('job fit weights by importance and flags gaps', () => {
    const fit = jobFit(
      [
        { skillId: 'a', importance: 1 },
        { skillId: 'b', importance: 0.5 },
      ],
      (id) => (id === 'a' ? 0.8 : null),
    );
    expect(fit.rows[0]).toMatchObject({ skillId: 'a', status: 'ready' });
    expect(fit.rows[1]!.status).toBe('unmeasured');
    expect(fit.score).toBeCloseTo(1 / 1.5);
  });

  it('interview pillar averages the last three sessions', () => {
    const s = (d: number, scores: number[]) => ({
      endedAt: new Date(t0.getTime() + d * DAY),
      scores,
    });
    expect(interviewPillar([s(0, [1]), s(1, [7]), s(2, [7]), s(3, [7])])).toBeCloseTo(0.7);
    expect(interviewPillar([])).toBeNull();
  });
});
