'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@careerforge/ui';

/**
 * The mascot sticker: a student developer in a crew-neck tee (glasses, messy hair, headphones round
 * the neck) peeking over the edge of a card. Outline-only in ink on the card colour, with a sticker
 * drop-shadow and one cyan dot. Its only motion is eye contact: it watches the cursor, turns its
 * head after it like a person would (a beat later, a little spring), smiles when you come close,
 * and blinks now and then.
 *
 * The bottom ~13% of the drawing overlaps the card it sits on, so position it with that edge on
 * the card's top border.
 *
 *   laptop — gripping an open laptop (`</>` on the lid). Hero.
 *   coffee — one hand on the edge, a `{ }` mug of coffee in the other. Ladder.
 */
export function Mascot({
  className,
  pose = 'laptop',
}: {
  className?: string;
  pose?: 'laptop' | 'coffee';
}) {
  const { ref, look, blink } = useLookAtCursor();
  const line = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const eye: React.CSSProperties = {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transform: blink ? 'scaleY(0.12)' : 'none',
    transition: 'transform 80ms ease-out',
  };

  return (
    <svg
      ref={ref}
      viewBox="0 0 160 120"
      className={cn('text-lp-ink [filter:drop-shadow(rgba(0,0,0,0.25)_0px_2px_4px)]', className)}
      aria-hidden
    >
      {/* t-shirt shoulders */}
      <path
        d="M16 120 C18 99 36 89 62 87 L98 87 C124 89 142 99 144 120 Z"
        fill="var(--lp-card)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* headphone band, behind the neck */}
      <path d="M63 88 C63 74 97 74 97 88" {...line} />
      {/* neck, then the crew-neck collar around its base */}
      <path
        d="M72.5 62 L72.5 88 Q80 91 87.5 88 L87.5 62 Z"
        fill="var(--lp-card)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M67 87 C69 95 91 95 93 87" {...line} />
      {/* headphone cups resting either side of the neck */}
      <g fill="var(--lp-card)" stroke="currentColor" strokeWidth="2">
        <rect x="58" y="82" width="10" height="13" rx="4" />
        <rect x="92" y="82" width="10" height="13" rx="4" />
      </g>

      {/*
        The head follows the eyes a beat later with a soft spring: a small lean toward the cursor
        plus a curious head-cock, pivoting at the neck.
      */}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '80px 76px',
          transform: `translate(${look.hx}px, ${look.hy}px) rotate(${look.tilt}deg)`,
          transition: 'transform 650ms cubic-bezier(0.34, 1.35, 0.64, 1)',
        }}
      >
        <g fill="var(--lp-card)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          {/* ears, tucked behind the face */}
          <ellipse cx="59.5" cy="55" rx="3.5" ry="5.5" />
          <ellipse cx="100.5" cy="55" rx="3.5" ry="5.5" />
          <ellipse cx="80" cy="52" rx="21" ry="23" />
          {/* messy hair */}
          <path d="M59 48 C58 34 68 26 80 27 C92 26 102 34 101 47 C96 41 90 42 86 38 C83 43 74 44 68 40 C66 44 62 46 59 48 Z" />
          {/* round glasses */}
          <rect x="64.5" y="49" width="13" height="10" rx="3.5" />
          <rect x="82.5" y="49" width="13" height="10" rx="3.5" />
        </g>
        <path d="M80 27 C78 21 82 17 87 20" {...line} />
        <path d="M77.5 53 Q80 51.5 82.5 53 M64.5 53 L59.5 51 M95.5 53 L100.5 51" {...line} />
        {/* pupils, which follow the cursor inside the lenses */}
        <g
          style={{
            transform: `translate(${look.x}px, ${look.y}px)`,
            transition: 'transform 120ms ease-out',
          }}
        >
          <circle cx="71" cy="54" r="1.8" fill="currentColor" style={eye} />
          <circle cx="89" cy="54" r="1.8" fill="currentColor" style={eye} />
        </g>
        <path d={look.close ? 'M72.5 64 Q80 72 87.5 64' : 'M74 65 Q80 70 86 65'} {...line} />
      </g>

      {pose === 'laptop' ? (
        <>
          {/* laptop lid seen from behind, resting on the card edge */}
          <rect
            x="44"
            y="92"
            width="72"
            height="28"
            rx="4"
            fill="var(--lp-card)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M71 102 L66 106 L71 110 M89 102 L94 106 L89 110 M83 100 L77 112" {...line} />
          <circle
            cx="106"
            cy="113"
            r="3.2"
            fill="var(--lp-cyan)"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          {/* hands gripping the lid */}
          <g fill="var(--lp-card)" stroke="currentColor" strokeWidth="2">
            <rect x="35" y="94" width="15" height="11" rx="5.5" />
            <rect x="110" y="94" width="15" height="11" rx="5.5" />
          </g>
          <path
            d="M40 97 L40 102 M44.5 97 L44.5 102 M115.5 97 L115.5 102 M120 97 L120 102"
            {...line}
            strokeWidth={1.4}
          />
        </>
      ) : (
        <>
          {/* steam */}
          <path
            d="M116 84 C112 80 120 77 116 71 M126 84 C122 80 130 77 126 71"
            {...line}
            strokeWidth={1.6}
          />
          {/* mug with { } on it */}
          <rect
            x="108"
            y="88"
            width="26"
            height="25"
            rx="5"
            fill="var(--lp-card)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M134 94 C142 94 142 107 134 107" {...line} />
          <path
            d="M118 94 C115 94 116 99.5 113.5 100.5 C116 101.5 115 107 118 107 M124 94 C127 94 126 99.5 128.5 100.5 C126 101.5 127 107 124 107"
            {...line}
            strokeWidth={1.6}
          />
          <circle cx="121" cy="110" r="1.6" fill="var(--lp-cyan)" />
          {/* one hand round the mug, one gripping the card edge */}
          <g fill="var(--lp-card)" stroke="currentColor" strokeWidth="2">
            <rect x="98" y="95" width="14" height="12" rx="6" />
            <rect x="40" y="105" width="16" height="11" rx="5.5" />
          </g>
          <path d="M45 108 L45 113 M50 108 L50 113" {...line} strokeWidth={1.4} />
        </>
      )}
    </svg>
  );
}

