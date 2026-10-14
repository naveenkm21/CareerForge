import type { FlowState, Mark } from '@careerforge/viz';
import { resolveMarks, toneSoft, toneStrong } from '../tones';
import { FONT, Svg } from './svg';

const W = 112;
const H = 58;
const GAP = 64;
const PAD = 12;
const MSG = 34;

/** A left-to-right pipeline: request lifecycles, query pipelines, state machines. */
export function FlowView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: FlowState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  const n = state.nodes.length;
  const width = PAD * 2 + n * W + (n - 1) * GAP;
  const height = PAD * 2 + MSG + H + 16;
  const x = (i: number) => PAD + i * (W + GAP);
  const y = PAD + MSG;
  const index = new Map(state.nodes.map((node, i) => [node.id, i]));

  return (
    <Svg
      width={width}
      height={height}
      label={`${label}: ${state.nodes.map((s) => s.label).join(' → ')}`}
      maxScale={1}
    >
      {state.edges.map((e) => {
        const a = index.get(e.from)!;
        const b = index.get(e.to)!;
        const tone = m.edges.get(`${e.from}->${e.to}`);
        const msg = state.messages[`${e.from}->${e.to}`];
        const x1 = x(a) + W;
        const x2 = x(b) - 4;
        const mid = (x1 + x2) / 2;
        return (
          <g key={`${e.from}-${e.to}`}>
            <line
              x1={x1}
              y1={y + H / 2}
              x2={x2}
              y2={y + H / 2}
              style={{
                stroke: tone ? toneStrong(tone) : 'var(--border-strong)',
                strokeWidth: tone ? 3 : 1.5,
                transition: 'stroke .25s',
              }}
              markerEnd={`url(#cf-arrow-${tone ?? 'default'})`}
            />
            {msg && (
              <g transform={`translate(${mid} ${y - 10})`}>
                <rect
                  x={-((msg.length * 6.2) / 2) - 6}
                  y={-14}
                  width={msg.length * 6.2 + 12}
                  height={20}
                  rx={10}
                  fill={tone ? toneSoft(tone) : 'var(--surface-2)'}
                  stroke={tone ? toneStrong(tone) : 'var(--border)'}
                />
                <text
                  y={0}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontSize={10.5}
                  fontWeight={600}
                  fill="var(--fg)"
                >
                  {msg}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {state.nodes.map((node, i) => {
        const tone = m.cells.get(node.id);
        return (
          <g key={node.id} transform={`translate(${x(i)} ${y})`}>
            <rect
              width={W}
              height={H}
              rx={10}
              style={{
                fill: tone ? toneSoft(tone) : 'var(--surface)',
                stroke: tone ? toneStrong(tone) : 'var(--border-strong)',
                strokeWidth: tone ? 2.25 : 1.25,
                transition: 'fill .25s, stroke .25s',
              }}
            />
            <text
              x={W / 2}
              y={node.sub ? 25 : 34}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="var(--fg)"
            >
              {node.label}
            </text>
            {node.sub && (
              <text
                x={W / 2}
                y={43}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={10}
                fill="var(--fg-muted)"
              >
                {node.sub.length > 16 ? `${node.sub.slice(0, 15)}…` : node.sub}
              </text>
            )}
          </g>
        );
      })}
    </Svg>
  );
}
