import type { Metadata } from 'next';
import Link from 'next/link';
import { STAGE_NAMES } from '@careerforge/content';
import { listTopicsWithProgress } from '@careerforge/db';
import { Badge, Meter } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Learn' };
export const dynamic = 'force-dynamic';

const DOMAIN = {
  dsa: 'Data Structures & Algorithms',
  cs: 'CS Fundamentals',
  dev: 'Development',
  soft: 'Communication',
} as const;

export default async function LearnPage() {
  const actor = await requireOnboarded();
  const topics = await listTopicsWithProgress(actor.id);
  const domains = [...new Set(topics.map((t) => t.skill.domain))];
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">Learn</h1>
        <p className="mt-2 text-fg-muted">
          Every topic is the same eight-stage ladder: {STAGE_NAMES.join(' → ')}. Stages 1–4 come
          from one visual trace; stages 5–8 are where you prove it.
        </p>
      </header>
      {domains.map((d) => (
        <section key={d}>
          <h2 className="font-mono mb-3 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
            {DOMAIN[d]}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics
              .filter((t) => t.skill.domain === d)
              .map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/learn/${t.slug}`}
                    className="group flex h-full flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4 hover:border-accent"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-fg group-hover:text-accent">
                        {t.title}
                      </span>
                      {t.lessonCount === 8 && <Badge tone="accent">full ladder</Badge>}
                    </span>
                    <span className="text-sm text-fg-muted">{t.blurb}</span>
                    <span className="mt-auto flex items-center gap-3 pt-2">
                      <Meter
                        value={t.lessonCount ? t.completed / t.lessonCount : 0}
                        label={`${t.title} progress`}
                      />
                      <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                        {t.completed}/{t.lessonCount} · {t.estMinutes}m
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
