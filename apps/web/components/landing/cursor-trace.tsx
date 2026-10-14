'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * A fading cyan "trace" behind the cursor while it moves over an interactive board, a nod to
 * the product's algorithm traces. Drop it in as the last child of a `position: relative` box:
 * it listens on that box, draws on a canvas above it, and never takes clicks. Thin strokes in
 * the page's one cyan, no glow (DESIGN.md). Off for reduced motion and touch input.
 */

const LIFE_MS = 480; // how long a point of the trail stays visible
const MAX_POINTS = 60;

export function CursorTrace({ colorVar = '--lp-cyan' }: { colorVar?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const board = canvas?.parentElement;
    if (!canvas || !board || reduce || window.matchMedia('(pointer: coarse)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points: { x: number; y: number; t: number }[] = [];
    let frame = 0;
    let color = '#3ba6f1';

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = board.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(board);

    const draw = () => {
      const now = performance.now();
      while (points.length && now - points[0]!.t > LIFE_MS) points.shift();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        const life = 1 - (now - b.t) / LIFE_MS; // 1 = fresh, 0 = gone
        ctx.globalAlpha = Math.max(0, life) * 0.85;
        ctx.lineWidth = 0.6 + 2.2 * life;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const head = points[points.length - 1];
      if (head && now - head.t < LIFE_MS) {
        ctx.globalAlpha = 1 - (now - head.t) / LIFE_MS;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = points.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      const box = board.getBoundingClientRect();
      points.push({ x: e.clientX - box.left, y: e.clientY - box.top, t: performance.now() });
      if (points.length > MAX_POINTS) points.shift();
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onEnter = () => {
      // Pick up the theme's cyan (light and dark both define it) each time the cursor arrives.
      color = getComputedStyle(board).getPropertyValue(colorVar).trim() || color;
    };

    board.addEventListener('pointerenter', onEnter);
    board.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      board.removeEventListener('pointerenter', onEnter);
      board.removeEventListener('pointermove', onMove);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reduce, colorVar]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}
