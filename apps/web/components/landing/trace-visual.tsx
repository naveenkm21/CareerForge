'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * The hero's live figure: Dijkstra really runs on this graph (the trace is computed below, not
 * hand-drawn), and the code panel highlights the line each step executes, the same "one trace,
 * every view" idea the product is built on.
 */

type NodeId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const NODES: { id: NodeId; x: number; y: number }[] = [
  { id: 'A', x: 70, y: 175 },
  { id: 'B', x: 215, y: 70 },
  { id: 'C', x: 215, y: 280 },
  { id: 'D', x: 385, y: 110 },
  { id: 'E', x: 385, y: 275 },
  { id: 'F', x: 530, y: 190 },
];

const EDGES: { a: NodeId; b: NodeId; w: number }[] = [
  { a: 'A', b: 'B', w: 4 },
  { a: 'A', b: 'C', w: 2 },
  { a: 'C', b: 'B', w: 1 },
  { a: 'B', b: 'D', w: 5 },
  { a: 'C', b: 'E', w: 8 },
  { a: 'C', b: 'D', w: 9 },
  { a: 'D', b: 'E', w: 2 },
  { a: 'D', b: 'F', w: 3 },
  { a: 'E', b: 'F', w: 6 },
];

const CODE = [
  'dist.set(src, 0);',
  'while (pq.size > 0) {',
  '  const u = pq.popMin();      // settle',
  '  for (const [v, w] of adj[u]) {',
  '    if (dist[u] + w >= dist[v]) continue;',
  '    dist[v] = dist[u] + w; pq.push(v);',
  '  }',
  '}',
];

type Step = {
  line: number;
  current: NodeId | null;
  edge: number | null;
  dist: Partial<Record<NodeId, number>>;
  prev: Partial<Record<NodeId, NodeId>>;
  settled: NodeId[];
  note: string;
  done?: boolean;
};

function traceDijkstra(src: NodeId): Step[] {
  const dist: Partial<Record<NodeId, number>> = { [src]: 0 };
  const prev: Partial<Record<NodeId, NodeId>> = {};
  const settled: NodeId[] = [];
  const steps: Step[] = [];
  const snap = (line: number, current: NodeId | null, edge: number | null, note: string) =>
    steps.push({
      line,
      current,
      edge,
      note,
      dist: { ...dist },
      prev: { ...prev },
      settled: [...settled],
    });

  snap(0, src, null, `dist[${src}] = 0`);
  for (;;) {
    let u: NodeId | null = null;
    for (const n of NODES) {
      const d = dist[n.id];
      if (settled.includes(n.id) || d === undefined) continue;
      if (u === null || d < (dist[u] ?? Infinity)) u = n.id;
    }
    if (u === null) break;
    const cur: NodeId = u;
    settled.push(cur);
    snap(2, cur, null, `settle ${cur} at distance ${dist[cur]}`);
    EDGES.forEach((e, i) => {
      if (e.a !== cur && e.b !== cur) return;
      const v = e.a === cur ? e.b : e.a;
      if (settled.includes(v)) return;
      const cand = (dist[cur] ?? 0) + e.w;
      const old = dist[v];
      if (old === undefined || cand < old) {
        dist[v] = cand;
        prev[v] = cur;
        snap(5, cur, i, `relax ${cur}→${v}: ${old ?? '∞'} → ${cand}`);
      } else snap(4, cur, i, `${cur}→${v}: ${cand} ≥ ${old}, keep`);
    });
  }
  steps.push({
    ...steps[steps.length - 1]!,
    line: 7,
    current: null,
    edge: null,
    note: 'shortest path A → F = 11',
    done: true,
  });
  return steps;
}

const STEPS = traceDijkstra('A');

/** Edges on the shortest-path tree, and on the final A → F path. */
function onTree(step: Step, e: (typeof EDGES)[number]) {
  return step.prev[e.b] === e.a || step.prev[e.a] === e.b;
}
function onPath(step: Step, e: (typeof EDGES)[number]) {
  const path = new Set<string>();
  for (let n: NodeId | undefined = 'F'; n && step.prev[n]; n = step.prev[n])
    path.add([n, step.prev[n]].sort().join(''));
  return path.has([e.a, e.b].sort().join(''));
}

