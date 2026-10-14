'use server';

import { revalidatePath } from 'next/cache';
import { getBattle, getProblem, recordBattleSolve, saveSubmission } from '@careerforge/db';
import {
  judge,
  judgeProvider,
  JUDGE_LANGS,
  type JudgeLang,
  type JudgeResult,
} from '@careerforge/judge';
import { requireActor } from '@/lib/session';

const RATE_WINDOW_MS = 10_000;
const lastRun = new Map<string, number>();

function checkRate(userId: string) {
  // Per-user throttle so the judge can't be hammered (Redis token bucket in the full design).
  const now = Date.now();
  if (now - (lastRun.get(userId) ?? 0) < 1500)
    throw new Error('Slow down — one run every 1.5 seconds.');
  lastRun.set(userId, now);
  for (const [k, v] of lastRun) if (now - v > RATE_WINDOW_MS) lastRun.delete(k);
}

export type RunResponse = (JudgeResult & { submissionId?: string }) | { error: string };

export async function runSamplesAction(
  slug: string,
  lang: string,
  code: string,
): Promise<RunResponse> {
  const actor = await requireActor();
  if (!JUDGE_LANGS.includes(lang as JudgeLang)) return { error: 'Unsupported language.' };
  try {
    checkRate(actor.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const p = await getProblem(slug);
  if (!p) return { error: 'Problem not found.' };
  return judge({
    lang: lang as JudgeLang,
    code,
    cases: p.samples.map((c) => ({ id: c.id, input: c.input, expected: c.expected })),
    timeLimitMs: p.problem.timeLimitMs,
    problem: { title: p.problem.title, statement: p.problem.statement },
  });
}

/** Full judge against hidden tests → stored verdict → `submission.judged` evidence. */
export async function submitAction(input: {
  slug: string;
  lang: string;
  code: string;
  hintsUsed: number;
  solutionViewed: boolean;
  battleId?: string | null;
}): Promise<RunResponse> {
  const actor = await requireActor();
  if (!JUDGE_LANGS.includes(input.lang as JudgeLang)) return { error: 'Unsupported language.' };
  try {
    checkRate(actor.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const p = await getProblem(input.slug);
  if (!p) return { error: 'Problem not found.' };
  const battle = input.battleId ? await getBattle(input.battleId, actor.id) : null;

  const result = await judge({
    lang: input.lang as JudgeLang,
    code: input.code,
    cases: p.testcases.map((c) => ({ id: c.id, input: c.input, expected: c.expected })),
    timeLimitMs: p.problem.timeLimitMs,
    problem: { title: p.problem.title, statement: p.problem.statement },
  });
  if (result.status === 'error') return result;

  const saved = await saveSubmission(actor.id, {
    problemId: p.problem.id,
    lang: input.lang,
    code: input.code,
    status: result.status,
    passed: result.passed,
    total: result.total,
    runtimeMs: result.runtimeMs,
    failedCase: result.failedCase,
    judge: result.judge,
    battleId: battle?.battle.id ?? null,
    meta: { hintsUsed: input.hintsUsed, solutionViewed: input.solutionViewed },
  });
  if (battle && result.status === 'ac')
    await recordBattleSolve(battle.battle.id, actor.id, p.problem.id, false);
  revalidatePath('/dashboard');
  revalidatePath('/practice');
  return { ...result, submissionId: saved.id };
}

export async function judgeStatusAction() {
  await requireActor();
  return judgeProvider();
}
