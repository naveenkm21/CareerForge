import { describe, expect, it } from 'vitest';
import { tokenizeLine } from './highlight';
import { resolveMarks, edgeTone } from './tones';

describe('tokenizeLine', () => {
  it('reassembles to the original line', () => {
    const lines = [
      '    if (a[mid] == target) return mid;',
      "    s = 'a # b'  # real comment",
      'int x = 42; // note',
    ];
    for (const l of lines)
      expect(
        tokenizeLine(l, l.includes('#') ? 'python' : 'cpp')
          .map((t) => t.text)
          .join(''),
      ).toBe(l);
  });

  it('classifies keywords, numbers, strings and comments', () => {
    const toks = tokenizeLine('return -1; // done', 'cpp');
    expect(toks.find((t) => t.text === 'return')?.kind).toBe('kw');
    expect(toks.find((t) => t.text === '1')?.kind).toBe('num');
    expect(toks[toks.length - 1]).toEqual({ kind: 'com', text: '// done' });
    expect(tokenizeLine("x = '#'", 'python').some((t) => t.kind === 'com')).toBe(false);
  });
});

describe('resolveMarks', () => {
  it('later cell marks win and undirected edges match both ways', () => {
    const r = resolveMarks(
      [
        { type: 'cell', struct: 'a', at: 1, tone: 'active' },
        { type: 'cell', struct: 'a', at: 1, tone: 'found' },
        { type: 'edge', struct: 'a', from: 'B', to: 'A', tone: 'path' },
        { type: 'cell', struct: 'other', at: 1, tone: 'error' },
      ],
      'a',
    );
    expect(r.cells.get('1')).toBe('found');
    expect(edgeTone(r, 'A', 'B', false)).toBe('path');
    expect(edgeTone(r, 'A', 'B', true)).toBeUndefined();
  });
});
