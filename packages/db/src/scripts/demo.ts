/**
 * Demo data: a learner ("Naveen") with 24 days of genuine-looking history, plus five peers for
 * the leaderboard and battles. Every number the demo shows is still DERIVED: this script only
 * writes evidence, submissions, lesson progress and sessions, then runs the same projector the
 * product uses — once per historical day, so the readiness trend line is real history.
 *
 *   pnpm db:demo            (after pnpm db:setup; sign in as demo@careerforge.test)
 */
import { and, eq, inArray } from 'drizzle-orm';
import { fixtureJudge } from '@careerforge/ai';
import { INTERVIEW_QUESTIONS, rng, STAGE_NAMES } from '@careerforge/content';
import { closeDb, getDb } from '../client';
import {
  applications,
  battleParticipants,
  battles,
  enrollments,
  follows,
  interviewScores,
  interviewSessions,
  interviewTurns,
  jobs,
  lessonProgress,
  lessons,
  problems,
  questions,
  roles,
  skills,
  submissions,
  topics,
  userSettings,
  users,
} from '../schema';
import { appendEvidence, recomputeUser, type NewEvidence } from '../repos/scoring';
import { saveResume, verifyResumeSkills } from '../repos/career';
import { LEVEL_SCORES } from '@careerforge/core';
import { uuidv7 } from '../uuid';

process.env.DATABASE_URL ??= 'pglite:.data/pg';
const DAY = 86_400_000;
const TZ = 'Asia/Kolkata';

/** Target ability per skill slug for the main learner: strong arrays, weak graphs and DP. */
const NAVEEN_ABILITY: Record<string, number> = {
  'dsa.arrays.traversal': 0.95,
  'dsa.arrays.two-pointers': 0.9,
  'dsa.arrays.sliding-window': 0.82,
  'dsa.arrays.prefix-sum': 0.85,
  'dsa.hashing': 0.86,
  'dsa.searching.linear-search': 0.97,
  'dsa.searching.binary-search': 0.84,
  'dsa.sorting.elementary': 0.9,
  'dsa.recursion': 0.75,
  'dsa.stacks-queues.stack': 0.85,
  'dsa.stacks-queues.monotonic-stack': 0.6,
  'dsa.trees.traversal': 0.72,
  'dsa.trees.bst': 0.68,
  'dsa.heaps': 0.45,
  'dsa.graphs.traversal': 0.58,
  'dsa.graphs.shortest-path': 0.35,
  'dsa.graphs.topological-sort': 0.4,
  'dsa.graphs.grid': 0.55,
  'dsa.dp.1d': 0.3,
  'cs.os.scheduling': 0.7,
  'cs.os.memory': 0.62,
  'cs.networks.http-lifecycle': 0.78,
  'cs.dbms.sql': 0.7,
  'cs.oop': 0.75,
};

const RESUME = `Naveen Kumar
naveen@example.com · github.com/naveen · Chennai

Summary
Final-year B.Tech CSE student focused on backend engineering and problem solving.

Experience
Software Engineering Intern, Nimbus Labs (May–Jul 2026)
- Built a Node.js REST API for invoice exports used by 40 internal users
- Cut p95 latency of the reports endpoint by 38% by adding PostgreSQL indexes
- Wrote unit tests with Jest, raising coverage from 52% to 81%

Projects
CareerForge — job-readiness platform (Next.js, TypeScript, PostgreSQL)
- Visual algorithm engine with 23 algorithms rendered from one trace
- Deterministic scoring engine with an append-only evidence log
Campus Ride Share (React, Redis)
- Real-time matching for 300+ students using a priority queue and BFS over a campus graph

Education
B.Tech Computer Science, 2027 — CGPA 8.4

Skills
C++, Java, Python, JavaScript, SQL, React, Node.js, Git, Data Structures and Algorithms, Dynamic Programming, Operating Systems, Computer Networks

Achievements
- Solved 350+ problems; arrays, hashing, binary search and trees
- Finalist, college hackathon 2025`;

