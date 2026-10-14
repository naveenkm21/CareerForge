import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Swords } from 'lucide-react';
import { getBattle, getProblem, getUserSettings, listSubmissions } from '@careerforge/db';
import { judgeProvider } from '@careerforge/judge';
import { Badge, buttonClasses } from '@careerforge/ui';
import { Markdown } from '@/components/markdown';
import { requireOnboarded } from '@/lib/session';
import { Workspace } from '../workspace';

export const metadata: Metadata = { title: 'Problem' };
export const dynamic = 'force-dynamic';

// Submissions run as server actions on this route; an AI review can take ~10–40 s.
export const maxDuration = 60;

export default async function ProblemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ battle?: string; from?: string }>;
}) {
  const actor = await requireOnboarded();
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getProblem(slug);
  if (!p || (p.problem.status !== 'published' && actor.role === 'user')) notFound();
  const [subs, settings, battle] = await Promise.all([
    listSubmissions(actor.id, p.problem.id),
    getUserSettings(actor.id),
    sp.battle ? getBattle(sp.battle, actor.id) : Promise.resolve(null),
  ]);
  const provider = judgeProvider();
  const pref = settings?.editorLang === 'ts' ? 'javascript' : (settings?.editorLang ?? 'cpp');

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="flex min-w-0 flex-col gap-4">
        <nav className="text-xs text-fg-muted">
          <Link href="/practice" className="hover:text-fg">
            Practice
          </Link>
          {sp.from && (
            <>
              {' '}
              ·{' '}
              <Link href={`/learn/${sp.from}`} className="hover:text-fg">
                back to the lesson
              </Link>
            </>
          )}
        </nav>
        {battle && battle.battle.status === 'active' && (
          <Link
            href={`/community/battles/${battle.battle.id}`}
            className="flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent"
          >
            <Swords size={15} aria-hidden /> Battle in progress — accepted solutions count for the
            battle.
          </Link>
        )}
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {p.problem.title}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              tone={
                p.problem.difficulty >= 4
                  ? 'danger'
                  : p.problem.difficulty >= 3
                    ? 'warning'
                    : 'success'
              }
            >
              difficulty {p.problem.difficulty}/5
            </Badge>
            <Link href={`/explain/skill/${p.skill.id}`}>
              <Badge tone="accent">{p.skill.name}</Badge>
            </Link>
            {p.problem.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </p>
        </header>
        <Markdown>{p.problem.statement}</Markdown>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="font-semibold text-fg">Input</dt>
            <dd className="font-mono text-xs whitespace-pre-wrap text-fg-muted">
              {p.problem.inputFormat}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-fg">Output</dt>
            <dd className="text-fg-muted">{p.problem.outputFormat}</dd>
          </div>
          <div>
            <dt className="font-semibold text-fg">Constraints</dt>
            <dd className="text-fg-muted">{p.problem.constraints}</dd>
          </div>
        </dl>
        {p.samples.map((s, i) => (
          <div key={s.id} className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-fg-muted">Sample {i + 1} input</p>
              <pre className="rounded-md bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap text-fg">
                {s.input}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-fg-muted">Output</p>
              <pre className="rounded-md bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap text-fg">
                {s.expected}
              </pre>
            </div>
          </div>
        ))}
        {p.problem.algorithmId && (
          <Link
            href={`/viz/${p.problem.algorithmId}`}
            className={buttonClasses('secondary', 'sm', 'w-fit')}
          >
            See the technique visualized
          </Link>
        )}
        {subs.length > 0 && (
          <div>
            <p className="font-mono mb-2 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
              Your submissions
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {subs.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/practice/submission/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded px-2 py-1 hover:bg-surface-2"
                  >
                    <span className={s.status === 'ac' ? 'text-tone-found' : 'text-tone-error'}>
                      {s.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {s.passed}/{s.total} · {s.lang} ·{' '}
                      {s.createdAt.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section className="min-w-0">
        {provider === 'none' && (
          <p className="mb-3 rounded-md bg-tone-active-soft px-3 py-2 text-sm text-fg">
            No judge is configured. Set <code className="font-mono">OPENROUTER_API_KEY</code> for AI
            review, <code className="font-mono">JUDGE0_URL</code>, or{' '}
            <code className="font-mono">JUDGE_PROVIDER=local</code> for local development.
          </p>
        )}
        {provider === 'ai' && (
          <p className="mb-3 rounded-[var(--radius)] border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-fg">
            <span className="font-mono text-accent-2">AI review</span> · a model reads your code
            against the tests instead of running it. Verdicts are estimates, so a solve counts half
            as much evidence as a judged one.
          </p>
        )}
        <Workspace
          slug={p.problem.slug}
          starter={p.problem.starterCode}
          hints={p.problem.hints}
          editorial={p.problem.referenceSolution.cpp ?? null}
          battleId={battle?.battle.status === 'active' ? battle.battle.id : null}
          preferredLang={pref}
        />
      </section>
    </main>
  );
}
