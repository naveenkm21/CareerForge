import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { smallInt } from '../shared';

export default defineAlgorithm({
  id: 'bubble-sort',
  title: 'Bubble Sort',
  category: 'sorting',
  skillId: 'dsa.sorting.elementary',
  summary:
    'Repeatedly swap adjacent out-of-order pairs; each pass bubbles the largest value to the end.',
  difficulty: 1,
  params: z.object({ arr: z.array(smallInt).min(1).max(14) }),
  inputSpec: [{ name: 'arr', label: 'Array', kind: 'int-array', hint: 'up to 14 values' }],
  defaultInput: { arr: [5, 1, 4, 2, 8, 3] },
  presets: [
    { label: 'Shuffled', input: { arr: [5, 1, 4, 2, 8, 3] } },
    { label: 'Nearly sorted (early exit)', input: { arr: [1, 2, 4, 3, 5, 6] } },
    { label: 'Reversed', input: { arr: [9, 7, 5, 3, 1] } },
  ],
  complexity: { time: 'O(n²)', space: 'O(1)' },

  run({ arr }, t) {
    const a = t.array('a', arr, { label: 'a' });
    const v = [...arr];
    const n = v.length;
    t.at('init')
      .vars({ n })
      .say('Each pass compares neighbours and swaps any pair that is out of order.')
      .step();

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - 1 - i; j++) {
        const out = v[j]! > v[j + 1]!;
        a.compare(j, j + 1);
        t.at('compare')
          .vars({ i, j, swapped })
          .say(`Compare a[${j}] = ${v[j]} with a[${j + 1}] = ${v[j + 1]}.`)
          .invariant(`The last ${i} element${i === 1 ? ' is' : 's are'} in final position.`)
          .ask({
            kind: 'choice',
            prompt: `a[${j}] = ${v[j]}, a[${j + 1}] = ${v[j + 1]}. Swap them?`,
            options: ['Swap', "Don't swap"],
            answer: out ? 'Swap' : "Don't swap",
            explain: out
              ? `${v[j]} > ${v[j + 1]}, so they are out of order.`
              : 'They are already in order.',
          })
          .step();
        if (out) {
          [v[j], v[j + 1]] = [v[j + 1]!, v[j]!];
          a.swap(j, j + 1);
          swapped = true;
          t.at('swap')
            .vars({ swapped })
            .say(`Swap → a[${j}] = ${v[j]}, a[${j + 1}] = ${v[j + 1]}.`)
            .step();
        }
      }
      a.cell(n - 1 - i, 'found');
      t.at('passDone')
        .vars({ swapped })
        .say(
          swapped
            ? `Pass ${i + 1} done: ${v[n - 1 - i]} is in its final place.`
            : `No swaps in pass ${i + 1} — the array is sorted. Stop early.`,
        )
        .step();
      if (!swapped) break;
    }
    a.cells(
      v.map((_, k) => k),
      'found',
    );
    t.at('done')
      .say(`Sorted: [${v.join(', ')}].`)
      .emphasis('result')
      .step();
    return v;
  },
});
