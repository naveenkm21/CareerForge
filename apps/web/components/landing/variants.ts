import type { Transition, Variants } from 'motion/react';

/** Shared motion vocabulary for the landing page, so every section enters the same way. */

export const spring: Transition = { type: 'spring', stiffness: 140, damping: 20, mass: 0.8 };
export const springPop: Transition = { type: 'spring', stiffness: 280, damping: 18 };

/** Fades up from slightly below, un-blurring as it settles. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring },
};

/** Springy scale-in for cards and chips. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: springPop },
};

/** Parent that reveals its children one after another. */
export function stagger(every = 0.08, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: every, delayChildren: delay } },
  };
}

/** Reveal once, a little before the section is fully on screen. */
export const inView = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.25 },
} as const;
