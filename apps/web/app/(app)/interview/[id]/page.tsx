import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bot, User } from 'lucide-react';
import { INTERVIEW_QUESTIONS } from '@careerforge/content';
import { getInterviewSession } from '@careerforge/db';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, cn } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { answerInterviewAction } from '../actions';

export const metadata: Metadata = { title: 'Interview' };
export const dynamic = 'force-dynamic';

const LEVEL_TONE = {
  weak: 'danger',
  developing: 'warning',
  solid: 'accent',
  strong: 'success',
} as const;
const DIM: Record<string, string> = {
  understanding: 'Problem understanding',
  approach: 'Approach',
  complexity: 'Complexity',
  communication: 'Communication',
  edge_cases: 'Edge cases',
};

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const s = await getInterviewSession(id, actor.id);
  if (!s) notFound();
  const done = s.session.status === 'completed';
  const round = s.session.currentRound;
  const awaitingFollowUp =
    !done && s.turns.filter((t) => t.round === round && t.actor === 'user').length === 1;
  const rounds = s.session.rounds;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <nav className="text-xs text-fg-muted">
          <Link href="/interview" className="hover:text-fg">
            Interviews
          </Link>{' '}
          / {s.role.title}
        </nav>
        <ol className="flex flex-col gap-3" aria-label="Transcript">
          {s.turns.map((t, i) => (
            <li
              key={t.id}
              id={i === s.turns.length - 1 ? 'latest' : undefined}
              className={cn('flex gap-3', t.actor === 'user' && 'flex-row-reverse')}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  t.actor === 'ai' ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-fg',
                )}
                aria-label={t.actor === 'ai' ? 'Interviewer' : 'You'}
              >
                {t.actor === 'ai' ? <Bot size={16} /> : <User size={16} />}
              </span>
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  t.actor === 'ai'
                    ? 'border border-border bg-surface text-fg'
                    : 'bg-accent text-accent-fg',
                )}
              >
                {t.content}
              </div>
            </li>
          ))}
        </ol>
        {!done && (
          <form
            action={answerInterviewAction.bind(null, id)}
            className="sticky bottom-3 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow)]"
          >
            <label htmlFor="answer" className="text-xs text-fg-muted">
              {awaitingFollowUp ? 'Answer the follow-up' : `Your answer — ${rounds[round]?.title}`}
            </label>
            <textarea
              id="answer"
              name="answer"
              rows={5}
              required
              autoFocus
              placeholder="Think out loud: approach, complexity, edge cases…"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
            <Button type="submit" size="sm" className="w-fit">
              Send
            </Button>
          </form>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Rounds</CardTitle>
            <Badge>{s.session.aiMode === 'claude' ? 'Claude' : 'rubric'}</Badge>
          </CardHeader>
          <CardBody>
            <ol className="flex flex-col gap-2 text-sm">
              {rounds.map((r, i) => {
                const scores = s.scores.filter((x) => x.round === i);
                const avg = scores.length
                  ? scores.reduce((a, b) => a + b.score, 0) / scores.length
                  : null;
                return (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span
                      className={i === round && !done ? 'font-semibold text-fg' : 'text-fg-muted'}
                    >
                      {r.title.replace(/^Round \d+ · /, '')}
                    </span>
                    <span className="text-xs tabular-nums">
                      {avg === null ? (i === round && !done ? 'now' : '—') : `${avg.toFixed(1)}/10`}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
        {s.scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Rubric</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {rounds.map((r, i) => {
                const scores = s.scores.filter((x) => x.round === i);
                if (!scores.length) return null;
                const q = INTERVIEW_QUESTIONS.find((x) => x.slug === r.questionSlug);
                return (
                  <div key={i}>
                    <p className="mb-1 text-xs font-semibold text-fg">Round {i + 1}</p>
                    <ul className="flex flex-col gap-1">
                      {scores.map((sc) => (
                        <li key={sc.id} className="text-xs" title={sc.justification}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-fg-muted">
                              {DIM[sc.dimension] ?? sc.dimension}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Badge tone={LEVEL_TONE[sc.level]}>{sc.level}</Badge>
                              <span className="w-8 text-right font-semibold tabular-nums">
                                {sc.score}/10
                              </span>
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {done && q && (
                      <details className="mt-1 text-xs text-fg-muted">
                        <summary className="cursor-pointer">Model answer</summary>
                        <p className="mt-1">{q.modelAnswer}</p>
                      </details>
                    )}
                  </div>
                );
              })}
              <p className="text-[11px] text-fg-subtle">
                Levels come from the interviewer; the weak/developing/solid/strong → 3/5/7/9 mapping
                is code.
              </p>
            </CardBody>
          </Card>
        )}
      </aside>
    </main>
  );
}
