import type { Metadata } from 'next';
import Link from 'next/link';
import { STAGE_NAMES } from '@careerforge/content';
import { getAnalytics, listAudit } from '@careerforge/db';
import { Button, buttonClasses, Card, CardBody, CardHeader, CardTitle } from '@careerforge/ui';
import { HBars } from '@/components/charts';
import { requireAdmin } from '@/lib/session';
import { recomputeMeAction } from './actions';

export const metadata: Metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  const [a, audit] = await Promise.all([getAnalytics(), listAudit(10)]);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const firstStage = a.ladder[0]?.learners ?? 0;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Admin</h1>
          <p className="mt-1 text-fg-muted">
            Analytics read the product’s own tables — evidence, submissions, lesson progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/problems" className={buttonClasses('primary', 'sm')}>
            Problem CMS
          </Link>
          <form action={recomputeMeAction}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              title="Rebuild your projections from the evidence log"
            >
              Recompute my projections
            </Button>
          </form>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Learners', a.totals.users],
          ['Evidence events', a.totals.events],
          ['Submissions', a.totals.submissions],
          ['Problems', a.totals.problems],
        ].map(([label, v]) => (
          <li
            key={label as string}
            className="rounded-[var(--radius)] border border-border bg-surface px-4 py-3"
          >
            <p className="text-xs text-fg-subtle">{label}</p>
            <p className="text-2xl font-semibold text-fg tabular-nums">
              {Number(v).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hardest problems · acceptance rate</CardTitle>
          </CardHeader>
          <CardBody>
            <HBars
              label="Acceptance rate"
              rows={a.hardestProblems.map((r) => ({
                label: r.title,
                value: Number(r.acRate),
                detail: `${r.attempts} attempts`,
              }))}
              unit="percent"
              max={1}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hardest questions · correct rate</CardTitle>
          </CardHeader>
          <CardBody>
            <HBars
              label="Correct rate"
              rows={a.hardestQuestions.map((r) => ({
                label: r.prompt,
                value: Number(r.correctRate),
                detail: `${r.attempts} answers`,
              }))}
              unit="percent"
              max={1}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ladder drop-off · learners completing each stage</CardTitle>
          </CardHeader>
          <CardBody>
            <HBars
              label="Learners"
              rows={a.ladder.map((r) => ({
                label: `${r.stage}. ${STAGE_NAMES[r.stage - 1]}`,
                value: r.learners,
                detail: firstStage ? `${pct(r.learners / firstStage)} of stage 1` : undefined,
              }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average time per lesson, by topic</CardTitle>
          </CardHeader>
          <CardBody>
            <HBars
              label="Minutes"
              rows={a.completion.map((r) => ({
                label: r.topic,
                value: Math.round(r.avgSeconds / 6) / 10,
                detail: `${r.completions} completions`,
              }))}
              unit="minutes"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardBody>
          {audit.length === 0 ? (
            <p className="text-sm text-fg-muted">No content changes yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {audit.map(({ log, actor }) => (
                <li key={log.id} className="flex justify-between gap-3">
                  <span>
                    <span className="font-medium text-fg">{actor ?? 'system'}</span>{' '}
                    <span className="text-fg-muted">{log.action}</span>{' '}
                    <span className="font-mono text-xs text-fg-subtle">
                      {JSON.stringify(log.diff)}
                    </span>
                  </span>
                  <span className="text-xs text-fg-subtle">{log.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
