'use client';

import { useEffect } from 'react';

const TARGETS = '.bg-surface, [data-spotlight]';

/**
 * One listener for the whole app: writes the pointer position into --mx/--my on the panel under
 * the cursor, which globals.css turns into a soft spotlight. Cards need no code of their own, and
 * moving the mouse never re-renders React.
 */
export function SpotlightTracker() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    let last: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(TARGETS) ?? null;
      if (last && last !== el) {
        last.style.removeProperty('--mx');
        last.style.removeProperty('--my');
      }
      last = el;
      if (!el) return;
      const box = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - box.left}px`);
      el.style.setProperty('--my', `${e.clientY - box.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);
  return null;
}