/** How far (px) the cursor can be before the mascot notices it. */
const NOTICE_RANGE = 1080;
/** Within this distance (px) it breaks into a big smile. */
const CLOSE_RANGE = 260;
const REST = { x: 0, y: 0, hx: 0, hy: 0, tilt: 0, near: false, close: false };

/**
 * Eye contact: pupils point at the cursor while it is within NOTICE_RANGE of the eyes, the head
 * tilts toward it, and the eyes blink every few seconds. Off for reduced motion and touch input.
 */
function useLookAtCursor() {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  const [look, setLook] = useState(REST);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce || window.matchMedia('(pointer: coarse)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = ref.current;
        if (!svg) return;
        const box = svg.getBoundingClientRect();
        if (box.width === 0) return;
        const unit = box.width / 160; // screen px per drawing unit
        const dx = e.clientX - (box.left + 80 * unit);
        const dy = e.clientY - (box.top + 54 * unit);
        const dist = Math.hypot(dx, dy);
        if (dist > NOTICE_RANGE) {
          setLook((l) => (l.near ? REST : l));
          return;
        }
        const reach = Math.min(1, dist / 50); // eyes fully deflect once the cursor is 50px away
        const dirX = dist ? dx / dist : 0;
        const dirY = dist ? dy / dist : 0;
        // Closer cursor, more attention: the head turns further the nearer it is.
        const interest = 0.35 + 0.65 * (1 - dist / NOTICE_RANGE);
        setLook({
          x: dirX * 3 * reach,
          y: dirY * 2 * reach,
          hx: dirX * 2 * interest,
          hy: dirY * 1.4 * interest,
          tilt: dirX * 5 * interest,
          near: true,
          close: dist < CLOSE_RANGE,
        });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    let wait: ReturnType<typeof setTimeout>;
    let reopen: ReturnType<typeof setTimeout>;
    const schedule = () => {
      wait = setTimeout(
        () => {
          setBlink(true);
          reopen = setTimeout(() => setBlink(false), 140);
          schedule();
        },
        3200 + Math.random() * 2800,
      );
    };
    schedule();
    return () => {
      clearTimeout(wait);
      clearTimeout(reopen);
    };
  }, [reduce]);

  return { ref, look, blink };
}
