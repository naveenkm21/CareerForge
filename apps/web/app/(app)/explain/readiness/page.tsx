import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { loadScoringContext, readinessFor } from '@careerforge/db';
import type { Explanation } from '@careerforge/core';
import { Badge, Card, CardBody, Meter } from '@careerforge/ui';
import { requireOnboarded } from '@/lib/session';

export const metadata: Metadata = { title: 'Why is my readiness this number?' };
export const dynamic = 'force-dynamic';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

/**
 * /explain/readiness — the product feature that separates CareerForge from a vibes-based score:
 * every contributor, its weight, caps, and a link down to the events behind each skill.
 */
export default async function ExplainReadinessPage() {
  const actor = await requireOnboarded();
  const ctx = await loadScoringContext(actor.id);
  const r = await readinessFor(ctx);
  const ex = r.explanation;
  const raw = ex.contributors.reduce((s, c) => s + (c.value ?? 0) * c.weight, 0);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="text-xs text-fg-muted">
        <Link href="/dashboard" className="hover:text-fg">
          Dashboard
        </Link>{' '}
        / Explain
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-normal tracking-[-0.021em] text-fg sm:text-4xl">
          Readiness {pct(r.overall)} · {ctx.role?.title}
        </h1>
        <p className="text-sm text-fg-muted">
          Readiness = Σ pillar × weight. Each pillar is the weighted share of your role’s skills at
          target (clamped, so exceeding one target never hides a gap). Unmeasured skills count as
          zero — no evidence, no credit. Rubric v{r.rubricVersion}.
        </p>
      </header>

      <Card>
        <CardBody className="flex flex-col gap-1 font-mono text-sm">
          {ex.contributors.map((c) => (
            <p key={c.key} className="flex justify-between gap-4">
              <span className="text-fg-muted">
                {c.label} {pct(c.value)} × {c.weight.toFixed(2)}
              </span>
              <span className="text-fg tabular-nums">
                {((c.value ?? 0) * c.weight * 100).toFixed(1)}
              </span>
            </p>
          ))}
          <p className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
            <span>Sum</span>
            <span className="tabular-nums">{(raw * 100).toFixed(1)}%</span>
          </p>
          {ex.caps?.map((c) => (
            <p key={c.by} className="flex justify-between text-tone-active">
              <span>Core blocker cap ({c.by} below 35%)</span>
              <span className="tabular-nums">−{(c.amount * 100).toFixed(1)}</span>
            </p>
          ))}
          <p className="flex justify-between font-semibold text-fg">
            <span>Readiness</span>
            <span className="tabular-nums">{pct(r.overall)}</span>
          </p>
        </CardBody>
      </Card>

      {ex.contributors.map((pillar) => (
        <Pillar
          key={pillar.key}
          p={pillar}
          resumeChecks={pillar.key === 'pillar:resume' ? r.resumeChecks : []}
        />
      ))}
    </main>
  );
}

function Pillar({
  p,
  resumeChecks,
}: {
  p: Explanation;
  resumeChecks: { key: string; label: string; passed: boolean; detail: string }[];
}) {
  const id = p.key.replace('pillar:', 'pillar-');
  return (
    <section id={id} className="scroll-mt-20">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <h2 className="font-normal text-fg">
            {p.label}{' '}
            <span className="font-normal text-fg-muted">· weight {p.weight.toFixed(2)}</span>
          </h2>
          <span className="text-lg font-semibold text-fg">{pct(p.value)}</span>
        </div>
        <CardBody className="flex flex-col gap-1">
          {p.detail && <p className="mb-2 text-sm text-fg-muted">{p.detail}</p>}
          {resumeChecks.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1 text-sm">
              {resumeChecks.map((c) => (
                <li key={c.key} className="flex justify-between gap-3">
                  <span className={c.passed ? 'text-fg' : 'text-fg-muted'}>
                    {c.passed ? '✓' : '✗'} {c.label}
                  </span>
                  <span className="text-xs text-fg-subtle">{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {p.key === 'pillar:resume' && resumeChecks.length === 0 && (
            <p className="text-sm text-fg-muted">
              No resume analysed yet.{' '}
              <Link href="/career/resume" className="text-accent hover:underline">
                Add your resume →
              </Link>
            </p>
          )}
          {p.key === 'pillar:interview' && p.value === null && (
            <p className="text-sm text-fg-muted">
              No mock interview yet.{' '}
              <Link href="/interview" className="text-accent hover:underline">
                Start one →
              </Link>
            </p>
          )}
          {p.contributors.length > 0 && (
            <ul className="flex flex-col">
              {p.contributors.map((s) => (
                <li key={s.key}>
                  <Link
                    href={s.href ?? '#'}
                    className="grid grid-cols-[minmax(0,1fr)_7rem_3rem_1rem] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-b-0 hover:text-accent"
                  >
                    <span className="min-w-0">
                      <span className="text-fg">{s.label}</span>
                      <span className="block text-xs text-fg-subtle">{s.detail}</span>
                      {s.caps?.map((c) => (
                        <Badge key={c.by} tone="warning" className="mt-1">
                          capped by prerequisite {c.by} (−{Math.round(c.amount * 100)})
                        </Badge>
                      ))}
                    </span>
                    <Meter value={s.value} label={`${s.label} share of target`} />
                    <span className="text-right text-xs font-semibold tabular-nums">
                      {pct(s.value)}
                    </span>
                    <ChevronRight size={14} className="text-fg-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
