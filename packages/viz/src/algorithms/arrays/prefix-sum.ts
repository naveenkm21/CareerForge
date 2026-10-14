import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { intArray } from '../shared';

export default defineAlgorithm({
  id: 'prefix-sum',
  title: 'Prefix Sum: Range Query',
  category: 'arrays',
  skillId: 'dsa.arrays.prefix-sum',
  summary: 'Precompute running totals once; then any range sum is a single subtraction.',
  difficulty: 2,
  params: z
    .object({ arr: intArray(1, 20), l: z.number().int().min(0), r: z.number().int().min(0) })
    .refine((v) => v.l <= v.r && v.r < v.arr.length, {
      message: 'need 0 ≤ l ≤ r < n',
      path: ['r'],
    }),
  inputSpec: [
    { name: 'arr', label: 'Array', kind: 'int-array' },
    { name: 'l', label: 'Query l', kind: 'int' },
    { name: 'r', label: 'Query r', kind: 'int' },
  ],
  defaultInput: { arr: [3, 1, 4, 1, 5, 9, 2, 6], l: 2, r: 5 },
  presets: [
    { label: 'Middle range', input: { arr: [3, 1, 4, 1, 5, 9, 2, 6], l: 2, r: 5 } },
    { label: 'Whole array', input: { arr: [5, -2, 7, 0, 3], l: 0, r: 4 } },
  ],
  complexity: { time: 'O(n) build, O(1) query', space: 'O(n)' },

  run({ arr, l, r }, t) {
    const n = arr.length;
    const a = t.array('a', arr, { label: 'a' });
    const p = t.array('p', [0, ...arr.map(() => null)], { label: 'p (prefix)' });
    const prefix = [0];

    p.cell(0, 'found');
    t.at('init')
      .vars({ n })
      .say('p[i] will hold the sum of the first i elements. p[0] = 0 (the empty prefix).')
      .invariant('p[i] = a[0] + … + a[i−1]')
      .step();

    for (let i = 0; i < n; i++) {
      const next = prefix[i]! + arr[i]!;
      a.cell(i, 'active');
      p.cell(i, 'visited').cell(i + 1, 'active');
      t.at('build')
        .vars({ i })
        .say(`p[${i + 1}] = p[${i}] + a[${i}] = ${prefix[i]} + ${arr[i]}.`)
        .invariant('p[i] = a[0] + … + a[i−1]')
        .ask({
          kind: 'value',
          prompt: `What is p[${i + 1}] = p[${i}] + a[${i}]?`,
          answer: String(next),
          explain: `${prefix[i]} + ${arr[i]} = ${next}.`,
        })
        .step();
      prefix.push(next);
      p.set(i + 1, next).cell(i + 1, 'visited');
      a.uncell(i);
    }

    const ans = prefix[r + 1]! - prefix[l]!;
    a.clearMarks();
    p.clearMarks();
    a.range(l, r, 'found', 'query');
    p.pointer('p[r+1]', r + 1, 'active').pointer('p[l]', l, 'candidate');
    t.at('query')
      .vars({ l, r, sum: ans })
      .say(`sum(a[${l}..${r}]) = p[${r + 1}] − p[${l}] = ${prefix[r + 1]} − ${prefix[l]} = ${ans}.`)
      .emphasis('result')
      .step();
    return ans;
  },
});
