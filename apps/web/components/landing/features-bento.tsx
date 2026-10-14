'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Braces,
  BrainCircuit,
  Check,
  Code,
  ListChecks,
  Lock,
  ScrollText,
  Waypoints,
  X,
} from 'lucide-react';
import { SpotlightCard } from './spotlight-card';
import { fadeUp, inView, stagger } from './variants';

/** One relaxation step, as the code pane shows it in each language. */
const SAME_LINE = [
  { lang: 'C++', code: 'if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;' },
  { lang: 'Java', code: 'if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;' },
  { lang: 'Python', code: 'if dist[u] + w < dist[v]: dist[v] = dist[u] + w' },
  { lang: 'TypeScript', code: 'if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;' },
];

/** Every view the single recorded trace drives. */
const VIEWS = [
  { label: 'Animation', icon: <Waypoints className="h-4 w-4" /> },
  { label: 'Code', icon: <Code className="h-4 w-4" /> },
  { label: 'Variables', icon: <Braces className="h-4 w-4" /> },
  { label: 'Questions', icon: <ListChecks className="h-4 w-4" /> },
];

const LOG = [
  { kind: 'problem.accepted', ref: 'lower-bound', delta: '+0.08' },
  { kind: 'checkpoint.correct', ref: 'dijkstra#4', delta: '+0.03' },
  { kind: 'quiz.answered', ref: 'heaps-q2', delta: '+0.02' },
  { kind: 'explain.graded', ref: 'binary-search', delta: '+0.05' },
  { kind: 'interview.scored', ref: 'round-2', delta: '+0.04' },
];

export function FeaturesBento({ algorithmCount }: { algorithmCount: number }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <motion.div variants={stagger(0.08)} {...inView} className="mb-12 max-w-2xl">
        <motion.p variants={fadeUp} className="font-mono text-sm text-cyan-400">
          {'// what makes it different'}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
        >
          Not another problem list.
        </motion.h2>
      </motion.div>

      <motion.div
        variants={stagger(0.1)}
        {...inView}
        className="grid auto-rows-[minmax(0,auto)] gap-4 md:grid-cols-6"
      >
        <SpotlightCard className="md:col-span-4 md:row-span-2" glow="34, 211, 238">
          <CardIcon icon={<Code className="h-5 w-5" />} tone="cyan" />
          <h3 className="mt-5 font-display text-3xl font-bold tracking-tight text-white">
            One trace, every view
          </h3>
          <p className="mt-3 max-w-lg text-zinc-400">
            {algorithmCount} algorithms, each written once. The animation, line-by-line code in four
            languages and the practice questions all come from the same recorded trace.
          </p>
          <LanguageSwitcher />
        </SpotlightCard>

        <SpotlightCard className="md:col-span-2">
          <CardIcon icon={<BrainCircuit className="h-5 w-5" />} tone="violet" />
          <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-white">
            Predict, don’t just watch
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Practice mode pauses at each decision. A wrong guess gets the invariant you broke, not a
            red X.
          </p>
          <PredictChip />
        </SpotlightCard>

        <SpotlightCard className="md:col-span-2" glow="74, 222, 128">
          <CardIcon icon={<ScrollText className="h-5 w-5" />} tone="green" />
          <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-white">
            Scores you can audit
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Readiness is computed from an append-only evidence log. No evidence, no number.
          </p>
          <EvidenceTicker />
        </SpotlightCard>

        {[
          { n: String(algorithmCount), label: 'algorithms, animated', tone: 'text-cyan-300' },
          { n: '4', label: 'languages, one trace', tone: 'text-violet-300' },
          { n: '0', label: 'numbers without evidence', tone: 'text-green-300' },
        ].map((s) => (
          <SpotlightCard key={s.label} className="md:col-span-2">
            <p className={`font-mono text-6xl font-semibold tracking-tighter ${s.tone}`}>{s.n}</p>
            <p className="mt-2 text-sm text-zinc-400">{s.label}</p>
          </SpotlightCard>
        ))}
      </motion.div>
    </section>
  );
}

