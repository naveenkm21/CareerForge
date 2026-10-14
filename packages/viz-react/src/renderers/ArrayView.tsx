import { motion } from 'motion/react';
import type { ArrayState, Mark, Tone } from '@careerforge/viz';
import { formatScalar, resolveMarks, toneSoft, toneStrong } from '../tones';
import { FONT, Svg, valueFontSize } from './svg';

const CELL = 46;
const GAP = 6;
const PAD = 14;
const TOP = 30;
const PTR_ROW = 18;

const x = (i: number) => PAD + i * (CELL + GAP);

export function ArrayView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: ArrayState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  const n = state.items.length;

  // Pointers sharing an index stack downward.
  const rowsAt = new Map<string, number>();
  const pointers = m.pointers.map((p) => {
    const row = rowsAt.get(p.at) ?? 0;
    rowsAt.set(p.at, row + 1);
    return { ...p, row };
  });
  const ptrRows = Math.max(0, ...[...rowsAt.values()]);

  const width = Math.max(PAD * 2 + n * CELL + Math.max(0, n - 1) * GAP, 120);
  const height = TOP + CELL + 22 + ptrRows * PTR_ROW + 8;

  const excluded = (i: number) =>
    m.cells.get(String(i)) === 'excluded' ||
    (!m.cells.has(String(i)) &&
      m.ranges.some((r) => r.tone === 'excluded' && i >= r.from && i <= r.to));
  const visibleRanges = m.ranges.filter((r) => r.tone !== 'excluded');

  if (n === 0) {
    return (
      <Svg width={width} height={TOP + CELL} label={`${label}: empty`}>
        <rect
          x={PAD}
          y={TOP / 2}
          width={width - PAD * 2}
          height={CELL}
          rx={8}
          fill="none"
          stroke="var(--border-strong)"
          strokeDasharray="4 4"
        />
        <text
          x={width / 2}
          y={TOP / 2 + CELL / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fill="var(--fg-subtle)"
        >
          empty
        </text>
      </Svg>
    );
  }

  return (
    <Svg
      width={width}
      height={height}
      label={`${label}: [${state.items.map((it) => formatScalar(it.value)).join(', ')}]`}
    >
      {visibleRanges.map((r, lane) => {
        const inset = 4 + lane * 3;
        return (
          <motion.rect
            key={`range-${r.key}`}
            initial={false}
            animate={{ x: x(r.from) - inset, width: x(r.to) + CELL - x(r.from) + inset * 2 }}
            y={TOP - inset}
            height={CELL + inset * 2}
            rx={10}
            fill={r.tone === 'found' ? 'none' : toneSoft(r.tone)}
            stroke={toneStrong(r.tone)}
            strokeWidth={r.tone === 'found' ? 2.5 : 1.25}
            strokeDasharray={r.tone === 'found' ? undefined : '5 4'}
            opacity={0.9}
          />
        );
      })}

      {m.compare && (
        <path
          d={`M ${x(m.compare.a) + CELL / 2} ${TOP - 4} C ${x(m.compare.a) + CELL / 2} ${TOP - 26}, ${x(m.compare.b) + CELL / 2} ${TOP - 26}, ${x(m.compare.b) + CELL / 2} ${TOP - 4}`}
          fill="none"
          stroke={toneStrong('active')}
          strokeWidth={2}
          markerEnd="url(#cf-arrow-active)"
        />
      )}

      {state.items.map((it, i) => {
        const tone = m.cells.get(String(i));
        const fade = excluded(i);
        const text = formatScalar(it.value);
        return (
          <motion.g key={it.id} initial={false} animate={{ x: x(i), opacity: fade ? 0.38 : 1 }}>
            <rect
              y={TOP}
              width={CELL}
              height={CELL}
              rx={8}
              style={{
                fill: tone && tone !== 'excluded' ? toneSoft(tone) : 'var(--surface)',
                stroke: tone && tone !== 'excluded' ? toneStrong(tone) : 'var(--border-strong)',
                strokeWidth: tone && tone !== 'excluded' ? 2 : 1.25,
                transition: 'fill .25s, stroke .25s',
              }}
            />
            <text
              x={CELL / 2}
              y={TOP + CELL / 2 + 5}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={valueFontSize(text)}
              fontWeight={600}
              fill="var(--fg)"
            >
              {text}
            </text>
          </motion.g>
        );
      })}

      {state.items.map((_, i) => (
        <text
          key={`idx-${i}`}
          x={x(i) + CELL / 2}
          y={TOP + CELL + 14}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={10}
          fill="var(--fg-subtle)"
        >
          {i}
        </text>
      ))}

      {pointers.map((p) => (
        <Pointer
          key={`ptr-${p.label}`}
          x={x(Number(p.at)) + CELL / 2}
          y={TOP + CELL + 22 + p.row * PTR_ROW}
          label={p.label}
          tone={p.tone}
        />
      ))}
    </Svg>
  );
}

function Pointer({ x: px, y, label, tone }: { x: number; y: number; label: string; tone: Tone }) {
  return (
    <motion.g initial={false} animate={{ x: px, y }}>
      <path d="M 0 -3 L 5 5 L -5 5 Z" fill={toneStrong(tone)} />
      <text x={8} y={6} fontFamily={FONT} fontSize={11} fontWeight={700} fill={toneStrong(tone)}>
        {label}
      </text>
    </motion.g>
  );
}

/** Shared SVG marker definitions; rendered once per stage. */
export function SvgDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {(
          [
            'active',
            'path',
            'visited',
            'candidate',
            'frontier',
            'found',
            'excluded',
            'error',
          ] as const
        ).map((t) => (
          <marker
            key={t}
            id={`cf-arrow-${t}`}
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={toneStrong(t)} />
          </marker>
        ))}
        <marker
          id="cf-arrow-default"
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
        </marker>
      </defs>
    </svg>
  );
}
