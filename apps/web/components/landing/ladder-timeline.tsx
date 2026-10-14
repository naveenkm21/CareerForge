'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { fadeUp, inView, stagger } from './variants';

const STAGES = [
  { name: 'Understand', body: 'The idea in plain words, and the problem it exists to solve.' },
  { name: 'Visualize', body: 'Watch it move on real data before reading a single line.' },
  { name: 'Trace', body: 'Step line by line and see every variable change.' },
  {
    name: 'Predict',
    body: 'Call the next move before it happens. Wrong guesses teach the invariant.',
  },
  { name: 'Implement', body: 'Write it yourself in C++, Java, Python or JavaScript.' },
  { name: 'Test', body: 'Hidden tests judge it: accepted, or the exact failing case.' },
  { name: 'Explain', body: 'Explain it in words; a rubric grades the explanation.' },
  { name: 'Interview', body: 'Answer it the way an interviewer asks, follow-ups included.' },
];

const SIZE = 460;
const C = SIZE / 2;
const R = 168;

/** Rounded so server and browser render identical numbers (Math.cos differs in the last digits). */
const round = (n: number) => Math.round(n * 100) / 100;

function point(i: number, r = R) {
  const a = ((-90 + i * 45) * Math.PI) / 180;
  return { x: round(C + r * Math.cos(a)), y: round(C + r * Math.sin(a)) };
}

export function LadderTimeline() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (reduce || !auto) return;
    const id = setInterval(() => setActive((n) => (n + 1) % STAGES.length), 2600);
    return () => clearInterval(id);
  }, [reduce, auto]);

  const choose = (i: number) => {
    setAuto(false);
    setActive(i);
  };
  const stage = STAGES[active]!;

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <motion.div variants={stagger(0.08)} {...inView} className="mb-14 max-w-2xl">
        <motion.p variants={fadeUp} className="font-mono text-sm text-violet-400">
          {'// the ladder'}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl"
        >
          Every topic, the same eight steps.
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-zinc-400">
          From first intuition to interview answer. Each step leaves evidence behind.
        </motion.p>
      </motion.div>

      <div className="grid items-center gap-12 lg:grid-cols-[480px_1fr]">
        {/* Blueprint wheel */}
        <motion.div
          initial={{ opacity: 0, rotate: -20, scale: 0.9 }}
          whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          className="relative mx-auto hidden aspect-square w-full max-w-[520px] lg:block"
        >
          {/* Padded viewBox: the stage names sit outside the ring. */}
          <svg
            viewBox={`-60 -60 ${SIZE + 120} ${SIZE + 120}`}
            className="h-full w-full"
            aria-hidden
          >
            <circle
              cx={C}
              cy={C}
              r={R + 40}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2 6"
            />
            <circle cx={C} cy={C} r={R - 52} fill="none" stroke="rgba(255,255,255,0.06)" />
            {Array.from({ length: 72 }, (_, k) => {
              const a = ((k * 5 - 90) * Math.PI) / 180;
              const long = k % 9 === 0;
              const r1 = R + 18;
              const r2 = R + (long ? 30 : 24);
              return (
                <line
                  key={k}
                  x1={round(C + r1 * Math.cos(a))}
                  y1={round(C + r1 * Math.sin(a))}
                  x2={round(C + r2 * Math.cos(a))}
                  y2={round(C + r2 * Math.sin(a))}
                  stroke={long ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.12)'}
                />
              );
            })}
            {/* Blueprint crosshair, stopping short of the centre label. */}
            {[
              [C, C - R - 50, C, C - R + 52],
              [C, C + R - 52, C, C + R + 50],
              [C - R - 50, C, C - R + 52, C],
              [C + R - 52, C, C + R + 50, C],
            ].map(([x1, y1, x2, y2], k) => (
              <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.06)" />
            ))}
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={2}
            />
            <motion.circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="url(#ladder-grad)"
              strokeWidth={3}
              strokeLinecap="round"
              transform={`rotate(-90 ${C} ${C})`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: active / STAGES.length }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            />
            <defs>
              <linearGradient id="ladder-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            {STAGES.map((s, i) => {
              const p = point(i);
              const label = point(i, R + 62);
              const done = i < active;
              const cur = i === active;
              return (
                <g key={s.name} className="cursor-pointer" onClick={() => choose(i)}>
                  {cur && (
                    <motion.circle
                      cx={p.x}
                      cy={p.y}
                      r={30}
                      fill="rgba(34,211,238,0.15)"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={19}
                    fill={cur ? '#22d3ee' : done ? 'rgba(167,139,250,0.25)' : '#0a0a0e'}
                    stroke={cur ? '#22d3ee' : done ? '#a78bfa' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={2}
                  />
                  <text
                    x={p.x}
                    y={p.y + 5}
                    textAnchor="middle"
                    className={`font-mono text-[14px] font-semibold ${cur ? 'fill-black' : 'fill-zinc-200'}`}
                  >
                    {i + 1}
                  </text>
                  <text
                    x={label.x}
                    y={label.y + 4}
                    textAnchor="middle"
                    className={`font-mono text-[12px] tracking-wider uppercase ${cur ? 'fill-cyan-300' : 'fill-zinc-500'}`}
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.25 }}
                className="w-48 text-center"
              >
                <p className="font-mono text-xs text-zinc-500">
                  {String(active + 1).padStart(2, '0')} / 08
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-white">{stage.name}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stepping stones: the accessible control, and the whole layout on small screens */}
        <motion.ol variants={stagger(0.06)} {...inView} className="relative space-y-2">
          <span
            aria-hidden
            className="absolute top-4 bottom-4 left-[19px] w-px bg-gradient-to-b from-violet-500/50 via-cyan-400/40 to-transparent"
          />
          {STAGES.map((s, i) => {
            const cur = i === active;
            return (
              <motion.li key={s.name} variants={fadeUp}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  onMouseEnter={() => choose(i)}
                  aria-current={cur ? 'step' : undefined}
                  className={`relative flex w-full items-start gap-4 rounded-2xl border px-3 py-3 text-left transition-colors ${
                    cur
                      ? 'border-cyan-400/30 bg-cyan-400/[0.06]'
                      : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`relative z-10 flex h-[22px] w-[22px] shrink-0 translate-y-0.5 items-center justify-center rounded-full border font-mono text-[11px] ${
                      cur
                        ? 'border-cyan-300 bg-cyan-400 text-black shadow-[0_0_16px_rgba(34,211,238,0.8)]'
                        : i < active
                          ? 'border-violet-400 bg-violet-500/30 text-violet-100'
                          : 'border-white/20 bg-[#0a0a0e] text-zinc-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span
                      className={`font-display text-lg font-semibold ${cur ? 'text-white' : 'text-zinc-300'}`}
                    >
                      {s.name}
                    </span>
                    <AnimatePresence initial={false}>
                      {cur && (
                        <motion.span
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="block overflow-hidden text-sm text-zinc-400"
                        >
                          <span className="block pt-1">{s.body}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
