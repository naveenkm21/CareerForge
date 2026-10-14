'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { TraceVisual } from './trace-visual';
import { fadeUp, pop, stagger } from './variants';

const EYEBROW = ['Code', 'See', 'Understand', 'Solve'];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden">
      <Backdrop drift={!reduce} />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-24 lg:pb-32">
        <motion.div
          variants={stagger(0.1, 0.1)}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-7"
        >
          <motion.p
            variants={pop}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 font-mono text-xs text-zinc-300 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            {EYEBROW.map((w, i) => (
              <span key={w} className="flex items-center gap-2">
                {i > 0 && <span className="text-violet-400">→</span>}
                {w}
              </span>
            ))}
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl leading-[0.95] font-bold tracking-[-0.04em] text-white sm:text-6xl xl:text-7xl"
          >
            Prove you’re job-ready{' '}
            <span className="bg-[linear-gradient(100deg,#ffffff_10%,#c4b5fd_35%,#22d3ee_55%,#a78bfa_75%,#ffffff_95%)] bg-[length:250%_100%] bg-clip-text text-transparent motion-safe:animate-gradient-pan">
              with evidence, not vibes.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-xl text-lg leading-relaxed text-zinc-400">
            Pick a target role. CareerForge measures where you actually are, then takes you through
            visual lessons, active practice, and interviews, and{' '}
            <span className="text-zinc-200">
              every number it shows traces back to something you did.
            </span>
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-violet-500 px-6 py-3.5 font-semibold text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.8)] transition hover:bg-violet-400 hover:shadow-[0_0_60px_-6px_rgba(139,92,246,0.9)]"
            >
              Start with a target role
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/viz/binary-search"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 font-semibold text-zinc-100 backdrop-blur transition hover:border-cyan-400/60 hover:bg-cyan-400/[0.06] hover:text-cyan-100"
            >
              <Play className="h-4 w-4 text-cyan-400" />
              Try the visualizer, no account
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotateX: 8 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.35 }}
          style={{ perspective: 1200 }}
        >
          <TraceVisual />
        </motion.div>
      </div>
    </section>
  );
}

/** Mesh-gradient blobs over a fading dot matrix. */
function Backdrop({ drift }: { drift: boolean }) {
  const float = (x: number, y: number, duration: number) =>
    drift
      ? {
          animate: { x: [0, x, 0], y: [0, y, 0] },
          transition: { duration, repeat: Infinity, ease: 'easeInOut' as const },
        }
      : {};
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)] [background-size:22px_22px]" />
      <motion.div
        {...float(60, 40, 18)}
        className="absolute -top-40 left-[8%] h-[520px] w-[520px] rounded-full bg-violet-600/30 blur-[120px]"
      />
      <motion.div
        {...float(-50, 60, 22)}
        className="absolute top-20 right-[2%] h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-[120px]"
      />
      <motion.div
        {...float(40, -40, 26)}
        className="absolute bottom-[-180px] left-[40%] h-[380px] w-[380px] rounded-full bg-fuchsia-600/15 blur-[120px]"
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#050505]" />
    </div>
  );
}
