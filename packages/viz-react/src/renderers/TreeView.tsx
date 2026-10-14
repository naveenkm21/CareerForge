import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hierarchy, tree as d3tree } from 'd3-hierarchy';
import type { Mark, TreeState } from '@careerforge/viz';
import { edgeTone, formatScalar, resolveMarks, toneSoft, toneStrong } from '../tones';
import { FONT, Svg, valueFontSize } from './svg';

const R = 19;
const DX = 46;
const DY = 66;
const PAD = 28;

type H = { id: string | null; children?: H[] };

/**
 * Reingold–Tilford layout via d3-hierarchy (layout math only; React owns the DOM — ADR-012).
 * A node with one child gets an invisible placeholder sibling so a lone right child still
 * sits to the right.
 */
export function layoutTree(
  state: TreeState,
): { id: string; x: number; y: number; parent: string | null }[] {
  if (!state.root) return [];
  const build = (id: string | null): H => {
    if (id === null) return { id: null };
    const n = state.nodes[id];
    if (!n) return { id: null };
    if (n.left === null && n.right === null) return { id };
    return { id, children: [build(n.left), build(n.right)] };
  };
  const root = hierarchy<H>(build(state.root), (d) => d.children);
  d3tree<H>()
    .nodeSize([DX, DY])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(root);
  return root
    .descendants()
    .filter((d) => d.data.id !== null)
    .map((d) => ({ id: d.data.id!, x: d.x ?? 0, y: d.y ?? 0, parent: d.parent?.data.id ?? null }));
}

export function TreeView({
  id,
  state,
  marks,
  label,
}: {
  id: string;
  state: TreeState;
  marks: Mark[];
  label: string;
}) {
  const m = resolveMarks(marks, id);
  const nodes = useMemo(() => layoutTree(state), [state]);

  if (nodes.length === 0) {
    return (
      <Svg width={200} height={70} label={`${label}: empty tree`}>
        <circle
          cx={100}
          cy={35}
          r={R}
          fill="none"
          stroke="var(--border-strong)"
          strokeDasharray="4 4"
        />
        <text x={100} y={39} textAnchor="middle" fontSize={11} fill="var(--fg-subtle)">
          null
        </text>
      </Svg>
    );
  }

  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const width = Math.max(maxX - minX + PAD * 2 + R * 2, 160);
  const height = maxY + PAD * 2 + R * 2;
  const ox = PAD + R - minX + (width - (maxX - minX + PAD * 2 + R * 2)) / 2;
  const oy = PAD + R;
  const pos = new Map(nodes.map((n) => [n.id, { x: n.x + ox, y: n.y + oy }]));
  const pointersAt = new Map<string, string[]>();
  for (const p of m.pointers) pointersAt.set(p.at, [...(pointersAt.get(p.at) ?? []), p.label]);

  return (
    <Svg width={width} height={height} label={`${label}: tree with ${nodes.length} nodes`}>
      {nodes
        .filter((n) => n.parent)
        .map((n) => {
          const a = pos.get(n.parent!)!;
          const b = pos.get(n.id)!;
          const tone = edgeTone(m, n.parent!, n.id, true);
          return (
            <motion.line
              key={`e-${n.id}`}
              initial={false}
              animate={{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }}
              style={{
                stroke: tone ? toneStrong(tone) : 'var(--border-strong)',
                transition: 'stroke .25s',
              }}
              strokeWidth={tone ? 3 : 1.5}
            />
          );
        })}
      <AnimatePresence initial={false}>
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const tone = m.cells.get(n.id);
          const text = formatScalar(state.nodes[n.id]!.value);
          const ptrs = pointersAt.get(n.id);
          return (
            <motion.g
              key={n.id}
              initial={{ x: p.x, y: p.y, opacity: 0, scale: 0.6 }}
              animate={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
            >
              <circle
                r={R}
                style={{
                  fill: tone ? toneSoft(tone) : 'var(--surface)',
                  stroke: tone ? toneStrong(tone) : 'var(--border-strong)',
                  strokeWidth: tone ? 2.25 : 1.5,
                  transition: 'fill .25s, stroke .25s',
                }}
              />
              <text
                y={5}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={valueFontSize(text, 14)}
                fontWeight={600}
                fill="var(--fg)"
              >
                {text}
              </text>
              {ptrs && (
                <text
                  y={-R - 6}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontSize={10}
                  fontWeight={700}
                  fill={toneStrong('active')}
                >
                  {ptrs.join(' · ')}
                </text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>
    </Svg>
  );
}
