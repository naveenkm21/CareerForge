'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { cn } from '@careerforge/ui';
import { CursorTrace } from './cursor-trace';
import { Mascot } from './mascot';

/**
 * The page's one elevated surface: a working miniature of the product, switched by a tab pill
 * group underneath. Every view responds to the visitor; cyan marks only the active thing.
 */

const TABS = ['Dashboard', 'Visualizer', 'Practice', 'Interview'] as const;
type Tab = (typeof TABS)[number];

const HINTS: Record<Tab, string> = {
  Dashboard: 'Click a pillar · hover the trend · tick off the plan',
  Visualizer: 'Press play, or step through Dijkstra one move at a time',
  Practice: 'Submit a problem and watch it get judged',
  Interview: 'Open a round · ask for the next follow-up',
};

export function ProductPreview() {
  const [tab, setTab] = useState<Tab>('Dashboard');

  return (
    <div className="relative">
      <Mascot
        pose="laptop"
        className="absolute -top-[143px] right-8 z-10 hidden w-[220px] sm:block"
      />
      <div className="relative rounded-2xl border border-lp-border bg-lp-card p-2 shadow-lp-xl">
        <div className="relative overflow-hidden rounded-[10px] border border-lp-border bg-lp-canvas">
          <div className="flex items-center gap-1.5 border-b border-lp-border px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-lp-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-lp-muted" />
            <span className="h-2.5 w-2.5 rounded-full bg-lp-muted" />
            <span className="ml-3 text-[12px] text-lp-ash">careerforge · {tab.toLowerCase()}</span>
            <span className="ml-auto hidden text-[12px] text-lp-ash md:block">{HINTS[tab]}</span>
          </div>
          <div className="min-h-[380px] p-5 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                {tab === 'Dashboard' && <DashboardView />}
                {tab === 'Visualizer' && <VisualizerView />}
                {tab === 'Practice' && <PracticeView />}
                {tab === 'Interview' && <InterviewView />}
              </motion.div>
            </AnimatePresence>
          </div>
          <CursorTrace />
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Product views"
        className="mt-5 flex flex-wrap justify-center gap-2"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'h-9 rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-cyan',
              tab === t
                ? 'bg-lp-soot text-lp-on-soot'
                : 'border border-lp-border text-lp-ink hover:border-lp-muted',
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

const Caption = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] tracking-[0.004em] text-lp-ash">{children}</p>
);

const small =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-lp-border px-3 text-[12px] text-lp-ink transition-colors hover:border-lp-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-cyan disabled:opacity-40';

// ── Dashboard ────────────────────────────────────────────────────────────────

const PILLARS = [
  { name: 'DSA', v: 69, w: 0.3, pts: 20.6, skills: 'arrays, graphs, trees, heaps, DP' },
  { name: 'Resume', v: 67, w: 0.1, pts: 6.7, skills: '21 claims, all backed by evidence' },
  { name: 'Interview', v: 65, w: 0.15, pts: 9.7, skills: '1 mock interview, 3 rounds' },
  { name: 'CS fundamentals', v: 50, w: 0.18, pts: 9.0, skills: 'OS scheduling, memory, HTTP' },
  { name: 'Development', v: 20, w: 0.15, pts: 2.9, skills: 'APIs, databases, git' },
];
const TREND = [18, 21, 22, 25, 27, 29, 31, 33, 36, 38, 41, 43, 44, 46, 47, 49];

