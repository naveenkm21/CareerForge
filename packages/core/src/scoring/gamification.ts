/**
 * XP, streaks and badges (docs/04 §4). Derived from the same evidence rows as mastery, so they
 * can never disagree with it. Rules are data, evaluated in one place — no ad-hoc `+50` in a route.
 */

export type XpEvidence = {
  id: string;
  skillId: string;
  kind: string;
  sourceType: string;
  sourceId: string;
  outcome: number;
  difficulty: number;
  occurredAt: Date;
  meta?: Record<string, unknown>;
};

export type XpEntry = {
  amount: number;
  reasonCode: string;
  sourceType: string;
  sourceId: string;
  occurredAt: Date;
};

export const XP_RULES = {
  LESSON_COMPLETE: 20,
  CHECKPOINT_CORRECT: 5,
  QUESTION_CORRECT: 10,
  PROBLEM_SOLVED_PER_LEVEL: 50,
  RESOLVE_FACTOR: 0.2,
  FIRST_SOLVE_OF_DAY: 25,
  DAILY_STREAK: 10,
  MOCK_INTERVIEW: 150,
  BATTLE_WIN: 200,
  BATTLE_LOSS: 50,
  BADGE_EARNED: 75,
  DAILY_SKILL_CAP: 300,
} as const;

/** Local calendar day with a 04:00 boundary: nobody loses a streak for studying past midnight. */
export function studyDay(at: Date, timeZone: string): string {
  const shifted = new Date(at.getTime() - 4 * 3_600_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

export function computeXp(events: XpEvidence[], timeZone: string): XpEntry[] {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const out: XpEntry[] = [];
  const solved = new Set<string>();
  const firstSolveDays = new Set<string>();
  const seenSources = new Set<string>();
  const perSkillDay = new Map<string, number>();

  const add = (
    e: XpEvidence,
    amount: number,
    reasonCode: string,
    sourceId = e.sourceId,
    sourceType = e.sourceType,
  ) => {
    const key = `${e.skillId}|${studyDay(e.occurredAt, timeZone)}`;
    const used = perSkillDay.get(key) ?? 0;
    const granted = Math.max(0, Math.min(amount, XP_RULES.DAILY_SKILL_CAP - used));
    if (granted <= 0) return;
    perSkillDay.set(key, used + granted);
    out.push({
      amount: Math.round(granted),
      reasonCode,
      sourceType,
      sourceId,
      occurredAt: e.occurredAt,
    });
  };

  for (const e of sorted) {
    const once = `${e.kind}|${e.sourceType}|${e.sourceId}`;
    switch (e.kind) {
      case 'lesson.viewed':
        if (!seenSources.has(once)) add(e, XP_RULES.LESSON_COMPLETE, 'LESSON_COMPLETE');
        break;
      case 'checkpoint.answered':
        if (e.outcome >= 1)
          add(e, XP_RULES.CHECKPOINT_CORRECT, 'CHECKPOINT_CORRECT', e.id, 'evidence');
        break;
      case 'question.answered':
        if (e.outcome >= 1 && !seenSources.has(once))
          add(e, XP_RULES.QUESTION_CORRECT, 'QUESTION_CORRECT');
        break;
      case 'submission.judged': {
        if (e.outcome < 1) break;
        const problem = String(e.meta?.problemId ?? e.sourceId);
        const level = Math.round(e.difficulty * 4) + 1;
        const base = XP_RULES.PROBLEM_SOLVED_PER_LEVEL * level;
        add(
          e,
          solved.has(problem) ? base * XP_RULES.RESOLVE_FACTOR : base,
          solved.has(problem) ? 'PROBLEM_RESOLVED' : 'PROBLEM_SOLVED',
          e.id,
          'evidence',
        );
        solved.add(problem);
        const day = studyDay(e.occurredAt, timeZone);
        if (!firstSolveDays.has(day)) {
          firstSolveDays.add(day);
          add(e, XP_RULES.FIRST_SOLVE_OF_DAY, 'FIRST_SOLVE_OF_DAY', day, 'day');
        }
        break;
      }
      case 'interview.scored':
        if (!seenSources.has(`interview|${e.sourceId}`)) {
          seenSources.add(`interview|${e.sourceId}`);
          out.push({
            amount: XP_RULES.MOCK_INTERVIEW,
            reasonCode: 'MOCK_INTERVIEW',
            sourceType: e.sourceType,
            sourceId: e.sourceId,
            occurredAt: e.occurredAt,
          });
        }
        break;
      case 'battle.result':
        add(
          e,
          e.outcome >= 1 ? XP_RULES.BATTLE_WIN : XP_RULES.BATTLE_LOSS,
          e.outcome >= 1 ? 'BATTLE_WIN' : 'BATTLE_PLAYED',
        );
        break;
    }
    seenSources.add(once);
  }

  for (const day of activeDays(events, timeZone)) {
    out.push({
      amount: XP_RULES.DAILY_STREAK,
      reasonCode: 'DAILY_STREAK',
      sourceType: 'day',
      sourceId: day,
      occurredAt: new Date(`${day}T12:00:00Z`),
    });
  }
  return out;
}

const GRADED = new Set([
  'checkpoint.answered',
  'question.answered',
  'submission.judged',
  'assessment.completed',
  'interview.scored',
  'battle.result',
  'explanation.scored',
]);

export function activeDays(
  events: Pick<XpEvidence, 'kind' | 'occurredAt'>[],
  timeZone: string,
): string[] {
  return [
    ...new Set(
      events.filter((e) => GRADED.has(e.kind)).map((e) => studyDay(e.occurredAt, timeZone)),
    ),
  ].sort();
}

const prevDay = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Current streak counts back from today, or from yesterday if today is not active yet. */
export function computeStreak(
  events: Pick<XpEvidence, 'kind' | 'occurredAt'>[],
  timeZone: string,
  now: Date,
): { current: number; longest: number; activeToday: boolean } {
  const days = activeDays(events, timeZone);
  const set = new Set(days);
  const today = studyDay(now, timeZone);
  const activeToday = set.has(today);
  let cursor = activeToday ? today : prevDay(today);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = prevDay(cursor);
  }
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && prevDay(d) === prev ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest, activeToday };
}

