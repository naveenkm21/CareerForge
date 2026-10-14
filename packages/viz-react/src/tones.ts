import type { Mark, Tone } from '@careerforge/viz';

export const toneStrong = (t: Tone) => `var(--tone-${t})`;
export const toneSoft = (t: Tone) => `var(--tone-${t}-soft)`;

export const TONE_LABELS: Record<Tone, string> = {
  active: 'Current',
  candidate: 'Candidate',
  frontier: 'Discovered / queued',
  visited: 'Processed',
  path: 'Chosen path',
  found: 'Found / final',
  excluded: 'Ruled out',
  error: 'Conflict',
};

export type ResolvedMarks = {
  /** Cell tone by address (`String(at)`). Later marks win. */
  cells: Map<string, Tone>;
  pointers: { at: string; label: string; tone: Tone }[];
  ranges: { from: number; to: number; tone: Tone; key: string }[];
  /** Edge tone keyed `from->to`; use edgeTone() for undirected lookup. */
  edges: Map<string, Tone>;
  compare: { a: number; b: number } | null;
};

export function resolveMarks(marks: Mark[], struct: string): ResolvedMarks {
  const out: ResolvedMarks = {
    cells: new Map(),
    pointers: [],
    ranges: [],
    edges: new Map(),
    compare: null,
  };
  for (const m of marks) {
    if (m.struct !== struct) continue;
    switch (m.type) {
      case 'cell':
        out.cells.set(String(m.at), m.tone);
        break;
      case 'pointer':
        out.pointers.push({ at: String(m.at), label: m.label, tone: m.tone });
        break;
      case 'range':
        out.ranges.push({ from: m.from, to: m.to, tone: m.tone, key: m.key });
        break;
      case 'edge':
        out.edges.set(`${m.from}->${m.to}`, m.tone);
        break;
      case 'compare':
        out.compare = { a: m.a, b: m.b };
        break;
    }
  }
  return out;
}

export function edgeTone(
  marks: ResolvedMarks,
  from: string,
  to: string,
  directed: boolean,
): Tone | undefined {
  return (
    marks.edges.get(`${from}->${to}`) ?? (directed ? undefined : marks.edges.get(`${to}->${from}`))
  );
}

export function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return '·';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `[${v.map(formatScalar).join(', ')}]`;
  return String(v);
}
