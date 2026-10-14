import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Code2, Info, Mic, TriangleAlert } from 'lucide-react';
import { STAGE_NAMES } from '@careerforge/content';
import { getProblemsBySlug, getQuestionsBySlug, getTopic } from '@careerforge/db';
import { Badge, buttonClasses, cn } from '@careerforge/ui';
import { Markdown } from '@/components/markdown';
import { requireOnboarded } from '@/lib/session';
import { CompleteLesson, ExplainBlock, LessonViz, QuizBlock } from '../../blocks';

export const metadata: Metadata = { title: 'Lesson' };
export const dynamic = 'force-dynamic';

/** Renders a lesson entirely from its database blocks — no lesson content lives in the UI layer. */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ topic: string; lesson: string }>;
}) {
  const actor = await requireOnboarded();
  const { topic: topicSlug, lesson: lessonSlug } = await params;
  const t = await getTopic(topicSlug, actor.id);
  const idx = t?.lessons.findIndex((l) => l.slug === lessonSlug) ?? -1;
  if (!t || idx < 0) notFound();
  const lesson = t.lessons[idx]!;
  const next = t.lessons[idx + 1];
  const blocks = lesson.blocks;
  const [questions, problems] = await Promise.all([
    getQuestionsBySlug(blocks.flatMap((b) => (b.kind === 'quiz' ? [b.questionSlug] : []))),
    getProblemsBySlug(
      blocks.flatMap((b) => (b.kind === 'problem' ? [b.problemSlug] : [])),
      actor.id,
    ),
  ]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/learn" className="hover:text-fg">
          Learn
        </Link>{' '}
        /{' '}
        <Link href={`/learn/${t.topic.slug}`} className="hover:text-fg">
          {t.topic.title}
        </Link>{' '}
        / Stage {lesson.stage}
      </nav>
      <header>
        <ol className="mb-3 flex flex-wrap gap-1" aria-label="Ladder">
          {t.lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/learn/${t.topic.slug}/${l.slug}`}
                className={cn(
                  'block rounded-full px-2.5 py-1 text-[11px] font-medium',
                  l.id === lesson.id
                    ? 'bg-accent text-accent-fg'
                    : l.completed
                      ? 'bg-tone-found-soft text-tone-found'
                      : 'bg-surface-2 text-fg-muted hover:text-fg',
                )}
              >
                {l.stage}. {STAGE_NAMES[l.stage - 1]}
              </Link>
            </li>
          ))}
        </ol>
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{lesson.title}</h1>
      </header>

      <div className="flex flex-col gap-6">
        {blocks.map((b, i) => {
          switch (b.kind) {
            case 'markdown':
              return (
                <div key={i} className="max-w-3xl">
                  <Markdown>{b.body}</Markdown>
                </div>
              );
            case 'callout': {
              const Icon = b.tone === 'warning' ? TriangleAlert : Info;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex max-w-3xl gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm',
                    b.tone === 'warning'
                      ? 'border-tone-active bg-tone-active-soft'
                      : 'border-accent bg-accent-soft/50',
                  )}
                >
                  <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <Markdown className="flex flex-col gap-2 text-sm text-fg">{b.body}</Markdown>
                </div>
              );
            }
            case 'viz':
              return (
                <LessonViz
                  key={i}
                  algorithmId={b.algorithmId}
                  input={b.input}
                  practice={b.practice}
                  caption={b.caption}
                />
              );
            case 'quiz': {
              const q = questions.find((x) => x.slug === b.questionSlug);
              return q ? (
                <QuizBlock
                  key={i}
                  slug={q.slug}
                  prompt={q.prompt}
                  options={q.options}
                  lessonId={lesson.id}
                />
              ) : null;
            }
            case 'problem': {
              const p = problems.find((x) => x.slug === b.problemSlug);
              if (!p) return null;
              return (
                <div
                  key={i}
                  className="flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4"
                >
                  <span className="flex items-center gap-3">
                    <Code2 size={18} className="text-fg-subtle" aria-hidden />
                    <span>
                      <span className="block font-medium text-fg">{p.title}</span>
                      <span className="text-xs text-fg-muted">
                        Difficulty {p.difficulty}/5 · judged against hidden tests
                      </span>
                    </span>
                    {p.solved && <Badge tone="success">solved</Badge>}
                  </span>
                  <Link
                    href={`/practice/${p.slug}?from=${t.topic.slug}/${lesson.slug}`}
                    className={buttonClasses(p.solved ? 'secondary' : 'primary', 'sm')}
                  >
                    {p.solved ? 'Solve again' : 'Open in the editor'}
                  </Link>
                </div>
              );
            }
            case 'explain':
              return (
                <ExplainBlock
                  key={i}
                  prompt={b.prompt}
                  keyPoints={b.keyPoints}
                  skillSlug={t.skill.slug}
                  lessonId={lesson.id}
                />
              );
            case 'interview':
              return (
                <div
                  key={i}
                  className="flex max-w-3xl flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4"
                >
                  <p className="flex items-center gap-2 font-medium text-fg">
                    <Mic size={16} aria-hidden /> Interview pressure
                  </p>
                  <Markdown className="text-sm text-fg-muted">{b.body}</Markdown>
                  <Link href="/interview" className={buttonClasses('primary', 'sm', 'w-fit')}>
                    Start a mock interview
                  </Link>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>

      <CompleteLesson
        lessonId={lesson.id}
        completed={lesson.completed}
        nextHref={next ? `/learn/${t.topic.slug}/${next.slug}` : `/learn/${t.topic.slug}`}
      />
    </main>
  );
}
