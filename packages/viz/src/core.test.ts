import { describe, expect, it } from 'vitest';
import { extractAnchors } from './anchors';
import { formatInputForm, parseField, parseInputForm } from './input-codec';
import { Recorder, TraceLimitError, AuthoringError } from './recorder';

describe('extractAnchors', () => {
  it('strips anchor comments and indexes 1-based lines', () => {
    const src = 'int f() {\n    int x = 1;   // @init\n    return x; // @ret @done\n}\n\n';
    const { code, anchors } = extractAnchors(src, 'cpp');
    expect(code).toBe('int f() {\n    int x = 1;\n    return x;\n}');
    expect(anchors).toEqual({ init: [2], ret: [3], done: [3] });
  });

  it('handles python comments, CRLF, and multi-line anchors', () => {
    const { code, anchors } = extractAnchors('a = 1  # @x\r\nb = 2  # @x\r\n', 'python');
    expect(code).toBe('a = 1\nb = 2');
    expect(anchors).toEqual({ x: [1, 2] });
  });

  it('leaves ordinary comments and #include alone', () => {
    const { code, anchors } = extractAnchors(
      '#include <vector> // std\nint y; // note @ here',
      'cpp',
    );
    expect(code).toBe('#include <vector> // std\nint y; // note @ here');
    expect(anchors).toEqual({});
  });

  it('rejects anchors on blank lines', () => {
    expect(() => extractAnchors('   // @x', 'cpp')).toThrow(/blank/);
  });
});

describe('Recorder', () => {
  it('captures full, independent snapshots per step (ADR-004)', () => {
    const t = new Recorder();
    const a = t.array('a', [3, 1]);
    t.at('s0').step();
    a.swap(0, 1).set(1, 9);
    t.at('s1').step();
    expect(t.steps[0]!.snapshot.a).toEqual({
      kind: 'array',
      items: [
        { id: 'a0', value: 3 },
        { id: 'a1', value: 1 },
      ],
    });
    expect(t.steps[1]!.snapshot.a).toEqual({
      kind: 'array',
      items: [
        { id: 'a1', value: 1 },
        { id: 'a0', value: 9 },
      ],
    });
  });

  it('marks are sticky and keyed; compare marks are transient', () => {
    const t = new Recorder();
    const a = t.array('a', [1, 2, 3]);
    a.pointer('i', 0).compare(0, 1);
    t.at('x').step();
    a.pointer('i', 2);
    t.at('y').step();
    expect(t.steps[0]!.marks.map((m) => m.type)).toEqual(['pointer', 'compare']);
    expect(t.steps[1]!.marks).toEqual([
      { type: 'pointer', struct: 'a', at: 2, label: 'i', tone: 'active' },
    ]);
  });

  it('vars are sticky and removable', () => {
    const t = new Recorder();
    t.array('a', [1]);
    t.at('x').vars({ lo: 0, hi: 5 }).step();
    t.at('y').vars({ hi: undefined }).step();
    expect(t.steps[0]!.vars).toEqual({ lo: 0, hi: 5 });
    expect(t.steps[1]!.vars).toEqual({ lo: 0 });
  });

  it('enforces authoring rules', () => {
    const t = new Recorder(3);
    t.array('a', [1]);
    expect(() => t.step()).toThrow(AuthoringError);
    t.at('x').step();
    expect(() => t.array('b', [])).toThrow(/before the first step/);
    t.at('x').step();
    t.at('x').step();
    expect(() => t.at('x').step()).toThrow(TraceLimitError);
  });

  it('priority queue is stable and ordered', () => {
    const t = new Recorder();
    const q = t.queue('pq', { priority: true });
    q.push('A', 3);
    q.push('B', 1);
    q.push('C', 3);
    q.push('D', 2);
    expect(q.items().map((i) => i.value)).toEqual(['B', 'D', 'A', 'C']);
    expect(q.dequeue()).toMatchObject({ value: 'B', priority: 1 });
  });
});

describe('input codec', () => {
  it('round-trips every field kind', () => {
    const fields = [
      { name: 'arr', label: 'Array', kind: 'int-array' as const },
      { name: 'n', label: 'N', kind: 'int' as const },
      { name: 'grid', label: 'Grid', kind: 'int-grid' as const },
      { name: 'nodes', label: 'Nodes', kind: 'string-list' as const },
      { name: 'edges', label: 'Edges', kind: 'edge-list' as const, weighted: true },
    ];
    const input = {
      arr: [2, -5, 8],
      n: 7,
      grid: [
        [1, 0],
        [0, 1],
      ],
      nodes: ['A', 'B'],
      edges: [{ from: 'A', to: 'B', weight: 4 }],
    };
    const texts = formatInputForm(fields, input);
    expect(parseInputForm(fields, texts)).toEqual({ ok: true, value: input });
  });

  it('reports readable errors', () => {
    expect(parseField({ name: 'a', label: 'Array', kind: 'int-array' }, '1, x, 3')).toEqual({
      ok: false,
      error: 'Array: "x" is not a whole number',
    });
    expect(
      parseField({ name: 'e', label: 'Edges', kind: 'edge-list', weighted: true }, 'A-B'),
    ).toMatchObject({ ok: false });
  });
});
