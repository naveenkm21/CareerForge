'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MotionConfig } from 'motion/react';
import { useTheme } from 'next-themes';
import { ArrowRight, Check, Lock, Moon, Sun } from 'lucide-react';
import { cn } from '@careerforge/ui';
import { Mascot } from './mascot';
import { ProductPreview } from './product-preview';
import {
  Eyebrow,
  GhostButton,
  Highlight,
  LogoMark,
  PrimaryCta,
  Reveal,
  SectionHeading,
} from './primitives';

/**
 * Signed-out home page, built to DESIGN.md ("quiet analyst's desk on warm paper"): warm stone
 * canvas, one cyan accent, whisper-weight headlines with one highlighted phrase each, hairline
 * cards, pill controls. Light and dark both come from the same stone scale.
 */
export function LandingPage({ algorithmCount }: { algorithmCount: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="lp min-h-dvh bg-lp-canvas font-sans text-[14px] leading-[1.64] tracking-[0.004em] text-lp-body">
        <Nav />
        <main className="lp-main">
          <Hero algorithmCount={algorithmCount} />
          <Topics />
          <Features algorithmCount={algorithmCount} />
          <Ladder />
          <Scores />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

const WRAP = 'mx-auto w-full max-w-[1200px] px-5 sm:px-8';

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-lp-border bg-lp-canvas">
      <div className={cn(WRAP, 'flex h-16 items-center gap-6')}>
        <Link href="/" className="flex items-center gap-2 text-[14px] font-medium text-lp-ink">
          <LogoMark />
          CareerForge
        </Link>
        <nav aria-label="Landing" className="mx-auto hidden items-center lg:flex">
          {[
            ['Product', '#product'],
            ['The ladder', '#ladder'],
            ['How scores work', '#scores'],
            ['Visualizer', '/viz'],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href!}
              className="flex h-8 items-center px-3 text-[14px] whitespace-nowrap text-lp-body transition-colors hover:text-lp-ink"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeSwitch />
          <Link
            href="/sign-in"
            className="hidden h-8 items-center px-3 text-[14px] whitespace-nowrap text-lp-body hover:text-lp-ink sm:flex"
          >
            Sign in
          </Link>
          <GhostButton href="/sign-up">Get started</GhostButton>
        </div>
      </div>
    </header>
  );
}

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-lp-border text-lp-body transition-colors hover:text-lp-ink"
    >
      {mounted ? (
        dark ? (
          <Sun className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <Moon className="h-4 w-4" strokeWidth={1.5} />
        )
      ) : null}
    </button>
  );
}

function Hero({ algorithmCount }: { algorithmCount: number }) {
  return (
    <section className={cn(WRAP, 'pt-16 pb-24 sm:pt-24')}>
      <Reveal className="max-w-[760px]">
        <p className="inline-flex items-center gap-2 rounded-full border border-lp-border bg-lp-card px-3 py-1 text-[12px] text-lp-body shadow-lp-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-lp-cyan" />
          Code → See → Understand → Solve
        </p>
        <h1 className="mt-6 font-tight text-[40px] leading-[1.12] font-normal tracking-[-0.021em] text-lp-ink sm:text-[52px]">
          Prove you’re job-ready <Highlight>with evidence</Highlight>, not vibes.
        </h1>
        <p className="mt-5 max-w-[620px] text-[16px] leading-[1.69] text-lp-body">
          Pick a target role. CareerForge measures where you actually are, then takes you through
          visual lessons, active practice, and interviews, and every number it shows traces back to
          something you did.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryCta href="/sign-up">
            Start with a target role <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </PrimaryCta>
          <GhostButton href="/viz/binary-search">Try the visualizer, no account</GhostButton>
        </div>
        <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-lp-body">
          {[
            `${algorithmCount} algorithms animated`,
            '4 languages, one trace',
            'Every number auditable',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-lp-ink" strokeWidth={1.75} />
              {t}
            </span>
          ))}
        </p>
      </Reveal>
      <Reveal className="mt-20" delay={0.1}>
        <ProductPreview />
      </Reveal>
    </section>
  );
}

