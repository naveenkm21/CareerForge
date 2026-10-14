import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubmission } from '@careerforge/db';
import { Badge } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Submission' };
export const dynamic = 'force-dynamic';

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const row = await getSubmission(id, actor.id);
  if (!row) notFound();
  const s = row.submission;
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href={`/practice/${row.problem.slug}`} className="hover:text-fg">
          {row.problem.title}
        </Link>{' '}
        / submission
      </nav>
      <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold text-fg">
        Submission{' '}
        <Badge tone={s.status === 'ac' ? 'success' : 'danger'}>{s.status.toUpperCase()}</Badge>
      </h1>
      <p className="text-sm text-fg-muted">
        {s.passed}/{s.total} tests · {s.lang} · {s.runtimeMs ?? '—'} ms · judge {s.judge} ·{' '}
        {s.createdAt.toLocaleString()}
      </p>
      {s.failedCase && (
        <div className="grid gap-2 text-xs sm:grid-cols-3">
          {(['input', 'expected', 'actual'] as const).map((k) => (
            <div key={k}>
              <p className="mb-1 font-semibold text-fg-muted">{k}</p>
              <pre className="max-h-40 overflow-auto rounded bg-surface-2 p-2 font-mono whitespace-pre-wrap">
                {s.failedCase![k]}
              </pre>
            </div>
          ))}
        </div>
      )}
      <pre className="overflow-auto rounded-[var(--radius)] border border-border bg-[var(--code-bg)] p-4 font-mono text-xs text-fg">
        {s.code}
      </pre>
    </main>
  );
}
