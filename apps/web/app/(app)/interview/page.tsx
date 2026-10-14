import type { Metadata } from 'next';
import Link from 'next/link';
import { aiMode } from '@careerforge/ai';
import { COMPANY_PROFILES, INTERVIEW_ROUNDS } from '@careerforge/content';
import { listInterviewSessions } from '@careerforge/db';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { startInterviewAction } from './actions';

export const metadata: Metadata = { title: 'Mock interview' };
export const dynamic = 'force-dynamic';

export default async function InterviewPage() {
  const actor = await requireOnboarded();
  const sessions = await listInterviewSessions(actor.id);
  const mode = aiMode();
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Mock interview</h1>
        <p className="mt-1 max-w-2xl text-fg-muted">
          Three rounds. Each round: a question, your answer, a follow-up that probes the weakest
          part, then a rubric — understanding, approach, complexity, communication, edge cases. The
          interviewer emits qualitative levels; code converts them to scores.
        </p>
        <p className="mt-2">
          <Badge tone={mode === 'claude' ? 'accent' : 'neutral'}>
            {mode === 'claude'
              ? 'Interviewer: Claude'
              : 'Interviewer: deterministic rubric (no API key configured)'}
          </Badge>
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Start a session</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={startInterviewAction} className="flex flex-col gap-3">
            {COMPANY_PROFILES.map((p, i) => (
              <label
                key={p.slug}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/40"
              >
                <input
                  type="radio"
                  name="profile"
                  value={p.slug}
                  defaultChecked={i === 0}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-sm font-medium text-fg">{p.label}</span>
                  <span className="block text-xs text-fg-muted">
                    {p.description} · {INTERVIEW_ROUNDS[p.slug]!.map((r) => r.kind).join(' → ')}
                  </span>
                </span>
              </label>
            ))}
            <Button type="submit" className="w-fit">
              Begin interview
            </Button>
          </form>
        </CardBody>
      </Card>
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
            History
          </h2>
          <ul className="flex flex-col gap-2">
            {sessions.map(({ session, role, average }) => (
              <li key={session.id}>
                <Link
                  href={`/interview/${session.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-accent"
                >
                  <span>
                    <span className="block text-sm font-medium text-fg">
                      {COMPANY_PROFILES.find((p) => p.slug === session.companyProfile)?.label} ·{' '}
                      {role.title}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {session.startedAt.toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold text-fg">
                      {average === null ? '—' : `${average.toFixed(1)}/10`}
                    </span>
                    <Badge tone={session.status === 'completed' ? 'success' : 'warning'}>
                      {session.status}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
