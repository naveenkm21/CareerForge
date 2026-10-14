import type { GraphState, Mark, Point } from '@careerforge/viz';
import { edgeTone, resolveMarks, toneSoft, toneStrong } from '../tones';
import { FONT, Svg } from './svg';

const R = 20;
const PAD = 34;

/**
 * Graph renderer. Positions are author-supplied (stable, readable), fitted to the viewBox.
 * Edges are drawn under nodes; directed edges end in an arrow at the node boundary.
 */
export function GraphView({
  id,
  state,
  marks,
  label,
  directed,
  weighted,
  layout,
}: {
  id: string;
  state: GraphState;
  marks: Mark[];
  label: string;
  directed: boolean;
  weighted: boolean;
  layout: Record<string, Point>;
}) {
  const m = resolveMarks(marks, id);
  const pts = state.nodes.map((n) => layout[n.id] ?? { x: 0, y: 0 });
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  const width = maxX - minX + PAD * 2;
  const height = maxY - minY + PAD * 2 + 10;
  const pos = (nodeId: string) => {
    const p = layout[nodeId] ?? { x: 0, y: 0 };
    return { x: p.x - minX + PAD, y: p.y - minY + PAD + 10 };
  };

  return (
    <Svg
      width={width}
      height={height}
      label={`${label}: ${state.nodes.length} nodes, ${state.edges.length} edges`}
      maxScale={1.15}
    >
      {state.edges.map((e) => {
        const a = pos(e.from);
        const b = pos(e.to);
        const tone = edgeTone(m, e.from, e.to, directed);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const end = directed ? R + 4 : R;
        const x1 = a.x + ux * R;
        const y1 = a.y + uy * R;
        const x2 = b.x - ux * end;
        const y2 = b.y - uy * end;
        const mx = (a.x + b.x) / 2 - uy * 11;
        const my = (a.y + b.y) / 2 + ux * 11;
        const faded = tone === 'excluded';
        return (
          <g key={`${e.from}-${e.to}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={{
                stroke: tone && !faded ? toneStrong(tone) : 'var(--border-strong)',
                strokeWidth: tone && !faded ? 3.25 : 1.6,
                opacity: faded ? 0.35 : 1,
                transition: 'stroke .25s, stroke-width .25s',
              }}
              strokeDasharray={faded ? '5 4' : undefined}
              markerEnd={
                directed ? `url(#cf-arrow-${tone && !faded ? tone : 'default'})` : undefined
              }
            />
            {weighted && e.weight !== undefined && (
              <g transform={`translate(${mx} ${my})`}>
                <rect
                  x={-10}
                  y={-9}
                  width={20}
                  height={17}
                  rx={4}
                  fill="var(--surface)"
                  stroke="var(--border)"
                />
                <text
                  y={4}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontSize={11}
                  fontWeight={600}
                  fill={tone && !faded ? toneStrong(tone) : 'var(--fg-muted)'}
                >
                  {e.weight}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {state.nodes.map((n) => {
        const p = pos(n.id);
        const tone = m.cells.get(n.id);
        const badge = state.badges[n.id];
        const ptrs = m.pointers.filter((x) => x.at === n.id);
        return (
          <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
            <circle
              r={R}
              style={{
                fill: tone ? toneSoft(tone) : 'var(--surface)',
                stroke: tone ? toneStrong(tone) : 'var(--border-strong)',
                strokeWidth: tone ? 2.5 : 1.5,
                opacity: tone === 'excluded' ? 0.5 : 1,
                transition: 'fill .25s, stroke .25s',
              }}
            />
            <text
              y={5}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={14}
              fontWeight={700}
              fill="var(--fg)"
            >
              {n.label}
            </text>
            {badge !== undefined && (
              <g transform={`translate(${R - 2} ${-R - 2})`}>
                <rect
                  x={-2}
                  y={-11}
                  width={Math.max(18, badge.length * 7 + 8)}
                  height={16}
                  rx={8}
                  fill="var(--fg)"
                />
                <text
                  x={Math.max(18, badge.length * 7 + 8) / 2 - 2}
                  y={1}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontSize={10}
                  fontWeight={700}
                  fill="var(--bg)"
                >
                  {badge}
                </text>
              </g>
            )}
            {ptrs.length > 0 && (
              <text
                y={R + 14}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={10}
                fontWeight={700}
                fill={toneStrong(ptrs[0]!.tone)}
              >
                {ptrs.map((x) => x.label).join(' · ')}
              </text>
            )}
          </g>
        );
      })}
    </Svg>
  );
}