const PEERS = [
  { handle: 'arjun', name: 'Arjun Mehta', college: 'IIT Madras', ability: 0.66, days: 18 },
  { handle: 'priya', name: 'Priya Sharma', college: 'NIT Trichy', ability: 0.78, days: 22 },
  { handle: 'rahul', name: 'Rahul Verma', college: 'Anna University', ability: 0.5, days: 10 },
  { handle: 'sneha', name: 'Sneha Iyer', college: 'NIT Trichy', ability: 0.72, days: 15 },
  { handle: 'kabir', name: 'Kabir Singh', college: 'IIT Madras', ability: 0.58, days: 8 },
];

async function upsertUser(input: {
  provider: string;
  subject: string;
  email: string;
  handle: string;
  name: string;
  college: string;
  role?: 'user' | 'admin';
}) {
  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.authProvider, input.provider), eq(users.authSubject, input.subject)));
  if (existing[0]) {
    throw new Error(
      `Demo data already exists (${input.email}). Run \`pnpm db:reset && pnpm db:demo\` for a fresh demo.`,
    );
  }
  const [row] = await db
    .insert(users)
    .values({
      authProvider: input.provider,
      authSubject: input.subject,
      email: input.email,
      handle: input.handle,
      name: input.name,
      college: input.college,
      gradYear: 2027,
      timezone: TZ,
      dailyMinutesTarget: 90,
      role: input.role ?? 'user',
      onboardedAt: new Date(Date.now() - 25 * DAY),
    })
    .returning();
  await db.insert(userSettings).values({ userId: row!.id }).onConflictDoNothing();
  return row!;
}

