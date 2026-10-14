import { z } from 'zod';
import { defineAlgorithm } from '../../define';

export default defineAlgorithm({
  id: 'sliding-window',
  title: 'Sliding Window: Shortest Subarray ≥ S',
  category: 'arrays',
  skillId: 'dsa.arrays.sliding-window',
  summary: 'Grow the window to reach the sum, then shrink it from the left while it stays valid.',
  difficulty: 3,
  params: z.object({
    arr: z.array(z.number().int().min(1).max(99)).min(1).max(24),
    s: z.number().int().min(1).max(2000),
  }),
  inputSpec: [
    { name: 'arr', label: 'Array (positive)', kind: 'int-array', hint: 'positive integers' },
    { name: 's', label: 'Target sum S', kind: 'int' },
  ],
  defaultInput: { arr: [2, 3, 1, 2, 4, 3], s: 7 },
  presets: [
    { label: 'Classic', input: { arr: [2, 3, 1, 2, 4, 3], s: 7 } },
    { label: 'Single element wins', input: { arr: [1, 4, 4, 9, 2, 1], s: 9 } },
    { label: 'Impossible', input: { arr: [1, 1, 1, 1], s: 10 } },
  ],
  complexity: { time: 'O(n)', space: 'O(1)' },

  run({ arr, s }, t) {
    const a = t.array('a', arr, { label: 'a' });
    let best = Infinity;
    let sum = 0;
    let l = 0;
    t.at('init')
      .vars({ s, sum, l, best: '∞' })
      .say(`Find the shortest contiguous window whose sum is at least ${s}.`)
      .step();

    for (let r = 0; r < arr.length; r++) {
      sum += arr[r]!;
      a.pointer('l', l, 'candidate').pointer('r', r, 'active').range(l, r, 'candidate', 'window');
      const valid = sum >= s;
      t.at('expand')
        .vars({ r, l, sum })
        .say(`Extend right to include a[${r}] = ${arr[r]}. Window sum = ${sum}.`)
        .invariant('sum = a[l] + … + a[r].')
        .ask({
          kind: 'choice',
          prompt: `The window sum is ${sum}; S = ${s}. Is the window valid?`,
          options: ['Yes — record it and shrink', 'No — keep expanding'],
          answer: valid ? 'Yes — record it and shrink' : 'No — keep expanding',
          explain: valid ? `${sum} ≥ ${s}.` : `${sum} < ${s}, so r must move right.`,
        })
        .step();

      while (sum >= s) {
        if (r - l + 1 < best) {
          best = r - l + 1;
          a.range(l, r, 'found', 'best');
        }
        t.at('record')
          .vars({ best })
          .say(`Valid window [${l}, ${r}] of length ${r - l + 1}. Best so far: ${best}.`)
          .step();
        sum -= arr[l]!;
        a.cell(l, 'excluded');
        l++;
        if (l <= r) a.pointer('l', l, 'candidate');
        else a.unpointer('l');
        a.range(l, r, 'candidate', 'window');
        t.at('shrink')
          .vars({ l, sum })
          .say(
            `Drop a[${l - 1}] = ${arr[l - 1]} from the left. Sum = ${sum}${sum >= s ? ' — still valid.' : '.'}`,
          )
          .step();
      }
    }
    const result = best === Infinity ? 0 : best;
    a.unpointer('l').unpointer('r').unrange('window');
    t.at('done')
      .vars({ best: result })
      .say(
        result
          ? `The shortest window has length ${result}.`
          : `No window reaches ${s}; the answer is 0.`,
      )
      .emphasis('result')
      .step();
    return result;
  },
});
