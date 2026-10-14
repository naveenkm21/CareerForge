'use client';

import { useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@careerforge/ui';
import { pop } from './variants';

/**
 * A glass card whose border and surface light up under the cursor. The cursor position is written
 * to CSS variables on the element, so moving the mouse never re-renders React.
 */
export function SpotlightCard({
  children,
  className,
  glow = '139, 92, 246',
}: {
  children: React.ReactNode;
  className?: string;
  /** "r, g, b" of the spotlight colour. */
  glow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - box.left}px`);
    el.style.setProperty('--my', `${e.clientY - box.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      variants={pop}
      onMouseMove={onMove}
      className={cn('group relative min-w-0 rounded-3xl p-px', className)}
      style={{
        background: `radial-gradient(380px circle at var(--mx, -999px) var(--my, -999px), rgba(${glow}, 0.7), rgba(255, 255, 255, 0.08) 45%)`,
      }}
    >
      <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#0a0a0e]/90 backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(520px circle at var(--mx, -999px) var(--my, -999px), rgba(${glow}, 0.14), transparent 45%)`,
          }}
        />
        <div className="relative flex h-full flex-col p-6 sm:p-8">{children}</div>
      </div>
    </motion.div>
  );
}