// ── Badges ─────────────────────────────────────────────────────────────────

export type BadgeInput = {
  evidenceCount: number;
  distinctSolved: number;
  longestStreak: number;
  interviewsCompleted: number;
  battlesWon: number;
  readiness: number;
  /** Rolled-up mastery by skill slug (e.g. 'dsa.graphs'). */
  masteryBySlug: Record<string, number>;
};

export type BadgeDef = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned: (i: BadgeInput) => boolean;
};

export const BADGES: BadgeDef[] = [
  {
    slug: 'first-steps',
    name: 'First Steps',
    description: 'Recorded your first piece of evidence',
    icon: 'footprints',
    earned: (i) => i.evidenceCount >= 1,
  },
  {
    slug: 'array-master',
    name: 'Array Master',
    description: 'Arrays & Strings mastery ≥ 75%',
    icon: 'brackets',
    earned: (i) => (i.masteryBySlug['dsa.arrays'] ?? 0) >= 0.75,
  },
  {
    slug: 'tree-explorer',
    name: 'Tree Explorer',
    description: 'Trees mastery ≥ 60%',
    icon: 'git-fork',
    earned: (i) => (i.masteryBySlug['dsa.trees'] ?? 0) >= 0.6,
  },
  {
    slug: 'graph-navigator',
    name: 'Graph Navigator',
    description: 'Graphs mastery ≥ 60%',
    icon: 'share-2',
    earned: (i) => (i.masteryBySlug['dsa.graphs'] ?? 0) >= 0.6,
  },
  {
    slug: 'ten-problems',
    name: 'Problem Solver',
    description: 'Solved 10 distinct problems',
    icon: 'check-check',
    earned: (i) => i.distinctSolved >= 10,
  },
  {
    slug: 'streak-7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: 'flame',
    earned: (i) => i.longestStreak >= 7,
  },
  {
    slug: 'streak-30',
    name: '30 Day Streak',
    description: '30-day streak',
    icon: 'flame',
    earned: (i) => i.longestStreak >= 30,
  },
  {
    slug: 'mock-interviewer',
    name: 'In the Hot Seat',
    description: 'Completed a mock interview',
    icon: 'mic',
    earned: (i) => i.interviewsCompleted >= 1,
  },
  {
    slug: 'battle-winner',
    name: 'Duelist',
    description: 'Won a 1v1 battle',
    icon: 'swords',
    earned: (i) => i.battlesWon >= 1,
  },
  {
    slug: 'interview-ready',
    name: 'Interview Ready',
    description: 'Readiness ≥ 75%',
    icon: 'badge-check',
    earned: (i) => i.readiness >= 0.75,
  },
];

export function earnedBadges(input: BadgeInput): string[] {
  return BADGES.filter((b) => b.earned(input)).map((b) => b.slug);
}
