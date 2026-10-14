'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@careerforge/ui';

/**
 * Building blocks for the landing page, following DESIGN.md: stone neutrals, one cyan,
 * weight-400 display type, hairline borders, pill controls. No gradients, no glass.
 */

/** The signature move: one value-prop phrase per headline, cyan text on a sky-wash pill. */
export function Highlight({
  children,
  inverted,
}: {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <span
      className={cn(
        'rounded-[4px] px-2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]',
        inverted ? 'bg-lp-inv-wash text-lp-inv-hl' : 'bg-lp-wash text-lp-hl',
      )}
    >
      {children}
    </span>
  );
}

/** The one filled, chromatic control. Use at most once per viewport. */
export function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-lp-cyan-edge bg-lp-cyan px-5 text-sm font-medium text-[#0c0a09] shadow-lp-subtle transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-cyan"
    >
      {children}
    </Link>
  );
}

/** Quiet companion to the cyan CTA. */
export function GhostButton({
  href,
  children,
  inverted,
}: {
  href: string;
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-cyan',
        inverted
          ? 'border-lp-inv-border text-lp-inv-fg hover:border-lp-inv-body'
          : 'border-lp-border text-lp-ink hover:border-lp-muted hover:bg-lp-card',
      )}
    >
      {children}
    </Link>
  );
}

/** Calm entrance: a short rise and fade, once, as the block scrolls in. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/** 32px section heading, weight 400, tight tracking. */
export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'font-tight text-[28px] leading-[1.25] font-normal tracking-[-0.025em] text-lp-ink sm:text-[32px]',
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Small uppercase-free label above a section, Inter 13px. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[13px] tracking-[0.004em] text-lp-body">{children}</p>;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5 text-lp-ink', className)} aria-hidden>
      <path
        d="M4 16.5 L9 8.5 L13 13.5 L20 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="5" r="2.2" fill="var(--lp-cyan)" />
    </svg>
  );
}