/** Simulates `days` of practice for one user at a given ability profile. Returns nothing; writes rows. */
async function simulate(
  userId: string,
  days: number,
  ability: (slug: string) => number,
  seed: string,
) {
  const db = getDb();
  const r = rng(seed);
  const [skillRows, problemRows, questionRows, topicRows, lessonRows] = await Promise.all([
    db.select().from(skills),
    db.select().from(problems),
    db.select().from(questions),
    db.select().from(topics),
    db.select().from(lessons),
  ]);
  const slugOf = new Map(skillRows.map((s) => [s.id, s.slug]));
  const practiced = [...new Set(Object.keys(NAVEEN_ABILITY))];
  const now = Date.now();
  const solved = new Set<string>();
  const doneLessons = new Set<string>();

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = now - d * DAY - 10 * 3_600_000; // ~ morning local time
    const at = (minute: number) => new Date(dayStart + minute * 60_000);
    // Progression: earlier days cover foundations, later days reach harder topics.
    const progress = (days - d) / days;
    const reachable = practiced.slice(
      0,
      Math.max(4, Math.ceil(practiced.length * Math.min(1, progress + 0.25))),
    );
    const events: NewEvidence[] = [];
    let minute = 0;

    // 1–2 lessons in topic order
    const nextLessons = topicRows
      .filter((t) => reachable.includes(slugOf.get(t.skillId)!))
      .flatMap((t) =>
        lessonRows
          .filter((l) => l.topicId === t.id && l.stage !== 5 && l.stage !== 6)
          .sort((a, b) => a.sort - b.sort),
      )
      .filter((l) => !doneLessons.has(l.id))
      .slice(0, r.int(1, 2));
    for (const l of nextLessons) {
      minute += r.int(6, 14);
      const t = topicRows.find((x) => x.id === l.topicId)!;
      doneLessons.add(l.id);
      await db
        .insert(lessonProgress)
        .values({
          userId,
          lessonId: l.id,
          completedAt: at(minute),
          secondsSpent: l.estMinutes * 60 + r.int(-120, 240),
        })
        .onConflictDoNothing();
      events.push({
        skillId: t.skillId,
        kind: 'lesson.viewed',
        sourceType: 'lesson',
        sourceId: l.id,
        outcome: 1,
        difficulty: 0.3,
        occurredAt: at(minute),
        meta: { stage: l.stage, stageName: STAGE_NAMES[l.stage - 1] },
      });
    }

    // Checkpoints and quiz questions on reachable skills
    for (let k = 0; k < r.int(3, 6); k++) {
      const slug = r.pick(reachable);
      const skill = skillRows.find((s) => s.slug === slug)!;
      minute += r.int(1, 4);
      const correct = r.int(0, 1000) / 1000 < ability(slug) + 0.08;
      events.push({
        skillId: skill.id,
        kind: 'checkpoint.answered',
        sourceType: 'checkpoint',
        sourceId: `demo-${slug}-${d}-${k}`,
        outcome: correct ? 1 : 0,
        difficulty: 0.4 + r.int(0, 4) / 10,
        occurredAt: at(minute),
      });
    }
    for (const q of questionRows
      .filter((q) => reachable.includes(slugOf.get(q.skillId)!))
      .slice(0, 40)) {
      if (r.int(0, 9) > 1) continue;
      minute += 2;
      const correct = r.int(0, 1000) / 1000 < ability(slugOf.get(q.skillId)!);
      events.push({
        skillId: q.skillId,
        kind: 'question.answered',
        sourceType: 'question',
        sourceId: q.id,
        outcome: correct ? 1 : 0,
        difficulty: q.difficulty,
        occurredAt: at(minute),
        meta: { given: correct ? q.answer : q.options.find((o) => o !== q.answer) },
      });
    }

    // 1–3 submissions
    const candidates = problemRows.filter((p) => reachable.includes(slugOf.get(p.skillId)!));
    for (let k = 0; k < r.int(1, 3) && candidates.length; k++) {
      const p = r.pick(candidates);
      const slug = slugOf.get(p.skillId)!;
      const pass = r.int(0, 1000) / 1000 < ability(slug) - (p.difficulty - 2) * 0.08;
      minute += r.int(12, 30);
      const total = 10;
      const passed = pass ? total : r.int(2, 8);
      const id = uuidv7(dayStart + minute * 60_000);
      await db.insert(submissions).values({
        id,
        userId,
        problemId: p.id,
        lang: 'cpp',
        code: pass ? (p.referenceSolution.cpp ?? '') : (p.starterCode.cpp ?? ''),
        status: pass ? 'ac' : 'wa',
        passed,
        total,
        runtimeMs: r.int(4, 60),
        failedCase: null,
        judge: 'local',
        createdAt: at(minute),
      });
      events.push({
        skillId: p.skillId,
        kind: 'submission.judged',
        sourceType: 'submission',
        sourceId: id,
        outcome: pass ? 1 : (passed / total) * 0.6,
        difficulty: (p.difficulty - 1) / 4,
        occurredAt: at(minute),
        meta: { problemId: p.id, status: pass ? 'ac' : 'wa', attempt: solved.has(p.id) ? 2 : 1 },
      });
      if (pass) solved.add(p.id);
    }
    await appendEvidence(userId, events);
  }
}