function CardIcon({ icon, tone }: { icon: React.ReactNode; tone: 'cyan' | 'violet' | 'green' }) {
  const tones = {
    cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]',
    violet:
      'border-violet-400/30 bg-violet-400/10 text-violet-300 shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)]',
    green:
      'border-green-400/30 bg-green-400/10 text-green-300 shadow-[0_0_24px_-6px_rgba(74,222,128,0.6)]',
  };
  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
      {icon}
    </span>
  );
}

/** Cycles the same line through the four languages, the way the code pane follows one trace. */
function LanguageSwitcher() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % SAME_LINE.length), 1800);
    return () => clearInterval(id);
  }, [reduce]);
  const cur = SAME_LINE[i]!;

  return (
    <div className="mt-auto pt-8">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VIEWS.map((v, k) => (
          <div
            key={v.label}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors duration-500 ${
              k === i % VIEWS.length
                ? 'border-cyan-400/40 bg-cyan-400/[0.08] text-cyan-100'
                : 'border-white/10 bg-white/[0.02] text-zinc-400'
            }`}
          >
            {v.icon}
            {v.label}
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-1.5">
          {SAME_LINE.map((l, k) => (
            <button
              key={l.lang}
              type="button"
              onClick={() => setI(k)}
              className={`relative shrink-0 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                k === i ? 'text-cyan-200' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {k === i && (
                <motion.span
                  layoutId="lang-pill"
                  className="absolute inset-0 rounded-lg bg-cyan-400/10 ring-1 ring-cyan-400/30"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{l.lang}</span>
            </button>
          ))}
        </div>
        <div className="space-y-1 p-4 font-mono text-[13px] leading-6">
          <p className="text-zinc-600"> for (auto [v, w] : adj[u]) {'{'}</p>
          <div className="relative -mx-4 border-l-2 border-cyan-400 bg-cyan-400/[0.07] px-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={cur.lang}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="truncate text-cyan-100"
              >
                {'    '}
                {cur.code}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-zinc-600"> {'}'}</p>
        </div>
      </div>
      <p className="mt-3 font-mono text-xs text-zinc-500">
        same step · same highlight · <span className="text-cyan-300">{cur.lang}</span>
      </p>
    </div>
  );
}

function PredictChip() {
  return (
    <div className="mt-auto space-y-2 pt-6 font-mono text-xs">
      <p className="text-zinc-300">Which node does Dijkstra settle next?</p>
      <div className="flex gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-2.5 py-1.5 text-red-300">
          <X className="h-3.5 w-3.5" /> D
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-green-400/30 bg-green-400/10 px-2.5 py-1.5 text-green-300">
          <Check className="h-3.5 w-3.5" /> B
        </span>
      </div>
      <p className="leading-5 text-zinc-500">Invariant: settle the smallest tentative distance.</p>
    </div>
  );
}

/** Evidence rows scroll up and new ones append; nothing is ever edited. */
function EvidenceTicker() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(3);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setN((k) => k + 1), 1600);
    return () => clearInterval(id);
  }, [reduce]);
  const rows = Array.from({ length: 3 }, (_, k) => {
    const idx = n - 3 + k;
    return { idx, ...LOG[idx % LOG.length]! };
  });

  return (
    <div className="mt-auto pt-6">
      <div className="space-y-1 overflow-hidden rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11.5px]">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.idx}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="flex justify-between gap-2"
            >
              <span className="truncate text-zinc-400">
                <span className="text-zinc-600">#{String(1200 + r.idx).padStart(5, '0')}</span>{' '}
                {r.kind}
              </span>
              <span className="text-green-400">{r.delta}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
        <Lock className="h-3 w-3" /> UPDATE / DELETE rejected by the database
      </p>
    </div>
  );
}
