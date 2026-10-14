'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { aiMode, followUpQuestion, judgeRound, type UsageSink } from '@careerforge/ai';
import { COMPANY_PROFILES, INTERVIEW_QUESTIONS, INTERVIEW_ROUNDS } from '@careerforge/content';
import {
  advanceSession,
  appendTurn,
  createInterviewSession,
  getInterviewSession,
  getPrimaryEnrollment,
  listInterviewSessions,
  logAiUsage,
  scoreRound,
} from '@careerforge/db';
import { requireActor } from '@/lib/session';

export async function startInterviewAction(formData: FormData) {
  const actor = await requireActor();
  const profile = String(formData.get('profile') ?? 'product-sde');
  const rounds = INTERVIEW_ROUNDS[profile];
  const enrollment = await getPrimaryEnrollment(actor.id);
  if (!rounds || !enrollment) redirect('/interview');
  // Rotate questions deterministically so repeat sessions don't ask the same thing.
  const n = (await listInterviewSessions(actor.id)).length;
  const picked = rounds.map((r, i) => {
    const pool = INTERVIEW_QUESTIONS.filter((q) => q.kind === r.kind);
    const q = pool[(n + i) % pool.length]!;
    return { kind: r.kind, title: r.title, questionSlug: q.slug };
  });
  const label = COMPANY_PROFILES.find((p) => p.slug === profile)?.label ?? profile;
  const first = INTERVIEW_QUESTIONS.find((q) => q.slug === picked[0]!.questionSlug)!;
  const session = await createInterviewSession({
    userId: actor.id,
    roleId: enrollment.role.id,
    companyProfile: profile,
    rounds: picked,
    aiMode: aiMode(),
    opening: `Hi! This is a ${label} interview for the ${enrollment.role.title} role — ${picked.length} rounds. Think out loud; I care about your reasoning as much as the answer.\n\n${picked[0]!.title}\n\n${first.prompt}`,
  });
  redirect(`/interview/${session.id}`);
}

export async function answerInterviewAction(sessionId: string, formData: FormData) {
  const actor = await requireActor();
  const text = String(formData.get('answer') ?? '')
    .trim()
    .slice(0, 6000);
  const s = await getInterviewSession(sessionId, actor.id);
  if (!s || s.session.status === 'completed' || text.length < 2)
    redirect(`/interview/${sessionId}`);
  const round = s.session.currentRound;
  const spec = s.session.rounds[round]!;
  const q = INTERVIEW_QUESTIONS.find((x) => x.slug === spec.questionSlug)!;
  const userTurns = s.turns.filter((t) => t.round === round && t.actor === 'user');
  const sink: UsageSink = (u) => logAiUsage({ userId: actor.id, ...u });

  await appendTurn(sessionId, round, 'user', text);
  if (userTurns.length === 0) {
    // First answer → one adaptive follow-up probing the weakest part.
    await appendTurn(sessionId, round, 'ai', await followUpQuestion(q, text, sink));
  } else {
    // Second answer → the round is judged. Levels from the judge; numbers from code.
    const judged = await judgeRound(q, userTurns[0]!.content, text, sink);
    await scoreRound({
      userId: actor.id,
      sessionId,
      round,
      skillSlug: q.skill,
      levels: judged.levels,
    });
    const summary = [
      `Round ${round + 1} feedback`,
      ...judged.strengths.map((x) => `+ ${x}`),
      ...judged.improvements.map((x) => `− ${x}`),
    ].join('\n');
    await appendTurn(sessionId, round, 'ai', summary);
    const next = round + 1;
    if (next < s.session.rounds.length) {
      const nq = INTERVIEW_QUESTIONS.find((x) => x.slug === s.session.rounds[next]!.questionSlug)!;
      await appendTurn(sessionId, next, 'ai', `${s.session.rounds[next]!.title}\n\n${nq.prompt}`);
      await advanceSession(sessionId, next, false);
    } else {
      await appendTurn(
        sessionId,
        round,
        'ai',
        'That’s the end of the interview — thank you. Your rubric is below, and every round has been added to your evidence.',
      );
      await advanceSession(sessionId, next, true);
    }
  }
  revalidatePath(`/interview/${sessionId}`);
  revalidatePath('/dashboard');
  redirect(`/interview/${sessionId}#latest`);
}
