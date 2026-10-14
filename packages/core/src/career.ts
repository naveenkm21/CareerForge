/**
 * Deterministic text → skill extraction for resumes and job descriptions, and the scores built
 * on it. Pure and explainable: every match carries the snippet that produced it. (An LLM may
 * later *propose* matches, but never the scores — ADR-006.)
 */

/** Keyword patterns per skill slug. Word-boundary matched, case-insensitive. */
export const SKILL_KEYWORDS: Record<string, string[]> = {
  'dsa.arrays.traversal': ['arrays?', 'strings?'],
  'dsa.arrays.two-pointers': ['two[- ]pointers?'],
  'dsa.arrays.sliding-window': ['sliding window'],
  'dsa.arrays.prefix-sum': ['prefix sums?'],
  'dsa.hashing': ['hash ?maps?', 'hash ?tables?', 'hashing'],
  'dsa.searching.binary-search': ['binary search'],
  'dsa.sorting.elementary': ['sorting'],
  'dsa.sorting.divide-conquer': ['merge ?sort', 'quick ?sort', 'divide and conquer'],
  'dsa.recursion': ['recursion', 'recursive'],
  'dsa.linked-lists': ['linked lists?'],
  'dsa.stacks-queues.stack': ['stacks?'],
  'dsa.stacks-queues.queue': ['queues?'],
  'dsa.trees.traversal': ['trees?', 'tree traversal'],
  'dsa.trees.bst': ['bst', 'binary search trees?'],
  'dsa.heaps': ['heaps?', 'priority queues?'],
  'dsa.graphs.traversal': ['graphs?', 'bfs', 'dfs'],
  'dsa.graphs.shortest-path': ['dijkstra', 'shortest paths?'],
  'dsa.graphs.topological-sort': ['topological sort'],
  'dsa.greedy': ['greedy'],
  'dsa.backtracking': ['backtracking'],
  'dsa.dp.1d': ['dynamic programming', '\\bdp\\b', 'memoi[sz]ation'],
  'dsa.dp.2d': ['dynamic programming'],
  'cs.oop': ['oop', 'object[- ]oriented'],
  'cs.os.scheduling': ['operating systems?', 'cpu scheduling', '\\bos\\b'],
  'cs.os.memory': ['memory management', 'paging'],
  'cs.os.concurrency': ['concurrency', 'multithreading', 'threads?', 'semaphores?', 'deadlocks?'],
  'cs.dbms.sql': ['sql', 'postgres(?:ql)?', 'mysql', 'databases?'],
  'cs.dbms.indexing': ['indexing', 'indexes', 'query optimi[sz]ation'],
  'cs.dbms.transactions': ['transactions?', 'acid'],
  'cs.dbms.normalization': ['normali[sz]ation'],
  'cs.networks.http-lifecycle': ['http', 'rest(?:ful)?', 'dns', 'tls'],
  'cs.networks.tcp': ['tcp(?:/ip)?', 'networking'],
  'dev.git': ['git', 'github'],
  'dev.web.html-css': ['html', 'css', 'tailwind'],
  'dev.web.javascript': ['javascript', 'typescript', '\\bjs\\b', '\\bts\\b'],
  'dev.web.react': ['react(?:\\.js)?'],
  'dev.web.nextjs': ['next\\.?js'],
  'dev.web.performance': ['web performance', 'core web vitals', 'lighthouse'],
  'dev.web.accessibility': ['accessibility', 'a11y', 'wcag'],
  'dev.backend.apis': [
    'apis?',
    'rest apis?',
    'graphql',
    'node(?:\\.js)?',
    'express',
    'spring',
    'django',
    'fastapi',
  ],
  'dev.backend.auth': ['authentication', 'oauth', 'jwt'],
  'dev.backend.caching': ['caching', 'redis', 'cdn'],
  'dev.backend.docker': ['docker', 'containers?', 'kubernetes', 'k8s'],
  'dev.backend.cloud': ['aws', 'gcp', 'azure', 'cloud'],
  'dev.data.python': ['python', 'numpy', 'pandas'],
  'dev.data.statistics': ['statistics', 'probability', 'hypothesis testing'],
  'dev.data.ml': [
    'machine learning',
    '\bml\b',
    'model training',
    'scikit-learn',
    'pytorch',
    'tensorflow',
  ],
  'dev.data.deployment': ['model deployment', 'mlops', 'model serving'],
  'dev.testing': ['testing', 'unit tests?', 'jest', 'vitest', 'playwright', 'cypress'],
  'dev.system-design': [
    'system design',
    'distributed systems?',
    'scalab(?:le|ility)',
    'microservices',
  ],
  'dev.projects': ['projects?'],
  'soft.communication': ['communication', 'presentations?', 'collaborat(?:e|ion)'],
  'soft.behavioral': ['leadership', 'mentor(?:ed|ing)?', 'ownership'],
};

export type SkillMatch = { slug: string; snippet: string; count: number };

