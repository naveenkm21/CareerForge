'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Lock } from 'lucide-react';
import { cn } from '@careerforge/ui';

/**
 * The hero's side figure: the product's rule in motion. Evidence lands in an append-only log,
 * a dot carries it up the line, and the readiness number moves only when evidence arrives.
 * Flat, hairline, one cyan, per DESIGN.md.
 */

const EVENTS = [
  { kind: 'problem.accepted', ref: 'lower-bound' },
  { kind: 'checkpoint.correct', ref: 'dijkstra #4' },
  { kind: 'explain.graded', ref: 'binary-search' },
  { kind: 'quiz.answered', ref: 'heaps q2' },
  { kind: 'interview.scored', ref: 'round 2' },
];
const START = 44;
const EVERY_MS = 2200;

export function EvidenceFlow({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  // How many events have landed in the current loop (0..EVENTS.length).
  const [landed, setLanded] = useState(0);
  // Ever-increasing counter, so each arrival has a unique key and a fresh dot.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Reduced motion: show the settled state, no loop. (Set after mount: the server can't know.)
    if (reduce) {
      setLanded(EVENTS.length);
      return;
    }
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setLanded((n) => (n >= EVENTS.length ? 0 : n + 1));
    }, EVERY_MS);
    return () => clearInterval(id);
  }, [reduce]);

  const value = START + landed;
  const rows = Array.from({ length: Math.min(landed, 3) }, (_, i) => {
    const idx = landed - 1 - i;
    return { ...EVENTS[idx]!, idx, id: tick - i };
  });

  return (
    <div className={cn('flex flex-col items-stretch', className)} aria-hidden>
      {/* the number */}
      <div className="rounded-[10px] border border-lp-border bg-lp-card px-5 pt-4 pb-3 shadow-lp-md">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] text-lp-ash">Readiness · Software Engineer</p>
          <p className="text-[12px] text-lp-ash">{landed} new</p>
        </div>
        <div className="relative mt-2 flex justify-center">
          <svg viewBox="0 0 200 108" className="w-[180px]">
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--lp-border)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <motion.path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--lp-cyan)"
              strokeWidth="10"
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: value / 100 }}
              transition={{ type: 'spring', stiffness: 80, damping: 16 }}
            />
          </svg>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 font-tight text-[40px] leading-none font-normal tracking-[-0.03em] text-lp-ink tabular-nums"
            >
              {value}%
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* the connection: a dot carries each new event up into the number */}
      <div className="relative mx-auto h-8 w-px border-l border-dashed border-lp-muted">
        <AnimatePresence>
          {!reduce && landed > 0 && (
            <motion.span
              key={tick}
              className="absolute -left-[4px] h-[7px] w-[7px] rounded-full bg-lp-cyan"
              initial={{ top: 26, opacity: 0 }}
              animate={{ top: -2, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* the evidence */}
      <div className="rounded-[10px] border border-lp-border bg-lp-card px-4 py-3 shadow-lp-md">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-lp-ash">Evidence log</p>
          <p className="flex items-center gap-1 text-[12px] text-lp-ash">
            <Lock className="h-3 w-3" strokeWidth={1.5} /> append-only
          </p>
        </div>
        <ul className="mt-2 h-[84px] overflow-hidden font-mono text-[12px]">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex h-7 items-center justify-between gap-3 border-b border-lp-border last:border-b-0"
              >
                <span className="truncate text-lp-ink">
                  {r.kind} <span className="text-lp-ash">{r.ref}</span>
                </span>
                <span className="text-lp-hl">+1</span>
              </motion.li>
            ))}
          </AnimatePresence>
          {rows.length === 0 && (
            <li className="flex h-7 items-center text-lp-ash">waiting for evidence…</li>
          )}
        </ul>
      </div>
    </div>
  );
}
