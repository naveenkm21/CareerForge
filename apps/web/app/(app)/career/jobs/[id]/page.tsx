import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import {
  applicationStatusFor,
  getJobWithGap,
  listTopicsWithProgress,
  loadScoringContext,
} from '@careerforge/db';
import { PROBLEMS } from '@careerforge/content';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';
import { setApplicationAction } from '../../actions';

export const metadata: Metadata = { title: 'Job' };
export const dynamic = 'force-dynamic';

const STATUS = {
  ready: { icon: CheckCircle2, cls: 'text-tone-found', label: 'ready' },
  close: { icon: AlertTriangle, cls: 'text-tone-active', label: 'close' },
  gap: { icon: XCircle, cls: 'text-tone-error', label: 'gap' },
  unmeasured: { icon: HelpCircle, cls: 'text-fg-subtle', label: 'not measured' },
} as const;

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const ctx = await loadScoringContext(actor.id);
  const [data, topics, status] = await Promise.all([
    getJobWithGap(id, ctx),
    listTopicsWithProgress(actor.id),
    applicationStatusFor(actor.id, [id]),
  ]);
  if (!data || (data.job.source === 'pasted' && data.job.createdBy !== actor.id)) notFound();
  const topicBySkill = new Map(topics.map((t) => [t.skill.id, t]));
  const problemBySkill = new Map<string, string>();
  for (const p of PROBLEMS) if (!problemBySkill.has(p.skill)) problemBySkill.set(p.skill, p.slug);
  const current = status.get(id);
  const gaps = data.rows.filter((r) => r.status !== 'ready');

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/career/jobs" className="hover:text-fg">
          Jobs
        </Link>{' '}
        / {data.job.company}
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg sm:text-4xl">
            {data.job.title}
          </h1>
          <p className="text-fg-muted">
            {data.job.company} · {data.job.location}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold text-fg">{Math.round(data.fit * 100)}%</p>
          <p className="text-xs text-fg-muted">fit from your evidence</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-muted">Track:</span>
        {(['saved', 'applied', 'oa', 'interview', 'offer', 'rejected'] as const).map((s) => (
          <form key={s} action={setApplicationAction.bind(null, id, s)}>
            <Button type="submit" size="sm" variant={current === s ? 'primary' : 'secondary'}>
              {s}
            </Button>
          </form>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requirements vs your evidence</CardTitle>
          <span className="text-xs text-fg-muted">{gaps.length} to work on</span>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col">
            {data.rows.map((r) => {
              const S = STATUS[r.status];
              const topic = topicBySkill.get(r.skillId);
              const problem = problemBySkill.get(r.skill.slug);
              return (
                <li
                  key={r.skillId}
                  className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0"
                >
                  <S.icon size={16} className={S.cls} aria-label={S.label} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                      {r.skill.name}
                      <Badge>
                        {r.mastery === null ? 'not measured' : `${Math.round(r.mastery * 100)}%`}
                      </Badge>
                      {r.importance >= 0.9 && <Badge tone="accent">emphasised</Badge>}
                    </span>
                    <span className="block truncate text-xs text-fg-subtle">“{r.snippet}”</span>
                  </span>
                  {r.status !== 'ready' && (
                    <span className="flex gap-2 text-xs">
                      {topic && (
                        <Link
                          href={`/learn/${topic.slug}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Learn →
                        </Link>
                      )}
                      {problem && (
                        <Link
                          href={`/practice/${problem}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Practice →
                        </Link>
                      )}
                      {!topic && !problem && (
                        <Link
                          href={`/explain/skill/${r.skillId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Skill →
                        </Link>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job description</CardTitle>
          {data.job.source === 'sample' && <Badge>sample listing · fictional company</Badge>}
        </CardHeader>
        <CardBody>
          <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-fg">
            {data.job.description}
          </pre>
        </CardBody>
      </Card>
    </main>
  );
}