/** Finds skill mentions with a short surrounding snippet as evidence. */
export function extractSkills(
  text: string,
  slugs: Iterable<string> = Object.keys(SKILL_KEYWORDS),
): SkillMatch[] {
  const out: SkillMatch[] = [];
  for (const slug of slugs) {
    const words = SKILL_KEYWORDS[slug];
    if (!words) continue;
    const re = new RegExp(`(?<![\\w-])(?:${words.join('|')})(?![\\w-])`, 'gi');
    const matches = [...text.matchAll(re)];
    if (matches.length === 0) continue;
    const m = matches[0]!;
    const start = Math.max(0, (m.index ?? 0) - 40);
    const end = Math.min(text.length, (m.index ?? 0) + m[0].length + 40);
    out.push({
      slug,
      snippet: `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`,
      count: matches.length,
    });
  }
  return out;
}

const SECTION_RE: Record<string, RegExp> = {
  experience: /^\s*(work\s+)?experience|^\s*employment|^\s*internships?/im,
  projects: /^\s*projects?/im,
  education: /^\s*education/im,
  skills: /^\s*(technical\s+)?skills/im,
};

export type ResumeCheck = {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;
};

/**
 * Resume pillar score: structure, quantified impact, and coverage of the role's core skills.
 * Every component is a named, visible check.
 */
export function scoreResume(
  text: string,
  coreSkillSlugs: string[],
  claimedSlugs: Set<string>,
): { score: number; checks: ResumeCheck[] } {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const bullets = text.split('\n').filter((l) => /^\s*[-•*▪]/.test(l));
  const quantified = bullets.filter((l) => /\d/.test(l)).length;
  const covered = coreSkillSlugs.filter((s) => claimedSlugs.has(s)).length;
  const coverage = coreSkillSlugs.length ? covered / coreSkillSlugs.length : 0;
  const checks: ResumeCheck[] = [
    ...Object.entries(SECTION_RE).map(([key, re]) => ({
      key: `section.${key}`,
      label: `Has a ${key} section`,
      passed: re.test(text),
      weight: 0.08,
      detail: re.test(text) ? 'found' : 'missing — ATS parsers look for it by name',
    })),
    {
      key: 'length',
      label: 'Length 250–900 words',
      passed: words >= 250 && words <= 900,
      weight: 0.1,
      detail: `${words} words`,
    },
    {
      key: 'quantified',
      label: 'Bullets quantify impact',
      passed: bullets.length > 0 && quantified / bullets.length >= 0.4,
      weight: 0.18,
      detail: `${quantified} of ${bullets.length} bullets contain a number`,
    },
    {
      key: 'coverage',
      label: 'Covers the role’s core skills',
      passed: coverage >= 0.5,
      weight: 0.4,
      detail: `${covered} of ${coreSkillSlugs.length} core skills mentioned`,
    },
  ];
  const structure = checks
    .filter((c) => c.key !== 'coverage')
    .reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = Math.min(1, structure + 0.4 * coverage);
  return { score, checks };
}

export type JobGapRow = {
  skillId: string;
  importance: number;
  mastery: number | null;
  target: number;
  status: 'ready' | 'close' | 'gap' | 'unmeasured';
};

/** Job fit = importance-weighted readiness across the job's skills. */
export function jobFit(
  jobSkills: { skillId: string; importance: number }[],
  masteryOf: (skillId: string) => number | null,
  target = 0.7,
): { score: number; rows: JobGapRow[] } {
  const rows: JobGapRow[] = jobSkills.map((j) => {
    const m = masteryOf(j.skillId);
    const status: JobGapRow['status'] =
      m === null ? 'unmeasured' : m >= target ? 'ready' : m >= target * 0.7 ? 'close' : 'gap';
    return { skillId: j.skillId, importance: j.importance, mastery: m, target, status };
  });
  const den = rows.reduce((s, r) => s + r.importance, 0);
  const score = den
    ? rows.reduce((s, r) => s + r.importance * Math.min(1, (r.mastery ?? 0) / target), 0) / den
    : 0;
  rows.sort((a, b) => b.importance - a.importance);
  return { score, rows };
}

// ── Interview rubric ───────────────────────────────────────────────────────

export type RubricLevel = 'weak' | 'developing' | 'solid' | 'strong';
/** The LLM (or the fixture judge) emits a level; this table — code — turns it into a number. */
export const LEVEL_SCORES: Record<RubricLevel, number> = {
  weak: 3,
  developing: 5,
  solid: 7,
  strong: 9,
};
export const INTERVIEW_DIMENSIONS = [
  'understanding',
  'approach',
  'complexity',
  'communication',
  'edge_cases',
] as const;
export type InterviewDimension = (typeof INTERVIEW_DIMENSIONS)[number];

/** Interview pillar: mean of the last three sessions' rubric scores, as 0..1. */
export function interviewPillar(sessions: { endedAt: Date; scores: number[] }[]): number | null {
  const recent = [...sessions]
    .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
    .slice(0, 3);
  const all = recent.flatMap((s) => s.scores);
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length / 10 : null;
}
