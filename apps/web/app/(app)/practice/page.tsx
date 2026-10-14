import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, CircleDot, Circle } from 'lucide-react';
import { listProblems } from '@careerforge/db';
import { Badge } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Practice' };
export const dynamic = 'force-dynamic';

const STATUS = {
  solved: { icon: CheckCircle2, cls: 'text-tone-found', label: 'solved' },
  attempted: { icon: CircleDot, cls: 'text-tone-active', label: 'attempted' },
  unattempted: { icon: Circle, cls: 'text-fg-subtle', label: 'not attempted' },
} as const;

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requireOnboarded();
  const sp = await searchParams;
  const all = await listProblems(actor.id);
  const filter =
    sp.status === 'solved' || sp.status === 'attempted' || sp.status === 'unattempted'
      ? sp.status
      : null;
  const rows = filter ? all.filter((p) => p.status === filter) : all;
  const groups = [...new Set(rows.map((r) => r.skillName))];
  const solved = all.filter((p) => p.status === 'solved').length;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-normal tracking-[-0.021em] text-fg sm:text-5xl">Practice</h1>
          <p className="mt-1 text-fg-muted">
            {all.length} problems mapped to skills. A judged submission is the strongest evidence in
            your skill model. {solved} solved.
          </p>
        </div>
        <nav aria-label="Filter" className="flex gap-1 text-sm">
          {[null, 'unattempted', 'attempted', 'solved'].map((f) => (
            <Link
              key={f ?? 'all'}
              href={f ? `/practice?status=${f}` : '/practice'}
              aria-current={filter === f ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 ${filter === f ? 'bg-surface-2 font-medium text-fg' : 'text-fg-muted hover:text-fg'}`}
            >
              {f ?? 'all'}
            </Link>
          ))}
        </nav>
      </header>
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 text-[13px] text-fg-subtle">{g}</h2>
          <ul className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
            {rows
              .filter((r) => r.skillName === g)
              .map((p) => {
                const S = STATUS[p.status];
                return (
                  <li key={p.id} className="border-b border-border/70 last:border-b-0">
                    <Link
                      href={`/practice/${p.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                    >
                      <S.icon size={16} className={S.cls} aria-label={S.label} />
                      <span className="flex-1 text-sm font-medium text-fg">{p.title}</span>
                      <span className="hidden gap-1 sm:flex">
                        {p.tags.slice(0, 2).map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </span>
                      <Badge
                        tone={
                          p.difficulty >= 4 ? 'danger' : p.difficulty >= 3 ? 'warning' : 'success'
                        }
                      >
                        {['', 'easy', 'easy', 'medium', 'hard', 'hard'][p.difficulty]}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </main>
  );
}
