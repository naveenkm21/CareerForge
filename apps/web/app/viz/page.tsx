import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_LABELS, listAlgorithms, type AlgorithmCategory } from '@careerforge/viz';
import { Badge } from '@careerforge/ui';

export const metadata: Metadata = {
  title: 'Algorithm visualizer',
  description:
    'Step through 20 algorithms with synchronized C++, Java, Python and TypeScript — and predict each next step.',
};

const KIND_LABELS: Record<string, string> = {
  array: 'Array',
  matrix: 'Grid',
  tree: 'Tree',
  graph: 'Graph',
  stack: 'Stack',
  queue: 'Queue',
  table: 'Table',
};

export default function VizGalleryPage() {
  const all = listAlgorithms();
  const categories = [...new Set(all.map((a) => a.category))] as AlgorithmCategory[];
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">See every step.</h1>
        <p className="mt-2 text-fg-muted">
          Each algorithm is one reference implementation that records a trace. The animation, the
          highlighted code in four languages, the variable panel and the practice questions all come
          from that same trace — so they can never disagree.
        </p>
      </header>
      {categories.map((c) => (
        <section key={c} aria-labelledby={`cat-${c}`}>
          <h2
            id={`cat-${c}`}
            className="font-mono mb-3 text-xs font-semibold tracking-wider text-fg-subtle uppercase"
          >
            {CATEGORY_LABELS[c]}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {all
              .filter((a) => a.category === c)
              .map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/viz/${a.id}`}
                    className="group flex h-full flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-accent"
                  >
                    <span className="font-semibold text-fg group-hover:text-accent">{a.title}</span>
                    <span className="text-sm text-fg-muted">{a.summary}</span>
                    <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      <Badge>{a.complexity.time}</Badge>
                      {a.structureKinds.map((k) => (
                        <Badge key={k} tone="accent">
                          {KIND_LABELS[k] ?? k}
                        </Badge>
                      ))}
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