const PURPLE = '#a78bfa';
const CYAN = '#22d3ee';
const GREEN = '#4ade80';

export function TraceVisual() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const step = reduce ? STEPS[STEPS.length - 1]! : STEPS[i]!;

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % STEPS.length), 1100);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgba(139,92,246,0.35),transparent)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_0_80px_-20px_rgba(34,211,238,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-zinc-400">dijkstra.trace</span>
          <span className="ml-auto font-mono text-xs text-zinc-500">
            step {String(STEPS.indexOf(step) + 1).padStart(2, '0')}/{STEPS.length}
          </span>
        </div>

        <svg
          viewBox="0 0 600 350"
          className="w-full"
          role="img"
          aria-label="Dijkstra's algorithm finding the shortest path from A to F, step by step"
        >
          <defs>
            <filter id="cf-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {EDGES.map((e, k) => {
            const a = NODES.find((n) => n.id === e.a)!;
            const b = NODES.find((n) => n.id === e.b)!;
            const active = step.edge === k;
            const color =
              step.done && onPath(step, e)
                ? GREEN
                : active
                  ? CYAN
                  : onTree(step, e)
                    ? PURPLE
                    : '#3f3f46';
            return (
              <g key={k}>
                <motion.line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  animate={{
                    stroke: color,
                    strokeWidth: active || (step.done && onPath(step, e)) ? 4 : 2,
                  }}
                  transition={{ duration: 0.35 }}
                  filter={active ? 'url(#cf-glow)' : undefined}
                />
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 8}
                  textAnchor="middle"
                  className="fill-zinc-500 font-mono text-[13px]"
                >
                  {e.w}
                </text>
              </g>
            );
          })}
          {NODES.map((n) => {
            const settled = step.settled.includes(n.id);
            const current = step.current === n.id;
            const known = step.dist[n.id] !== undefined;
            const fill = settled
              ? 'rgba(167,139,250,0.22)'
              : known
                ? 'rgba(34,211,238,0.12)'
                : '#0a0a0e';
            const stroke = current ? CYAN : settled ? PURPLE : known ? CYAN : '#52525b';
            return (
              <g key={n.id}>
                {current && !reduce && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={24}
                    fill="none"
                    stroke={CYAN}
                    initial={{ r: 24, opacity: 0.8 }}
                    animate={{ r: 42, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={24}
                  animate={{ fill, stroke }}
                  strokeWidth={2.5}
                  transition={{ duration: 0.35 }}
                  filter={current ? 'url(#cf-glow)' : undefined}
                />
                <text
                  x={n.x}
                  y={n.y + 6}
                  textAnchor="middle"
                  className="fill-zinc-100 font-display text-[18px] font-bold"
                >
                  {n.id}
                </text>
                <text
                  x={n.x}
                  y={n.y - 34}
                  textAnchor="middle"
                  className={`font-mono text-[14px] ${known ? 'fill-cyan-300' : 'fill-zinc-600'}`}
                >
                  {known ? step.dist[n.id] : '∞'}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="border-t border-white/10 bg-black/40 px-5 py-4 font-mono text-[12.5px] leading-6 sm:text-[13px]">
          {CODE.map((line, k) => (
            <div
              key={k}
              className={`relative -mx-2 rounded px-2 whitespace-pre transition-colors duration-300 ${
                k === step.line ? 'bg-cyan-400/10 text-cyan-200' : 'text-zinc-500'
              }`}
            >
              {k === step.line && (
                <span className="absolute top-0 bottom-0 left-0 w-0.5 bg-cyan-400" />
              )}
              <span className="mr-4 inline-block w-4 text-right text-zinc-700 select-none">
                {k + 1}
              </span>
              {line}
            </div>
          ))}
          <div className="mt-3 flex h-6 items-center gap-2 text-zinc-300">
            <span className={step.done ? 'text-green-400' : 'text-violet-400'}>›</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={step.note}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {step.note}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