function Topics() {
  return (
    <section className="border-y border-lp-border bg-lp-card/40">
      <div className={cn(WRAP, 'flex flex-col items-center gap-4 py-10')}>
        <p className="text-[13px] text-lp-body">Covers what interviews actually test</p>
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 font-tight text-[17px] tracking-[-0.017em] text-lp-ash">
          {[
            'Arrays',
            'Binary search',
            'Two pointers',
            'Trees',
            'Graphs',
            'Heaps',
            'Dynamic programming',
            'Operating systems',
            'Networks',
          ].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Features({ algorithmCount }: { algorithmCount: number }) {
  return (
    <section id="product" className={cn(WRAP, 'flex scroll-mt-20 flex-col gap-24 py-24')}>
      <FeatureRow
        eyebrow="Visualize"
        title={
          <>
            One trace, <Highlight>every view</Highlight>.
          </>
        }
        body={`${algorithmCount} algorithms, each written once. The animation, line-by-line code in C++, Java, Python and TypeScript, and the practice questions all come from the same recorded trace, so they can never disagree.`}
        visual={<TraceCard />}
      />
      <FeatureRow
        flip
        eyebrow="Practice"
        title={
          <>
            Predict, <Highlight>don’t just watch</Highlight>.
          </>
        }
        body="Practice mode pauses at each decision: which half survives, which node Dijkstra settles next. A wrong guess gets the invariant you broke, not a red cross."
        visual={<PredictCard />}
      />
      <FeatureRow
        eyebrow="Measure"
        title={
          <>
            Scores you can <Highlight>audit</Highlight>.
          </>
        }
        body="Readiness is computed from an append-only evidence log. No evidence, no number: a new account starts honestly empty, and the database refuses to rewrite history."
        visual={<EvidenceCard />}
      />
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  visual,
  flip,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <Reveal className={cn('min-w-0', flip && 'md:order-2')}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <SectionHeading>{title}</SectionHeading>
        <p className="mt-4 max-w-[460px] text-[14px] leading-[1.64] text-lp-body">{body}</p>
      </Reveal>
      <Reveal delay={0.08} className={cn('min-w-0', flip && 'md:order-1')}>
        {visual}
      </Reveal>
    </div>
  );
}

const card = 'rounded-[10px] border border-lp-border bg-lp-card p-6 shadow-lp-md';

function TraceCard() {
  const lines = [
    ['C++', 'if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;'],
    ['Java', 'if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;'],
    ['Python', 'if dist[u] + w < dist[v]: dist[v] = dist[u] + w'],
    ['TypeScript', 'if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;'],
  ];
  return (
    <div className={card}>
      <p className="text-[12px] text-lp-ash">Step 14 of 43 · relax edge B → D</p>
      <ul className="mt-4 space-y-2">
        {lines.map(([lang, code], i) => (
          <li key={lang} className="grid grid-cols-[84px_1fr] items-center gap-3">
            <span className="text-[12px] text-lp-body">{lang}</span>
            <code
              className={cn(
                'min-w-0 truncate rounded-[6px] px-2.5 py-1.5 font-mono text-[12px]',
                i === 1 ? 'bg-lp-wash text-lp-hl' : 'border border-lp-border text-lp-ink',
              )}
            >
              {code}
            </code>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-lp-ash">Same step, same highlight, in every language.</p>
    </div>
  );
}

function PredictCard() {
  return (
    <div className={card}>
      <p className="text-[12px] text-lp-ash">Checkpoint · Dijkstra</p>
      <p className="mt-2 font-tight text-[20px] leading-[1.22] tracking-[-0.017em] text-lp-ink">
        Which node does Dijkstra settle next?
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['B', 'correct'],
          ['D', 'your guess'],
          ['E', ''],
        ].map(([n, note]) => (
          <div
            key={n}
            className={cn(
              'rounded-[10px] border px-3 py-2.5 text-center',
              note === 'correct' ? 'border-lp-cyan-edge' : 'border-lp-border',
            )}
          >
            <p
              className={cn(
                'text-[16px]',
                note === 'your guess' ? 'text-lp-ash line-through' : 'text-lp-ink',
              )}
            >
              {n}
            </p>
            <p className="text-[11px] text-lp-ash">{note || ' '}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-[6px] border border-lp-border px-3 py-2 text-[13px] text-lp-body">
        <span className="text-lp-ink">Invariant:</span> always settle the smallest tentative
        distance. B is 3; D is still 11.
      </p>
    </div>
  );
}

function EvidenceCard() {
  const rows = [
    ['problem.accepted', 'lower-bound', '+0.08'],
    ['checkpoint.correct', 'dijkstra #4', '+0.03'],
    ['explain.graded', 'binary-search', '+0.05'],
    ['interview.scored', 'round 2', '+0.04'],
  ];
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-lp-ash">Evidence log</p>
        <p className="flex items-center gap-1.5 text-[12px] text-lp-body">
          <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> append-only
        </p>
      </div>
      <ul className="mt-3 divide-y divide-lp-border font-mono text-[12px]">
        {rows.map(([kind, ref, delta], i) => (
          <li key={kind} className="flex justify-between gap-3 py-2.5">
            <span className="text-lp-ash">#{String(1201 + i).padStart(5, '0')}</span>
            <span className="flex-1 truncate text-lp-ink">
              {kind} <span className="text-lp-ash">{ref}</span>
            </span>
            <span className="text-lp-ink">{delta}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-lp-ash">
        UPDATE and DELETE are rejected by the database.
      </p>
    </div>
  );
}

const STAGES = [
  ['Understand', 'The idea in plain words, and the problem it exists to solve.'],
  ['Visualize', 'Watch it move on real data before reading code.'],
  ['Trace', 'Step line by line and see every variable change.'],
  ['Predict', 'Call the next move before it happens.'],
  ['Implement', 'Write it yourself in C++, Java, Python or JavaScript.'],
  ['Test', 'Hidden tests judge it, with the exact failing case.'],
  ['Explain', 'Explain it in words; a rubric grades it.'],
  ['Interview', 'Answer it the way an interviewer asks.'],
];

function Ladder() {
  return (
    <section id="ladder" className="scroll-mt-20 border-t border-lp-border">
      <div className={cn(WRAP, 'py-24')}>
        <Reveal className="relative max-w-[640px]">
          <Eyebrow>The ladder</Eyebrow>
          <SectionHeading>
            Every topic, <Highlight>the same eight steps</Highlight>.
          </SectionHeading>
          <p className="mt-4 text-[14px] text-lp-body">
            From first intuition to interview answer. Each step leaves evidence behind, so progress
            is something you can point at.
          </p>
        </Reveal>
        <div className="relative mt-12">
          <Mascot
            pose="coffee"
            className="absolute -top-[85px] right-6 z-10 hidden w-[130px] lg:block"
          />
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map(([name, body], i) => (
              <li key={name}>
                <Reveal
                  delay={i * 0.04}
                  className="h-full rounded-[10px] border border-lp-border bg-lp-card p-6"
                >
                  <p className="font-mono text-[12px] text-lp-ash">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-3 font-tight text-[20px] leading-[1.22] tracking-[-0.017em] text-lp-ink">
                    {name}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-[1.53] text-lp-body">{body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Scores() {
  const rows: [string, string, string, string][] = [
    ['DSA', '69%', '0.30', '20.6'],
    ['CS fundamentals', '50%', '0.18', '9.0'],
    ['Development', '20%', '0.15', '2.9'],
    ['Projects', '—', '0.12', '0.0'],
    ['Resume', '67%', '0.10', '6.7'],
    ['Interview', '65%', '0.15', '9.7'],
  ];
  return (
    <section id="scores" className="scroll-mt-20 border-t border-lp-border">
      <div className={cn(WRAP, 'grid items-center gap-12 py-24 md:grid-cols-2 md:gap-16')}>
        <Reveal>
          <Eyebrow>How scores work</Eyebrow>
          <SectionHeading>
            How a number is <Highlight>made</Highlight>.
          </SectionHeading>
          <p className="mt-4 max-w-[460px] text-[14px] text-lp-body">
            Readiness is the weighted sum of six pillars, each the share of your role’s skills you
            have actually shown. Click it in the app and you get this exact arithmetic, then the
            skills, then the individual events behind them.
          </p>
          <p className="mt-4 max-w-[460px] text-[14px] text-lp-body">
            AI helps grade explanations and interviews, but it only picks a level. The numbers are
            always computed in code.
          </p>
        </Reveal>
        <Reveal delay={0.08} className={cn(card, 'min-w-0')}>
          <p className="text-[12px] text-lp-ash">Readiness · Software Engineer</p>
          <table className="mt-3 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-lp-ash">
                <th className="pb-2 font-normal">Pillar</th>
                <th className="pb-2 text-right font-normal">Score</th>
                <th className="pb-2 text-right font-normal">Weight</th>
                <th className="pb-2 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              {rows.map(([p, s, w, pts]) => (
                <tr key={p} className="border-t border-lp-border">
                  <td className="py-2 font-sans text-[13px] text-lp-ink">{p}</td>
                  <td className="py-2 text-right text-lp-body">{s}</td>
                  <td className="py-2 text-right text-lp-body">× {w}</td>
                  <td className="py-2 text-right text-lp-ink">{pts}</td>
                </tr>
              ))}
              <tr className="border-t border-lp-ink">
                <td className="pt-3 font-sans text-[13px] text-lp-ink">Readiness</td>
                <td colSpan={3} className="pt-3 text-right">
                  <span className="rounded-[4px] bg-lp-wash px-2 py-0.5 text-lp-hl">49%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={cn(WRAP, 'pb-24')}>
      <Reveal className="rounded-2xl bg-lp-inv-bg px-6 py-16 text-center sm:px-12">
        <h2 className="mx-auto max-w-[640px] font-tight text-[32px] leading-[1.18] font-normal tracking-[-0.021em] text-lp-inv-fg sm:text-[44px]">
          Stop guessing. <Highlight inverted>Start proving.</Highlight>
        </h2>
        <p className="mx-auto mt-4 max-w-[480px] text-[15px] text-lp-inv-body">
          Pick a role, take the ten-minute placement, and get a readiness number you can explain to
          anyone.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PrimaryCta href="/sign-up">
            Start with a target role <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </PrimaryCta>
          <GhostButton href="/viz/binary-search" inverted>
            Try the visualizer
          </GhostButton>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-lp-border">
      <div
        className={cn(
          WRAP,
          'flex flex-wrap items-center justify-between gap-4 py-8 text-[13px] text-lp-body',
        )}
      >
        <span className="flex items-center gap-2 text-lp-ink">
          <LogoMark className="h-4 w-4" /> CareerForge
        </span>
        <span>Every number traces back to something you did.</span>
        <span className="flex gap-5">
          <Link href="/viz" className="hover:text-lp-ink">
            Visualizer
          </Link>
          <Link href="/sign-in" className="hover:text-lp-ink">
            Sign in
          </Link>
        </span>
      </div>
    </footer>
  );
}