function DashboardView() {
  const [pillar, setPillar] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const p = PILLARS[pillar]!;
  const x = (i: number) => (i / (TREND.length - 1)) * 300;
  const y = (v: number) => 70 - v * 1.2;
  const shown = hover ?? TREND.length - 1;
  const plan = [
    ['Heaps: what a heap is', 'Largest gap against your role'],
    ['Reverse in place', 'Next skill in prerequisite order'],
    ['Visualize flood fill', 'Confidence decaying, review now'],
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
      <div className="min-w-0">
        <Caption>Job readiness · Software Engineer</Caption>
        <p className="mt-1 font-tight text-[52px] leading-[1.12] font-normal tracking-[-0.021em] text-lp-ink">
          49%
        </p>
        <p className="text-[13px] text-lp-body">From 306 evidence events. Pick a pillar:</p>
        <ul className="mt-4 space-y-1">
          {PILLARS.map((row, i) => (
            <li key={row.name}>
              <button
                type="button"
                onClick={() => setPillar(i)}
                aria-pressed={pillar === i}
                className={cn(
                  'grid w-full grid-cols-[120px_1fr_36px] items-center gap-3 rounded-[6px] px-2 py-1.5 text-left text-[13px] transition-colors',
                  pillar === i ? 'bg-lp-card shadow-lp-subtle' : 'hover:bg-lp-card/60',
                )}
              >
                <span className={pillar === i ? 'text-lp-ink' : 'text-lp-body'}>{row.name}</span>
                <span className="h-1.5 rounded-full bg-lp-border">
                  <motion.span
                    className={cn(
                      'block h-full rounded-full',
                      pillar === i ? 'bg-lp-cyan' : 'bg-lp-ink',
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${row.v}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                  />
                </span>
                <span className="text-right text-lp-ink tabular-nums">{row.v}%</span>
              </button>
            </li>
          ))}
        </ul>
        <AnimatePresence mode="wait">
          <motion.p
            key={p.name}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-3 rounded-[6px] border border-lp-border px-3 py-2 font-mono text-[12px] text-lp-body"
          >
            {p.name} {p.v}% × {p.w.toFixed(2)} ={' '}
            <span className="text-lp-ink">{p.pts.toFixed(1)} points of 49</span>
            <span className="block font-sans text-lp-ash">{p.skills}</span>
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="rounded-[10px] border border-lp-border bg-lp-card p-4">
          <div className="flex items-baseline justify-between">
            <Caption>Readiness, last 30 days</Caption>
            <span className="font-mono text-[12px] text-lp-ink">
              day {(shown + 1) * 2} · {TREND[shown]}%
            </span>
          </div>
          <svg
            viewBox="0 0 300 70"
            className="mt-3 h-20 w-full cursor-crosshair overflow-visible"
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const i = Math.round(((e.clientX - box.left) / box.width) * (TREND.length - 1));
              setHover(Math.max(0, Math.min(TREND.length - 1, i)));
            }}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label="Readiness rising from 18% to 49% over 30 days"
          >
            <rect x="0" y="0" width="300" height="70" fill="transparent" />
            <polyline
              points={TREND.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke="var(--lp-ink)"
              strokeWidth="1.5"
            />
            <line
              x1={x(shown)}
              x2={x(shown)}
              y1="0"
              y2="70"
              stroke="var(--lp-muted)"
              strokeDasharray="3 3"
            />
            <circle cx={x(shown)} cy={y(TREND[shown]!)} r="3.5" fill="var(--lp-cyan)" />
          </svg>
        </div>
        <div className="rounded-[10px] border border-lp-border bg-lp-card p-4">
          <Caption>
            Today’s plan · {done.filter(Boolean).length}/{plan.length} done
          </Caption>
          <ul className="mt-2 space-y-1">
            {plan.map(([t, why], i) => (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={done[i]}
                  onClick={() => setDone((d) => d.map((v, k) => (k === i ? !v : v)))}
                  className="flex w-full items-center gap-2.5 rounded-[6px] px-1 py-1 text-left text-[13px] hover:bg-lp-canvas"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                      done[i] ? 'border-lp-cyan-edge bg-lp-cyan text-[#0c0a09]' : 'border-lp-muted',
                    )}
                  >
                    {done[i] && <Check className="h-3 w-3" strokeWidth={2.5} />}
                  </span>
                  <span
                    className={cn('flex-1', done[i] ? 'text-lp-ash line-through' : 'text-lp-ink')}
                  >
                    {t}
                  </span>
                  <span className="hidden text-right text-lp-ash sm:block">{why}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Visualizer ───────────────────────────────────────────────────────────────

const NODES = [
  { id: 'A', x: 40, y: 90 },
  { id: 'B', x: 130, y: 30 },
  { id: 'C', x: 130, y: 150 },
  { id: 'D', x: 230, y: 50 },
  { id: 'E', x: 230, y: 150 },
  { id: 'F', x: 310, y: 100 },
];
const EDGES: [string, string, number][] = [
  ['A', 'B', 4],
  ['A', 'C', 2],
  ['C', 'B', 1],
  ['B', 'D', 5],
  ['C', 'E', 8],
  ['D', 'E', 2],
  ['D', 'F', 3],
  ['E', 'F', 6],
];
/** Dijkstra from A, move by move, along the shortest path A→C→B→D→F (= 11). */
const STEPS: { line: number; current: string; tree: string[]; note: string }[] = [
  { line: 0, current: 'A', tree: [], note: 'Start: dist[A] = 0, everything else ∞' },
  { line: 2, current: 'A', tree: [], note: 'Settle A at distance 0' },
  { line: 4, current: 'A', tree: ['AC'], note: 'Relax A→C: dist[C] = 2' },
  { line: 2, current: 'C', tree: ['AC'], note: 'Settle C at distance 2' },
  { line: 4, current: 'C', tree: ['AC', 'CB'], note: 'Relax C→B: 3 beats 4, dist[B] = 3' },
  { line: 2, current: 'B', tree: ['AC', 'CB'], note: 'Settle B at distance 3' },
  { line: 4, current: 'B', tree: ['AC', 'CB', 'BD'], note: 'Relax B→D: dist[D] = 8' },
  { line: 2, current: 'D', tree: ['AC', 'CB', 'BD'], note: 'Settle D at distance 8' },
  { line: 4, current: 'D', tree: ['AC', 'CB', 'BD', 'DF'], note: 'Relax D→F: dist[F] = 11' },
  { line: 6, current: 'F', tree: ['AC', 'CB', 'BD', 'DF'], note: 'Done: shortest A → F = 11' },
];
const CODE: Record<string, string[]> = {
  TypeScript: [
    'dist.set(src, 0);',
    'while (pq.size > 0) {',
    '  const u = pq.popMin();',
    '  for (const [v, w] of adj[u]) {',
    '    if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;',
    '  }',
    '}',
  ],
  Python: [
    'dist[src] = 0',
    'while pq:',
    '    d, u = heappop(pq)',
    '    for v, w in adj[u]:',
    '        if d + w < dist[v]: dist[v] = d + w',
    '',
    '# done',
  ],
  'C++': [
    'dist[src] = 0;',
    'while (!pq.empty()) {',
    '  auto [d, u] = pq.top(); pq.pop();',
    '  for (auto [v, w] : adj[u])',
    '    if (d + w < dist[v]) dist[v] = d + w;',
    '',
    '}',
  ],
  Java: [
    'dist[src] = 0;',
    'while (!pq.isEmpty()) {',
    '  int u = pq.poll()[1];',
    '  for (int[] e : adj.get(u))',
    '    if (dist[u] + e[1] < dist[e[0]]) dist[e[0]] = dist[u] + e[1];',
    '',
    '}',
  ],
};

function VisualizerView() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lang, setLang] = useState('TypeScript');
  const s = STEPS[step]!;
  const last = step === STEPS.length - 1;

  useEffect(() => {
    if (!playing || last) return;
    const id = setTimeout(() => setStep((n) => n + 1), reduce ? 400 : 900);
    return () => clearTimeout(id);
  }, [playing, step, last, reduce]);

  const isPlaying = playing && !last;
  const at = (id: string) => NODES.find((n) => n.id === id)!;
  const settled = new Set(
    STEPS.slice(0, step + 1)
      .filter((x) => x.line === 2)
      .map((x) => x.current),
  );
  if (last) settled.add('F');

  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Caption>
            Dijkstra · step {step + 1} of {STEPS.length}
          </Caption>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={small}
              onClick={() => {
                if (last) {
                  setStep(0);
                  setPlaying(true);
                } else setPlaying(!isPlaying);
              }}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" strokeWidth={1.75} />
              ) : (
                <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {isPlaying ? 'Pause' : last ? 'Replay' : 'Play'}
            </button>
            <button
              type="button"
              className={small}
              disabled={last}
              onClick={() => {
                setPlaying(false);
                setStep((n) => Math.min(STEPS.length - 1, n + 1));
              }}
              aria-label="Next step"
            >
              <StepForward className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className={small}
              disabled={step === 0}
              onClick={() => {
                setPlaying(false);
                setStep(0);
              }}
              aria-label="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <svg
          viewBox="0 0 350 180"
          className="mt-3 w-full"
          role="img"
          aria-label={`Dijkstra on a six-node graph. ${s.note}`}
        >
          {EDGES.map(([a, b, w]) => {
            const on = s.tree.includes(a + b) || s.tree.includes(b + a);
            return (
              <g key={a + b}>
                <line
                  x1={at(a).x}
                  y1={at(a).y}
                  x2={at(b).x}
                  y2={at(b).y}
                  stroke={on ? 'var(--lp-cyan)' : 'var(--lp-muted)'}
                  strokeWidth={on ? 2.5 : 1.5}
                  style={{ transition: 'stroke 300ms, stroke-width 300ms' }}
                />
                <text
                  x={(at(a).x + at(b).x) / 2}
                  y={(at(a).y + at(b).y) / 2 - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--lp-ash)"
                >
                  {w}
                </text>
              </g>
            );
          })}
          {NODES.map((n) => {
            const cur = s.current === n.id;
            const done = settled.has(n.id);
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="15"
                  fill={done ? 'var(--lp-soot)' : 'var(--lp-card)'}
                  stroke={cur ? 'var(--lp-cyan)' : 'var(--lp-ink)'}
                  strokeWidth={cur ? 2.5 : 1.5}
                  style={{ transition: 'fill 300ms, stroke 300ms' }}
                />
                <text
                  x={n.x}
                  y={n.y + 4.5}
                  textAnchor="middle"
                  fontSize="13"
                  fill={done ? 'var(--lp-on-soot)' : 'var(--lp-ink)'}
                >
                  {n.id}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 flex items-center gap-2 text-[13px] text-lp-ink" aria-live="polite">
          <ArrowRight className="h-3.5 w-3.5 text-lp-ash" strokeWidth={1.75} />
          {s.note}
        </p>
      </div>
      <div className="min-w-0 rounded-[10px] border border-lp-border bg-lp-card p-4 font-mono text-[12px] leading-6">
        <div className="mb-2 flex flex-wrap gap-1.5 font-sans">
          {Object.keys(CODE).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] transition-colors',
                lang === l
                  ? 'bg-lp-soot text-lp-on-soot'
                  : 'border border-lp-border text-lp-body hover:text-lp-ink',
              )}
            >
              {l}
            </button>
          ))}
        </div>
        {CODE[lang]!.map((line, i) => (
          <p
            key={i}
            className={cn(
              'truncate rounded px-2 whitespace-pre transition-colors duration-300',
              i === s.line ? 'bg-lp-wash text-lp-hl' : 'text-lp-body',
            )}
          >
            {line || ' '}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Practice ─────────────────────────────────────────────────────────────────

type Status = 'Accepted' | 'Wrong answer' | 'To do' | 'Reviewing…';
const PROBLEMS: { name: string; tag: string; status: Status }[] = [
  { name: 'First position ≥ target', tag: 'binary search', status: 'Accepted' },
  { name: 'Longest substring without repeats', tag: 'sliding window', status: 'Wrong answer' },
  { name: 'Number of islands', tag: 'graphs', status: 'Accepted' },
  { name: 'Minimum coins', tag: 'dynamic programming', status: 'To do' },
  { name: 'k-th smallest element', tag: 'heaps', status: 'To do' },
];

function PracticeView() {
  const [rows, setRows] = useState(PROBLEMS);
  const [filter, setFilter] = useState<'All' | 'Solved' | 'To do'>('All');
  const solved = rows.filter((r) => r.status === 'Accepted').length;

  const submit = (name: string) => {
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, status: 'Reviewing…' } : r)));
    setTimeout(
      () => setRows((rs) => rs.map((r) => (r.name === name ? { ...r, status: 'Accepted' } : r))),
      1300,
    );
  };
  const visible = rows.filter((r) =>
    filter === 'All'
      ? true
      : filter === 'Solved'
        ? r.status === 'Accepted'
        : r.status !== 'Accepted',
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Caption>
          {solved} of {rows.length} solved · a judged submission is the strongest evidence
        </Caption>
        <div className="flex gap-1.5">
          {(['All', 'Solved', 'To do'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'h-7 rounded-full px-3 text-[12px] transition-colors',
                filter === f
                  ? 'bg-lp-soot text-lp-on-soot'
                  : 'border border-lp-border text-lp-body hover:text-lp-ink',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 divide-y divide-lp-border rounded-[10px] border border-lp-border bg-lp-card">
        <AnimatePresence initial={false}>
          {visible.map((r) => (
            <motion.li
              key={r.name}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]"
            >
              <span className="text-lp-ink">{r.name}</span>
              <span className="flex items-center gap-3">
                <span className="hidden rounded-full border border-lp-border px-2.5 py-0.5 text-[11px] text-lp-body sm:inline">
                  {r.tag}
                </span>
                {r.status === 'Accepted' || r.status === 'Reviewing…' ? (
                  <span
                    className={cn(
                      'flex w-[150px] items-center justify-end gap-1.5',
                      r.status === 'Accepted' ? 'text-lp-ink' : 'text-lp-ash',
                    )}
                  >
                    {r.status === 'Accepted' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-lp-cyan" />
                    ) : (
                      <span className="h-3 w-3 animate-spin rounded-full border border-lp-muted border-t-lp-ink" />
                    )}
                    {r.status}
                  </span>
                ) : (
                  <span className="flex w-[150px] items-center justify-end gap-2">
                    <span className="truncate text-lp-ash">{r.status}</span>
                    <button type="button" className={small} onClick={() => submit(r.name)}>
                      Submit
                    </button>
                  </span>
                )}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-[13px] text-lp-ash">Nothing here yet.</li>
        )}
      </ul>
    </div>
  );
}

// ── Interview ────────────────────────────────────────────────────────────────

const ROUNDS = [
  {
    round: 'Coding · two pointers',
    level: 'strong',
    n: 4,
    note: 'Correct, O(n), and explained why the pointers never skip the answer.',
  },
  {
    round: 'Concepts · heaps',
    level: 'solid',
    n: 3,
    note: 'Right complexity; missed why heapify is O(n), not O(n log n).',
  },
  {
    round: 'Behavioural · ownership',
    level: 'developing',
    n: 2,
    note: 'Good story, but the result was not measured. Add a number.',
  },
];
const FOLLOW_UPS = [
  'Your pointers move toward each other. What guarantees you never skip the answer?',
  'What changes if the array is not sorted? Can you still do better than O(n²)?',
  'How would you test this? Name the edge case that breaks most first attempts.',
];

function InterviewView() {
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState(0);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <div className="min-w-0">
        <Caption>Mock interview · 3 rounds · click a round</Caption>
        <ul className="mt-3 space-y-1">
          {ROUNDS.map((r, i) => (
            <li key={r.round}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-expanded={open === i}
                className={cn(
                  'w-full rounded-[6px] px-2 py-2 text-left transition-colors',
                  open === i ? 'bg-lp-card shadow-lp-subtle' : 'hover:bg-lp-card/60',
                )}
              >
                <span className="flex justify-between text-[13px]">
                  <span className="text-lp-ink">{r.round}</span>
                  <span className={open === i ? 'text-lp-hl' : 'text-lp-body'}>{r.level}</span>
                </span>
                <span className="mt-1.5 grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((k) => (
                    <motion.span
                      key={k}
                      className={cn('h-1.5 rounded-full', k <= r.n ? 'bg-lp-ink' : 'bg-lp-border')}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{ originX: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08 + k * 0.05 }}
                    />
                  ))}
                </span>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.span
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="block overflow-hidden text-[12px] text-lp-body"
                    >
                      <span className="block pt-2">{r.note}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col rounded-[10px] border border-lp-border bg-lp-card p-4 text-[13px] leading-[1.64]">
        <Caption>
          Follow-up {q + 1} of {FOLLOW_UPS.length}
        </Caption>
        <AnimatePresence mode="wait">
          <motion.p
            key={q}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-lp-ink"
          >
            “{FOLLOW_UPS[q]}”
          </motion.p>
        </AnimatePresence>
        <p className="mt-3 text-lp-body">
          The interviewer picks a <span className="text-lp-ink">level</span>; the score is computed
          from it in code, never invented by the model.
        </p>
        <button
          type="button"
          onClick={() => setQ((n) => (n + 1) % FOLLOW_UPS.length)}
          className={cn(small, 'mt-4 self-start')}
        >
          Next follow-up <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
