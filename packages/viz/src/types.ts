/**
 * The Trace contract (docs/03-visualization-engine.md §2). Pure, serializable data — no
 * classes on the wire. Every renderer, the code pane, checkpoints, and (later) the assessment
 * item bank are functions of this shape.
 */

export type Lang = 'cpp' | 'java' | 'python' | 'ts';
export const LANGS: readonly Lang[] = ['cpp', 'java', 'python', 'ts'];
export const LANG_LABELS: Record<Lang, string> = {
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
  ts: 'TypeScript',
};

export type Scalar = number | string | boolean | null;
export type VarValue = Scalar | Scalar[];

/** Semantic tones. Renderers map these to colors; algorithms never pick colors. */
export type Tone =
  | 'active'
  | 'visited'
  | 'excluded'
  | 'candidate'
  | 'found'
  | 'frontier'
  | 'path'
  | 'error';
export const TONES: readonly Tone[] = [
  'active',
  'candidate',
  'frontier',
  'visited',
  'path',
  'found',
  'excluded',
  'error',
];

export type Point = { x: number; y: number };

export type StructureKind =
  | 'array'
  | 'matrix'
  | 'tree'
  | 'graph'
  | 'stack'
  | 'queue'
  | 'table'
  | 'flow';

/** Where a structure is drawn in the player's stage. */
export type Placement = 'main' | 'side';

type DeclBase = { id: string; label?: string; placement?: Placement };
export type StructureDecl =
  | (DeclBase & { kind: 'array' })
  | (DeclBase & { kind: 'matrix'; rows: number; cols: number })
  | (DeclBase & { kind: 'tree'; ordered: boolean })
  | (DeclBase & {
      kind: 'graph';
      directed: boolean;
      weighted: boolean;
      layout: Record<string, Point>;
    })
  | (DeclBase & { kind: 'stack' })
  | (DeclBase & { kind: 'queue'; priority?: boolean })
  | (DeclBase & { kind: 'table' })
  | (DeclBase & { kind: 'flow' });

/** A value with a stable identity, so renderers animate moves instead of re-mounting. */
export type Item = { id: string; value: Scalar; note?: string };

export type ArrayState = { kind: 'array'; items: Item[] };
export type MatrixState = {
  kind: 'matrix';
  cells: Scalar[][];
  rowLabels?: string[];
  colLabels?: string[];
};
export type TreeNode = { id: string; value: Scalar; left: string | null; right: string | null };
export type TreeState = { kind: 'tree'; root: string | null; nodes: Record<string, TreeNode> };
export type GraphEdge = { from: string; to: string; weight?: number };
export type GraphState = {
  kind: 'graph';
  nodes: { id: string; label: string }[];
  edges: GraphEdge[];
  /** Small text shown beside a node, e.g. a tentative distance. */
  badges: Record<string, string>;
};
export type StackState = { kind: 'stack'; items: Item[] };
export type QueueState = { kind: 'queue'; items: Item[] };
export type TableRow = { id: string; label: string; cells: Scalar[] };
export type TableState = { kind: 'table'; columns: string[]; rows: TableRow[] };
/** A left-to-right pipeline of stages (request lifecycles, query pipelines, state machines). */
export type FlowState = {
  kind: 'flow';
  nodes: { id: string; label: string; sub?: string }[];
  edges: { from: string; to: string }[];
  /** Message currently travelling along an edge, keyed `from->to`. */
  messages: Record<string, string>;
};

export type StructureState =
  | ArrayState
  | MatrixState
  | TreeState
  | GraphState
  | StackState
  | QueueState
  | TableState
  | FlowState;

/**
 * Cell addressing by structure kind:
 *   array → index · matrix → "r,c" · table → "rowId,col" · tree/graph → node id · stack/queue → item id
 */
export type Mark =
  | { type: 'pointer'; struct: string; at: number | string; label: string; tone: Tone }
  | { type: 'range'; struct: string; from: number; to: number; tone: Tone; key: string }
  | { type: 'cell'; struct: string; at: number | string; tone: Tone }
  | { type: 'edge'; struct: string; from: string; to: string; tone: Tone }
  | { type: 'compare'; struct: string; a: number; b: number };

export type Checkpoint =
  | { kind: 'choice'; prompt: string; options: string[]; answer: string; explain?: string }
  | { kind: 'value'; prompt: string; answer: string; explain?: string };

export type Emphasis = 'normal' | 'key' | 'result';

export type Step = {
  i: number;
  /** Named line anchor, resolved per language via CodeSource.anchors. */
  anchor: string;
  snapshot: Record<string, StructureState>;
  marks: Mark[];
  vars: Record<string, VarValue>;
  narration: string;
  invariant?: string;
  checkpoint?: Checkpoint;
  emphasis: Emphasis;
};

export type CodeSource = {
  lang: Lang;
  code: string;
  /** anchor name → 1-based line numbers in `code`. */
  anchors: Record<string, number[]>;
};

export type Complexity = { time: string; space: string };

export type Trace = {
  algorithmId: string;
  input: unknown;
  structures: StructureDecl[];
  steps: Step[];
  sources: Partial<Record<Lang, CodeSource>>;
  complexity: Complexity;
  result: VarValue | undefined;
};

export const MAX_STEPS = 500;
