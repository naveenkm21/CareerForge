import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getIdentity } from '@careerforge/auth/server';
import { buttonClasses } from '@careerforge/ui';
import { listAlgorithms } from '@careerforge/viz';

const LADDER = [
  'Understand',
  'Visualize',
  'Trace',
  'Predict',
  'Implement',
  'Test',
  'Explain',
  'Interview',
];

export default async function Home() {
  if (await getIdentity().catch(() => null)) redirect('/dashboard');
  const count = listAlgorithms().length;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-24">
      <section className="flex max-w-3xl flex-col gap-5">
        <p className="font-mono text-sm text-accent">Code → See → Understand → Solve</p>
        <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Prove you’re job-ready — with evidence, not vibes.
        </h1>
        <p className="text-lg text-fg-muted">
          Pick a target role. CareerForge measures where you actually are, then takes you through
          visual lessons, active practice, and interviews — and every number it shows traces back to
          something you did.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up" className={buttonClasses('primary', 'md')}>
            Start with a target role
          </Link>
          <Link href="/viz/binary-search" className={buttonClasses('secondary', 'md')}>
            Try the visualizer — no account
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'One trace, every view',
            body: `${count} algorithms, each written once. Animation, line-by-line code in C++, Java, Python and TypeScript, and practice questions all derive from the same recorded trace.`,
          },
          {
            title: 'Predict, don’t just watch',
            body: 'Practice mode pauses at each decision — which half survives, which node Dijkstra settles next — and answers a wrong guess with the invariant you broke.',
          },
          {
            title: 'Scores you can audit',
            body: 'Readiness is a projection of an append-only evidence log. No evidence, no number: a new account starts honestly empty.',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-[var(--radius)] border border-border bg-surface p-5"
          >
            <h2 className="font-semibold text-fg">{f.title}</h2>
            <p className="mt-1.5 text-sm text-fg-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
          Every topic is the same eight-stage ladder
        </h2>
        <ol className="flex flex-wrap gap-2">
          {LADDER.map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-xs text-fg-subtle">{i + 1}</span>
              <span className="text-fg">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
