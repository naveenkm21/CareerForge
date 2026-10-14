import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { STAGE_NAMES } from '@careerforge/content';
import { getTopic } from '@careerforge/db';
import { buttonClasses, cn } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Topic' };
export const dynamic = 'force-dynamic';

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const actor = await requireOnboarded();
  const { topic: slug } = await params;
  const t = await getTopic(slug, actor.id);
  if (!t) notFound();
  const next = t.lessons.find((l) => !l.completed) ?? t.lessons[0];
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/learn" className="hover:text-fg">
          Learn
        </Link>{' '}
        / {t.topic.title}
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">{t.topic.title}</h1>
        <p className="text-fg-muted">{t.topic.blurb}</p>
        <p className="text-sm text-fg-subtle">
          Skill: {t.skill.name} ·{' '}
          <Link href={`/explain/skill/${t.skill.id}`} className="text-accent hover:underline">
            your evidence →
          </Link>
        </p>
      </header>
      <ol className="relative flex flex-col gap-2 border-l-2 border-border pl-6">
        {t.lessons.map((l) => (
          <li key={l.id} className="relative">
            <span
              className={cn(
                'absolute top-3 -left-[33px] flex h-4 w-4 items-center justify-center rounded-full border-2',
                l.completed
                  ? 'border-tone-found bg-tone-found text-white'
                  : 'border-border-strong bg-bg',
              )}
              aria-hidden
            >
              {l.completed && <Check size={10} />}
            </span>
            <Link
              href={`/learn/${t.topic.slug}/${l.slug}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:border-accent"
            >
              <span>
                <span className="block text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
                  Stage {l.stage} · {STAGE_NAMES[l.stage - 1]}
                </span>
                <span className="text-sm font-medium text-fg">{l.title}</span>
              </span>
              <span className="text-xs text-fg-subtle">{l.estMinutes} min</span>
            </Link>
          </li>
        ))}
      </ol>
      {next && (
        <Link
          href={`/learn/${t.topic.slug}/${next.slug}`}
          className={buttonClasses('primary', 'md', 'w-fit')}
        >
          {t.lessons.every((l) => l.completed)
            ? 'Review from the start'
            : `Continue: ${next.title}`}
        </Link>
      )}
    </main>
  );
}
