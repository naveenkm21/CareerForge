import { z } from 'zod';
import type { Point } from '../types';

export const smallInt = z.number().int().min(-999).max(999);
export const intArray = (min: number, max: number) => z.array(smallInt).min(min).max(max);

export const isSortedAsc = (a: readonly number[]) => a.every((v, i) => i === 0 || a[i - 1]! <= v);

// ── Graphs ─────────────────────────────────────────────────────────────────

const nodeId = z.string().regex(/^[A-Za-z0-9]{1,3}$/, 'node names are 1–3 letters or digits');

export type GraphInput = {
  nodes: string[];
  edges: { from: string; to: string; weight?: number }[];
  source: string;
};

/** Structural checks shared by every graph algorithm; weight rules vary per algorithm. */
const graphEdge = (weighted: boolean) =>
  z.object({
    from: nodeId,
    to: nodeId,
    weight: weighted ? z.number().int().min(0).max(99) : z.number().int().optional(),
  });

export function graphParams(opts: { weighted: boolean; maxNodes?: number; maxEdges?: number }) {
  const { weighted, maxNodes = 12, maxEdges = 30 } = opts;
  return z
    .object({
      nodes: z.array(nodeId).min(1).max(maxNodes),
      edges: z.array(graphEdge(weighted)).max(maxEdges),
      source: nodeId,
    })
    .superRefine((g, ctx) => {
      if (!g.nodes.includes(g.source))
        ctx.addIssue({ code: 'custom', path: ['source'], message: `"${g.source}" is not a node` });
      checkGraph(g, ctx);
    });
}

/** Graph without a start node (e.g. topological sort). */
export function dagParams(opts: { maxNodes?: number; maxEdges?: number } = {}) {
  const { maxNodes = 12, maxEdges = 30 } = opts;
  return z
    .object({
      nodes: z.array(nodeId).min(1).max(maxNodes),
      edges: z.array(graphEdge(false)).max(maxEdges),
    })
    .superRefine((g, ctx) => checkGraph(g, ctx));
}

function checkGraph(
  g: { nodes: string[]; edges: { from: string; to: string }[] },
  ctx: z.RefinementCtx,
) {
  const set = new Set(g.nodes);
  if (set.size !== g.nodes.length)
    ctx.addIssue({ code: 'custom', path: ['nodes'], message: 'node names must be unique' });
  const seen = new Set<string>();
  for (const e of g.edges) {
    if (!set.has(e.from) || !set.has(e.to)) {
      ctx.addIssue({
        code: 'custom',
        path: ['edges'],
        message: `edge ${e.from}-${e.to} uses an unknown node`,
      });
    }
    if (e.from === e.to)
      ctx.addIssue({ code: 'custom', path: ['edges'], message: `self-loop on ${e.from}` });
    const k = `${e.from}>${e.to}`;
    if (seen.has(k))
      ctx.addIssue({
        code: 'custom',
        path: ['edges'],
        message: `duplicate edge ${e.from}-${e.to}`,
      });
    seen.add(k);
  }
}

/**
 * Author-supplied coordinates beat automatic layout for readability (docs/03 §4). If the user
 * edits the graph to include nodes the preset does not know, fall back to a deterministic circle.
 */
export function layoutFor(
  nodes: string[],
  preferred: Record<string, Point>,
): Record<string, Point> {
  if (nodes.every((n) => preferred[n]))
    return Object.fromEntries(nodes.map((n) => [n, preferred[n]!]));
  return circleLayout(nodes);
}

export function circleLayout(nodes: string[]): Record<string, Point> {
  const r = 160;
  return Object.fromEntries(
    nodes.map((n, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / nodes.length;
      return [n, { x: Math.round(200 + r * Math.cos(a)), y: Math.round(180 + r * Math.sin(a)) }];
    }),
  );
}

/** Build a BST from values (duplicates go right) without recording steps. */
export function buildBst(
  tree: {
    add(v: number): string;
    setRoot(id: string): unknown;
    node(id: string): { value: unknown; left: string | null; right: string | null };
    setLeft(p: string, c: string): unknown;
    setRight(p: string, c: string): unknown;
    root: string | null;
  },
  values: number[],
): void {
  for (const v of values) {
    const id = tree.add(v);
    if (tree.root === null) {
      tree.setRoot(id);
      continue;
    }
    let cur = tree.root;
    for (;;) {
      const n = tree.node(cur);
      if (v < (n.value as number)) {
        if (n.left === null) {
          tree.setLeft(cur, id);
          break;
        }
        cur = n.left;
      } else {
        if (n.right === null) {
          tree.setRight(cur, id);
          break;
        }
        cur = n.right;
      }
    }
  }
}