async function main() {
  const db = getDb();
  const [sde] = await db.select().from(roles).where(eq(roles.slug, 'sde'));
  if (!sde) throw new Error('Run `pnpm db:setup` first.');

  console.log('creating demo learner + peers…');
  const naveen = await upsertUser({
    provider: 'dev',
    subject: 'dev|demo@careerforge.test',
    email: 'demo@careerforge.test',
    handle: 'naveen',
    name: 'Naveen',
    college: 'Anna University',
    role: 'admin',
  });
  await db.insert(enrollments).values({
    userId: naveen.id,
    roleId: sde.id,
    isPrimary: true,
    startedAt: new Date(Date.now() - 25 * DAY),
  });
  const peers = [];
  for (const p of PEERS) {
    const u = await upsertUser({
      provider: 'seed',
      subject: p.handle,
      email: `${p.handle}@careerforge.test`,
      handle: p.handle,
      name: p.name,
      college: p.college,
    });
    await db.insert(enrollments).values({ userId: u.id, roleId: sde.id, isPrimary: true });
    peers.push({ ...p, user: u });
  }

  console.log('simulating 24 days of practice…');
  await simulate(naveen.id, 24, (slug) => NAVEEN_ABILITY[slug] ?? 0.5, 'naveen');
  for (const p of peers)
    await simulate(
      p.user.id,
      p.days,
      (slug) => Math.min(0.97, p.ability + ((NAVEEN_ABILITY[slug] ?? 0.5) - 0.65) * 0.5),
      p.handle,
    );

  // Resume, applications, follows
  const resume = await saveResume(naveen.id, 'naveen-resume.txt', RESUME);
  await verifyResumeSkills(
    naveen.id,
    resume.id,
    resume.parsed.skills.filter((s) => !s.slug.startsWith('cs.networks.tcp')).map((s) => s.skillId),
  );
  const jobRows = await db
    .select()
    .from(jobs)
    .where(
      inArray(jobs.externalId, [
        'nimbus-sde1',
        'orbitpay-sde-intern',
        'trellis-fullstack',
        'zenith-sde2',
      ]),
    );
  const byExt = new Map(jobRows.map((j) => [j.externalId, j]));
  const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();
  const apps: [
    string,
    'saved' | 'applied' | 'oa' | 'interview',
    { status: 'saved' | 'applied' | 'oa' | 'interview'; at: string }[],
  ][] = [
    [
      'nimbus-sde1',
      'interview',
      [
        { status: 'saved', at: ago(12) },
        { status: 'applied', at: ago(11) },
        { status: 'oa', at: ago(6) },
        { status: 'interview', at: ago(1) },
      ],
    ],
    [
      'orbitpay-sde-intern',
      'oa',
      [
        { status: 'applied', at: ago(5) },
        { status: 'oa', at: ago(2) },
      ],
    ],
    ['trellis-fullstack', 'applied', [{ status: 'applied', at: ago(3) }]],
    ['zenith-sde2', 'saved', [{ status: 'saved', at: ago(1) }]],
  ];
  for (const [ext, status, timeline] of apps) {
    const job = byExt.get(ext);
    if (job)
      await db.insert(applications).values({
        userId: naveen.id,
        jobId: job.id,
        status,
        timeline,
        notes: status === 'interview' ? 'Onsite next Tuesday — revise graphs + DP.' : '',
      });
  }
  await db.insert(follows).values([
    { followerId: naveen.id, followeeId: peers[0]!.user.id },
    { followerId: naveen.id, followeeId: peers[1]!.user.id },
    { followerId: peers[0]!.user.id, followeeId: naveen.id },
  ]);

  // A completed mock interview 3 days ago, judged by the deterministic fixture judge.
  const when = Date.now() - 3 * DAY;
  const picks = ['iq-two-sum', 'iq-url', 'iq-project'].map(
    (s) => INTERVIEW_QUESTIONS.find((q) => q.slug === s)!,
  );
  const answers = [
    [
      'Brute force is O(n^2) with nested loops. Better: one pass with a hash map from value to index; for each x check whether target - x was seen. That is O(n) time and O(n) space.',
      'If the same element appears twice it still works because I check before inserting, so I never pair an element with itself.',
    ],
    [
      'The browser parses the URL, does a DNS lookup, then opens a TCP connection with a handshake, then TLS for https, sends the HTTP GET request and renders the HTML response into the DOM.',
      'Caching helps at DNS, the browser cache and a CDN.',
    ],
    [
      'I built CareerForge to help students prove readiness. I designed the scoring engine and chose an append-only evidence log instead of storing scores because the formula will change. The hardest part was keeping traces deterministic.',
      'I tested it with property tests; latency of the dashboard is under 200 ms.',
    ],
  ];
  const [session] = await db
    .insert(interviewSessions)
    .values({
      userId: naveen.id,
      roleId: sde.id,
      companyProfile: 'product-sde',
      rounds: picks.map((q, i) => ({
        kind: q.kind,
        title: `Round ${i + 1}`,
        questionSlug: q.slug,
      })),
      currentRound: 3,
      status: 'completed',
      aiMode: 'fixtures',
      startedAt: new Date(when),
      endedAt: new Date(when + 45 * 60_000),
    })
    .returning();
  const skillBySlug = new Map((await db.select().from(skills)).map((s) => [s.slug, s]));
  const interviewEvents: NewEvidence[] = [];
  for (const [i, q] of picks.entries()) {
    const [a, f] = answers[i]!;
    await db.insert(interviewTurns).values([
      { sessionId: session!.id, round: i, idx: 0, actor: 'ai', content: q.prompt },
      { sessionId: session!.id, round: i, idx: 1, actor: 'user', content: a! },
      { sessionId: session!.id, round: i, idx: 2, actor: 'ai', content: q.followUps[0]! },
      { sessionId: session!.id, round: i, idx: 3, actor: 'user', content: f! },
    ]);
    const j = fixtureJudge(q, a!, f!);
    const skill = skillBySlug.get(q.skill)!;
    await db.insert(interviewScores).values(
      j.levels.map((l) => ({
        sessionId: session!.id,
        round: i,
        dimension: l.dimension,
        level: l.level,
        score: LEVEL_SCORES[l.level],
        justification: l.justification,
        skillId: skill.id,
      })),
    );
    const mean = j.levels.reduce((s, l) => s + LEVEL_SCORES[l.level], 0) / j.levels.length / 10;
    interviewEvents.push({
      skillId: skill.id,
      kind: 'interview.scored',
      sourceType: 'interview',
      sourceId: session!.id,
      outcome: mean,
      difficulty: 0.6,
      occurredAt: new Date(when + (i + 1) * 15 * 60_000),
      meta: { round: i },
    });
  }
  await appendEvidence(naveen.id, interviewEvents);

  // A finished battle against Arjun 5 days ago (Naveen won).
  const graphSkill = skillBySlug.get('dsa.graphs.traversal')!;
  const battleProblems = await db
    .select({ id: problems.id })
    .from(problems)
    .where(eq(problems.skillId, graphSkill.id));
  const [battle] = await db
    .insert(battles)
    .values({
      createdBy: naveen.id,
      opponentId: peers[0]!.user.id,
      skillId: graphSkill.id,
      problemIds: battleProblems.map((p) => p.id).slice(0, 3),
      durationS: 1200,
      status: 'finished',
      createdAt: new Date(Date.now() - 5 * DAY),
      endsAt: new Date(Date.now() - 5 * DAY + 1200_000),
    })
    .returning();
  await db.insert(battleParticipants).values([
    {
      battleId: battle!.id,
      userId: naveen.id,
      solved: 2,
      penaltyS: 840,
      finishedAt: new Date(Date.now() - 5 * DAY + 900_000),
    },
    {
      battleId: battle!.id,
      userId: peers[0]!.user.id,
      solved: 1,
      penaltyS: 610,
      finishedAt: new Date(Date.now() - 5 * DAY + 1200_000),
    },
  ]);
  await appendEvidence(naveen.id, [
    {
      skillId: graphSkill.id,
      kind: 'battle.result',
      sourceType: 'battle',
      sourceId: battle!.id,
      outcome: 1,
      difficulty: 0.6,
      occurredAt: new Date(Date.now() - 5 * DAY + 1200_000),
    },
  ]);
  await appendEvidence(peers[0]!.user.id, [
    {
      skillId: graphSkill.id,
      kind: 'battle.result',
      sourceType: 'battle',
      sourceId: battle!.id,
      outcome: 1 / 6,
      difficulty: 0.6,
      occurredAt: new Date(Date.now() - 5 * DAY + 1200_000),
    },
  ]);

  console.log('replaying the projector day by day (real trend history)…');
  for (let d = 23; d >= 1; d--)
    await recomputeUser(naveen.id, new Date(Date.now() - d * DAY + 8 * 3_600_000));
  const final = await recomputeUser(naveen.id);
  for (const p of peers) await recomputeUser(p.user.id);

  console.log(
    `demo ready: readiness ${Math.round(final.readiness * 100)}%, ${final.xp} XP, badges: ${final.badges.join(', ')}`,
  );
  console.log('sign in at /sign-in with demo@careerforge.test');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
