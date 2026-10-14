import type { z } from 'zod';
import { AuthoringError, Recorder, TraceLimitError } from './recorder';
import { SOURCES } from './generated/sources';
import type { Complexity, StructureKind, Trace, VarValue } from './types';

export type AlgorithmCategory =
  | 'searching'
  | 'arrays'
  | 'sorting'
  | 'stacks-queues'
  | 'trees'
  | 'heaps'
  | 'graphs'
  | 'dp'
  | 'os'
  | 'networks';

export const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  searching: 'Searching',
  arrays: 'Array Patterns',
  sorting: 'Sorting',
  'stacks-queues': 'Stacks & Queues',
  trees: 'Trees',
  heaps: 'Heaps',
  graphs: 'Graphs',
  dp: 'Dynamic Programming',
  os: 'Operating Systems',
  networks: 'Computer Networks',
};

/** Describes how the "edit input" form renders and parses each parameter. */
export type InputField =
  | { name: string; label: string; kind: 'int-array'; hint?: string }
  | { name: string; label: string; kind: 'int'; hint?: string }
  | { name: string; label: string; kind: 'string'; hint?: string }
  | { name: string; label: string; kind: 'string-list'; hint?: string }
  | { name: string; label: string; kind: 'int-grid'; hint?: string }
  | { name: string; label: string; kind: 'edge-list'; weighted: boolean; hint?: string };

export type AlgorithmDef<P> = {
  id: string;
  title: string;
  category: AlgorithmCategory;
  /** Taxonomy slug from content/skills.yaml. */
  skillId: string;
  summary: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  params: z.ZodType<P, z.ZodTypeDef, unknown>;
  inputSpec: InputField[];
  defaultInput: P;
  presets?: { label: string; input: P }[];
  complexity: Complexity;
  run(input: P, t: Recorder): VarValue | void;
};

// Heterogeneous registry storage: the parameter type is erased at the registry boundary and
// re-established by `params` validation on every run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAlgorithm = AlgorithmDef<any>;

export function defineAlgorithm<P>(def: AlgorithmDef<P>): AlgorithmDef<P> {
  return def;
}

export type RunResult =
  | { ok: true; trace: Trace }
  | { ok: false; error: string; kind: 'input' | 'limit' | 'internal' };

/**
 * Validates input and runs the reference implementation into a Trace. Pure and synchronous —
 * sub-millisecond at pedagogical sizes, so the browser re-runs it on every input edit.
 */
export function runAlgorithm(def: AnyAlgorithm, rawInput: unknown): RunResult {
  const parsed = def.params.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    return { ok: false, kind: 'input', error: msg };
  }
  const t = new Recorder();
  let result: VarValue | void;
  try {
    result = def.run(parsed.data, t);
  } catch (err) {
    if (err instanceof TraceLimitError) return { ok: false, kind: 'limit', error: err.message };
    if (err instanceof InputError) return { ok: false, kind: 'input', error: err.message };
    if (err instanceof AuthoringError) return { ok: false, kind: 'internal', error: err.message };
    throw err;
  }
  return {
    ok: true,
    trace: {
      algorithmId: def.id,
      input: parsed.data,
      structures: t.structures,
      steps: t.steps,
      sources: SOURCES[def.id] ?? {},
      complexity: def.complexity,
      result: result === undefined ? undefined : result,
    },
  };
}

/** Thrown by an algorithm for inputs that pass the schema but are semantically invalid. */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

export function structureKindsOf(trace: Trace): StructureKind[] {
  return [...new Set(trace.structures.map((s) => s.kind))];
}
