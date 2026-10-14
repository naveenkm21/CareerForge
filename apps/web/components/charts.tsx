'use client';

import { useState } from 'react';

/**
 * Single-series charts following the dataviz mark specs: 2px lines with a 10% area wash, an
 * end dot with a surface ring, 4px rounded bar ends anchored to the baseline, bars ≤ 24px,
 * hairline recessive grid, text in text tokens (never the series colour), hover tooltips, and a
 * table view so nothing is colour- or hover-only.
 */

export type Unit = 'percent' | 'count' | 'minutes';
const FORMATS: Record<Unit, (v: number) => string> = {
  percent: (v) => `${Math.round(v * 100)}%`,
  count: (v) => v.toLocaleString(),
  minutes: (v) => `${v} min`,
};

// Units, not formatter functions: these are client components rendered from server pages,
// and functions can't cross that boundary.
export function TrendLine({
  points,
  label,
  height = 120,
  unit = 'percent',
}: {
  points: { x: string; y: number }[];
  label: string;
  height?: number;
  unit?: Unit;
}) {
  const format = FORMATS[unit];
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2)
    return (
      <p className="text-sm text-fg-subtle">
        Not enough history yet — the trend appears after a second day of evidence.
      </p>
    );
  const W = 560;
  const H = height;
  const P = { l: 34, r: 44, t: 10, b: 20 };
  const max = Math.max(0.2, ...points.map((p) => p.y));
  const yMax = Math.ceil(max * 10) / 10;
  const x = (i: number) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / yMax) * (H - P.t - P.b);
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const last = points[points.length - 1]!;
  const ticks = [0, yMax / 2, yMax];
  const h = hover !== null ? points[hover]! : null;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`${label}: from ${format(points[0]!.y)} to ${format(last.y)}`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (points.length - 1));
            setHover(Math.max(0, Math.min(points.length - 1, i)));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={P.l}
                x2={W - P.r}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={P.l - 6}
                y={y(t) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="var(--fg-subtle)"
              >
                {format(t)}
              </text>
            </g>
          ))}
          <path d={area} fill="var(--chart-1)" opacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {h && hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={P.t}
              y2={H - P.b}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
          )}
          <circle
            cx={x(points.length - 1)}
            cy={y(last.y)}
            r={4}
            fill="var(--chart-1)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
          {hover !== null && h && (
            <circle
              cx={x(hover)}
              cy={y(h.y)}
              r={4}
              fill="var(--chart-1)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          )}
          <text
            x={x(points.length - 1) + 8}
            y={y(last.y) + 4}
            fontSize={11}
            fontWeight={600}
            fill="var(--fg)"
          >
            {format(last.y)}
          </text>
          <text x={P.l} y={H - 4} fontSize={10} fill="var(--fg-subtle)">
            {points[0]!.x}
          </text>
          <text x={W - P.r} y={H - 4} fontSize={10} textAnchor="end" fill="var(--fg-subtle)">
            {last.x}
          </text>
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-[var(--shadow)]"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-fg-muted">{h.x}</span>{' '}
            <span className="font-semibold text-fg">{format(h.y)}</span>
          </div>
        )}
      </div>
      <TableView headers={['Day', label]} rows={points.map((p) => [p.x, format(p.y)])} />
    </figure>
  );
}

export function HBars({
  rows,
  label,
  unit = 'count',
  max,
}: {
  rows: { label: string; value: number; detail?: string }[];
  label: string;
  unit?: Unit;
  max?: number;
}) {
  const format = FORMATS[unit];
  if (!rows.length) return <p className="text-sm text-fg-subtle">No data yet.</p>;
  const top = max ?? Math.max(...rows.map((r) => r.value), 1e-9);
  return (
    <figure className="flex flex-col gap-2">
      <ul aria-label={label} className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li
            key={r.label}
            className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-3"
            title={`${r.label}: ${format(r.value)}${r.detail ? ` · ${r.detail}` : ''}`}
          >
            <span className="truncate text-xs text-fg-muted">{r.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-[18px] rounded-r-[4px]"
                style={{
                  width: `${Math.max(1.5, (r.value / top) * 85)}%`,
                  background: 'var(--chart-1)',
                }}
                aria-hidden
              />
              <span className="shrink-0 text-xs font-semibold text-fg tabular-nums">
                {format(r.value)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <TableView headers={['Item', label]} rows={rows.map((r) => [r.label, format(r.value)])} />
    </figure>
  );
}

function TableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <details className="text-xs text-fg-muted">
      <summary className="w-fit cursor-pointer select-none hover:text-fg">View as table</summary>
      <table className="mt-2 w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="border-b border-border py-1 pr-3 font-semibold text-fg">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border-b border-border/60 py-1 pr-3 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
