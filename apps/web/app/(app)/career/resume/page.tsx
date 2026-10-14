import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestResume, loadScoringContext, readinessFor } from '@careerforge/db';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { analyzeResumeAction, verifySkillsAction } from '../actions';

export const metadata: Metadata = { title: 'Resume analysis' };
export const dynamic = 'force-dynamic';

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string }>;
}) {
  const actor = await requireOnboarded();
  const sp = await searchParams;
  const [resume, ctx] = await Promise.all([
    getLatestResume(actor.id),
    loadScoringContext(actor.id),
  ]);
  const readiness = await readinessFor(ctx);
  const evidenced = (skillId: string) => {
    const s = ctx.states.get(skillId);
    return s && s.evidenceCount > 1 ? s.mastery : null;
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/career" className="hover:text-fg">
          Career
        </Link>{' '}
        / Resume
      </nav>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Resume intelligence</h1>
        <p className="mt-1 max-w-2xl text-fg-muted">
          Skills are extracted with the sentence that proves each one. A claim is only a claim:
          verified claims count as weak evidence until practice backs them up — and you can see
          exactly where your resume and your evidence disagree.
        </p>
      </header>

      {resume && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardHeader>
              <CardTitle>Skills found in {resume.filename}</CardTitle>
              <span className="text-xs text-fg-muted">{resume.parsed.skills.length} skills</span>
            </CardHeader>
            <CardBody>
              {sp.verified && (
                <p className="mb-3 rounded-md bg-tone-found-soft px-3 py-2 text-sm text-fg">
                  Saved. Verified claims are now (weak) evidence.
                </p>
              )}
              <form
                action={verifySkillsAction.bind(null, resume.id)}
                className="flex flex-col gap-2"
              >
                {resume.parsed.skills.map((s) => {
                  const m = evidenced(s.skillId);
                  return (
                    <label
                      key={s.skillId}
                      className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        name="verified"
                        value={s.skillId}
                        defaultChecked={s.verified}
                        className="mt-1 h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                          {s.name}
                          {m === null ? (
                            <Badge>no practice evidence</Badge>
                          ) : m >= 0.6 ? (
                            <Badge tone="success">evidence agrees · {Math.round(m * 100)}%</Badge>
                          ) : (
                            <Badge tone="warning">evidence says {Math.round(m * 100)}%</Badge>
                          )}
                        </span>
                        <span className="block truncate text-xs text-fg-muted">“{s.snippet}”</span>
                      </span>
                    </label>
                  );
                })}
                <Button type="submit" size="sm" className="mt-2 w-fit">
                  Confirm these are real
                </Button>
              </form>
            </CardBody>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resume score</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-4xl font-semibold text-fg">
                  {readiness.pillars.resume === null
                    ? '—'
                    : `${Math.round(readiness.pillars.resume * 100)}%`}
                </p>
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {readiness.resumeChecks.map((c) => (
                    <li key={c.key}>
                      <span className={c.passed ? 'text-tone-found' : 'text-tone-error'}>
                        {c.passed ? '✓' : '✗'}
                      </span>{' '}
                      <span className="text-fg">{c.label}</span>
                      <span className="block pl-4 text-xs text-fg-subtle">{c.detail}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            {resume.parsed.warnings.map((w) => (
              <p key={w} className="rounded-md bg-tone-active-soft px-3 py-2 text-sm text-fg">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{resume ? 'Analyse a new version' : 'Paste your resume'}</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={analyzeResumeAction} className="flex flex-col gap-3">
            <input
              name="filename"
              placeholder="resume-v2.txt"
              className="h-9 w-64 rounded-md border border-border bg-surface px-3 text-sm text-fg"
            />
            <textarea
              name="text"
              rows={12}
              required
              defaultValue={resume ? '' : undefined}
              placeholder="Paste the plain text of your resume (copy from your PDF). It stays private to your account and is never sent to a model without your action."
              className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-fg outline-none focus:border-accent"
            />
            {sp.error === 'short' && (
              <p className="text-sm text-tone-error">That looks too short to be a resume.</p>
            )}
            <Button type="submit" size="sm" className="w-fit">
              Analyse
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
