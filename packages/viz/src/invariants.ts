import { LANGS, MAX_STEPS, type Mark, type StructureState, type Trace } from './types';

/**
 * Structural invariants every trace must satisfy (docs/03 §8). Returns human-readable problems;
 * empty means valid. Pure, so the registry-wide test suite and the (future) admin preview both
 * use it.
 */
export function checkTrace(trace: Trace, opts: { requireAllLanguages?: boolean } = {}): string[] {
  const problems: string[] = [];
  const { steps, structures } = trace;
  const p = (msg: string) => problems.push(msg);

  if (steps.length === 0) p('trace has no steps');
  if (steps.length > MAX_STEPS) p(`trace has ${steps.length} steps (max ${MAX_STEPS})`);

  const langs = LANGS.filter((l) => trace.sources[l]);
  if (opts.requireAllLanguages) {
    for (const l of LANGS) if (!trace.sources[l]) p(`missing ${l} source`);
  }

  const last = steps[steps.length - 1];
  if (last && last.emphasis !== 'result') p('last step must have emphasis "result"');

  steps.forEach((step, idx) => {
    const at = `step ${idx}`;
    if (step.i !== idx) p(`${at}: i = ${step.i}`);
    for (const l of langs) {
      const lines = trace.sources[l]!.anchors[step.anchor];
      if (!lines?.length) p(`${at}: anchor "${step.anchor}" missing in ${l} source`);
    }
    for (const decl of structures) {
      const s = step.snapshot[decl.id];
      if (!s) p(`${at}: snapshot missing structure "${decl.id}"`);
      else if (s.kind !== decl.kind) p(`${at}: "${decl.id}" is ${s.kind}, declared ${decl.kind}`);
    }
    for (const m of step.marks) {
      const err = checkMark(m, step.snapshot[m.struct]);
      if (err) p(`${at}: ${err}`);
    }
    const cp = step.checkpoint;
    if (cp) {
      if (idx === steps.length - 1) p(`${at}: checkpoint on the last step has nothing to reveal`);
      if (cp.kind === 'choice') {
        if (cp.options.length < 2) p(`${at}: choice checkpoint needs ≥ 2 options`);
        if (new Set(cp.options).size !== cp.options.length)
          p(`${at}: duplicate checkpoint options`);
        if (!cp.options.includes(cp.answer)) p(`${at}: answer "${cp.answer}" is not an option`);
      } else if (cp.answer.trim() === '') {
        p(`${at}: value checkpoint has an empty answer`);
      }
    }
  });
  return problems;
}

function checkMark(m: Mark, s: StructureState | undefined): string | null {
  if (!s) return `mark references unknown structure "${m.struct}"`;
  const where = `${m.type} mark on "${m.struct}"`;
  switch (s.kind) {
    case 'array': {
      const n = s.items.length;
      const inb = (i: unknown) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < n;
      if (m.type === 'pointer' || m.type === 'cell')
        return inb(m.at) ? null : `${where}: index ${m.at} out of bounds (n=${n})`;
      if (m.type === 'range')
        return inb(m.from) && inb(m.to) && m.from <= m.to
          ? null
          : `${where}: range [${m.from}, ${m.to}] invalid (n=${n})`;
      if (m.type === 'compare')
        return inb(m.a) && inb(m.b) ? null : `${where}: compare ${m.a},${m.b} out of bounds`;
      return `${where}: not valid on arrays`;
    }
    case 'matrix': {
      if (m.type !== 'pointer' && m.type !== 'cell') return `${where}: not valid on matrices`;
      const [r, c] = String(m.at).split(',').map(Number);
      return r !== undefined &&
        c !== undefined &&
        r >= 0 &&
        r < s.cells.length &&
        c >= 0 &&
        c < (s.cells[0]?.length ?? 0)
        ? null
        : `${where}: cell ${m.at} out of bounds`;
    }
    case 'table': {
      if (m.type !== 'pointer' && m.type !== 'cell') return `${where}: not valid on tables`;
      const [rowId, col] = String(m.at).split(',');
      const row = s.rows.find((r) => r.id === rowId);
      return row && Number(col) >= 0 && Number(col) < s.columns.length
        ? null
        : `${where}: cell ${m.at} does not exist`;
    }
    case 'tree':
    case 'graph': {
      const has = (id: string) =>
        s.kind === 'tree' ? id in s.nodes : s.nodes.some((n) => n.id === id);
      if (m.type === 'pointer' || m.type === 'cell')
        return has(String(m.at)) ? null : `${where}: node ${m.at} does not exist`;
      if (m.type === 'edge') {
        if (!has(m.from) || !has(m.to))
          return `${where}: edge ${m.from}→${m.to} has a missing endpoint`;
        if (s.kind === 'graph') {
          const found = s.edges.some(
            (e) => (e.from === m.from && e.to === m.to) || (e.from === m.to && e.to === m.from),
          );
          return found ? null : `${where}: edge ${m.from}→${m.to} is not in the graph`;
        }
        const parent = s.nodes[m.from]!;
        return parent.left === m.to || parent.right === m.to
          ? null
          : `${where}: ${m.to} is not a child of ${m.from}`;
      }
      return `${where}: not valid on ${s.kind}s`;
    }
    case 'flow': {
      const has = (id: string) => s.nodes.some((n) => n.id === id);
      if (m.type === 'cell' || m.type === 'pointer')
        return has(String(m.at)) ? null : `${where}: stage ${m.at} does not exist`;
      if (m.type === 'edge')
        return s.edges.some((e) => e.from === m.from && e.to === m.to)
          ? null
          : `${where}: no edge ${m.from}→${m.to}`;
      return `${where}: not valid on flows`;
    }
    case 'stack':
    case 'queue': {
      if (m.type !== 'pointer' && m.type !== 'cell') return `${where}: not valid on ${s.kind}s`;
      return s.items.some((it) => it.id === m.at) ? null : `${where}: item ${m.at} does not exist`;
    }
  }
}
