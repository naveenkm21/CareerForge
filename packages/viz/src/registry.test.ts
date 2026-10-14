import { describe, expect, it } from 'vitest';
import { runAlgorithm } from './define';
import { checkTrace } from './invariants';
import { allAlgorithms, listAlgorithms } from './registry';
import type { Trace } from './types';

/**
 * The registry-wide invariant suite (docs/03 §8). A new algorithm is validated the moment it is
 * registered: no per-algorithm boilerplate required.
 */
const traceOf = (id: string, input: unknown): Trace => {
  const def = allAlgorithms().find((a) => a.id === id)!;
  const r = runAlgorithm(def, input);
  if (!r.ok) throw new Error(`${id}: ${r.error}`);
  return r.trace;
};

describe('registry', () => {
  it('has at least 20 algorithms covering all Phase 2–3 renderers', () => {
    const metas = listAlgorithms();
    expect(metas.length).toBeGreaterThanOrEqual(20);
    const kinds = new Set(metas.flatMap((m) => m.structureKinds));
    for (const k of ['array', 'matrix', 'tree', 'graph', 'stack', 'queue', 'table'])
      expect(kinds).toContain(k);
  });
});

describe.each(allAlgorithms().map((a) => [a.id, a] as const))('%s', (id, def) => {
  const inputs = [{ label: 'default', input: def.defaultInput }, ...(def.presets ?? [])];

  it('default input and presets satisfy the params schema', () => {
    for (const { input } of inputs) expect(def.params.safeParse(input).success).toBe(true);
  });

  it.each(inputs.map((p) => [p.label, p.input] as const))(
    'invariants hold for "%s"',
    (_label, input) => {
      const trace = traceOf(id, input);
      expect(checkTrace(trace, { requireAllLanguages: true })).toEqual([]);
    },
  );

  it('is deterministic and JSON-serializable', () => {
    const a = traceOf(id, def.defaultInput);
    const b = traceOf(id, def.defaultInput);
    expect(b).toEqual(a);
    expect(JSON.parse(JSON.stringify(a.steps))).toEqual(a.steps);
  });

  it('declares an input field for every parameter', () => {
    const fieldNames = def.inputSpec.map((f) => f.name).sort();
    expect(fieldNames).toEqual(Object.keys(def.defaultInput as object).sort());
  });

  it('has at least one interactive checkpoint', () => {
    const trace = traceOf(id, def.defaultInput);
    expect(trace.steps.some((s) => s.checkpoint)).toBe(true);
  });

  it('matches the golden trace', async () => {
    const trace = traceOf(id, def.defaultInput);
    const golden = {
      algorithmId: trace.algorithmId,
      input: trace.input,
      result: trace.result ?? null,
      steps: trace.steps,
    };
    await expect(JSON.stringify(golden, null, 1)).toMatchFileSnapshot(`./__golden__/${id}.json`);
  });
});
