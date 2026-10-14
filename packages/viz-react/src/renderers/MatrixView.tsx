import type { Mark, MatrixState } from '@careerforge/viz';
import { formatScalar, resolveMarks, toneSoft, toneStrong } from '../tones';
import { FONT, Svg, valueFontSize } from './svg';

const CELL = 40;
const GAP = 3;
const LABEL = 22;

export function MatrixView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: MatrixState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  const rows = state.cells.length;
  const cols = state.cells[0]?.length ?? 0;
  const ox = state.rowLabels ? LABEL + 4 : 4;
  const oy = state.colLabels ? LABEL + 4 : 4;
  const width = ox + cols * (CELL + GAP) + 4;
  const height = oy + rows * (CELL + GAP) + 4;
  const pointerAt = new Map(m.pointers.map((p) => [p.at, p]));

  return (
    <Svg width={width} height={height} label={`${label}: ${rows}×${cols} grid`} maxScale={1.4}>
      {state.colLabels?.map((l, c) => (
        <text
          key={`c${c}`}
          x={ox + c * (CELL + GAP) + CELL / 2}
          y={LABEL - 6}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={10}
          fill="var(--fg-subtle)"
        >
          {l}
        </text>
      ))}
      {state.rowLabels?.map((l, r) => (
        <text
          key={`r${r}`}
          x={LABEL - 6}
          y={oy + r * (CELL + GAP) + CELL / 2 + 4}
          textAnchor="end"
          fontFamily={FONT}
          fontSize={10}
          fill="var(--fg-subtle)"
        >
          {l}
        </text>
      ))}
      {state.cells.map((row, r) =>
        row.map((v, c) => {
          const key = `${r},${c}`;
          const tone = m.cells.get(key);
          const ptr = pointerAt.get(key);
          const text = formatScalar(v);
          const cx = ox + c * (CELL + GAP);
          const cy = oy + r * (CELL + GAP);
          return (
            <g key={key}>
              <rect
                x={cx}
                y={cy}
                width={CELL}
                height={CELL}
                rx={6}
                style={{
                  fill: tone ? toneSoft(tone) : v === 0 ? 'var(--surface-2)' : 'var(--surface)',
                  stroke: tone ? toneStrong(tone) : 'var(--border)',
                  strokeWidth: tone ? 1.75 : 1,
                  transition: 'fill .25s, stroke .25s',
                }}
              />
              {ptr && (
                <rect
                  x={cx - 2.5}
                  y={cy - 2.5}
                  width={CELL + 5}
                  height={CELL + 5}
                  rx={8}
                  fill="none"
                  stroke={toneStrong(ptr.tone)}
                  strokeWidth={2.5}
                  strokeDasharray="4 3"
                />
              )}
              <text
                x={cx + CELL / 2}
                y={cy + CELL / 2 + 5}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={valueFontSize(text, 14)}
                fontWeight={600}
                fill={v === 0 ? 'var(--fg-subtle)' : 'var(--fg)'}
              >
                {text}
              </text>
            </g>
          );
        }),
      )}
    </Svg>
  );
}
