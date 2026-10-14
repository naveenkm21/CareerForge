'use client';

import Link from 'next/link';
import { MotionConfig, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { FeaturesBento } from './features-bento';
import { Hero } from './hero';
import { LadderTimeline } from './ladder-timeline';
import { fadeUp, inView, stagger } from './variants';

/**
 * Signed-out home page. Always dark, whatever the app theme: it is the product's poster.
 * MotionConfig honours the visitor's reduced-motion setting for every animation below.
 */
export function LandingPage({ algorithmCount }: { algorithmCount: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[#050505] text-zinc-100 selection:bg-violet-500/40">
        <LandingNav />
        <main>
          <Hero />
          <Divider />
          <FeaturesBento algorithmCount={algorithmCount} />
          <Divider />
          <LadderTimeline />
          <FinalCta />
        </main>
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 font-mono text-xs text-zinc-500 sm:px-6">
            <span>CareerForge · every number traces back to something you did</span>
            <span className="flex gap-5">
              <Link href="/viz" className="hover:text-zinc-300">
                Visualizer
              </Link>
              <Link href="/sign-in" className="hover:text-zinc-300">
                Sign in
              </Link>
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050505]/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id="nav-logo" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#nav-logo)" />
            <path
              d="M7 15.5 L10.5 9 L13.5 13 L17 7.5"
              fill="none"
              stroke="#050505"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          CareerForge
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
          <Link href="/viz" className="transition-colors hover:text-white">
            Visualizer
          </Link>
          <Link href="/viz/dijkstra" className="transition-colors hover:text-white">
            Dijkstra demo
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25 hover:shadow-[0_0_24px_-4px_rgba(139,92,246,0.7)]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Divider() {
  return (
    <div
      aria-hidden
      className="mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-white/15 to-transparent"
    />
  );
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden px-4 py-28 sm:px-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(139,92,246,0.25),transparent)]"
      />
      <motion.div
        variants={stagger(0.1)}
        {...inView}
        className="mx-auto flex max-w-3xl flex-col items-center text-center"
      >
        <motion.p variants={fadeUp} className="font-mono text-sm text-cyan-400">
          readiness = f(evidence)
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-4 font-display text-5xl font-bold tracking-[-0.04em] text-white sm:text-6xl"
        >
          Stop guessing.
          <br />
          <span className="bg-gradient-to-r from-violet-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
            Start proving.
          </span>
        </motion.h2>
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
          >
            Start with a target role
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/viz/binary-search"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-zinc-100 transition hover:border-cyan-400/60 hover:text-cyan-100"
          >
            Try the visualizer, no account
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
