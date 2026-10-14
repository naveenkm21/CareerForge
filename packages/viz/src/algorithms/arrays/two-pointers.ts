import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { intArray, isSortedAsc } from '../shared';

export default defineAlgorithm({
  id: 'two-pointers',
  title: 'Two Pointers: Pair Sum',
  category: 'arrays',
  skillId: 'dsa.arrays.two-pointers',
  summary:
    'Find two values in a sorted array that add up to a target by closing in from both ends.',
  difficulty: 2,
  params: z.object({
    arr: intArray(2, 32).refine(isSortedAsc, 'the array must be sorted ascending'),
    target: z.number().int().min(-1998).max(1998),
  }),
  inputSpec: [
    { name: 'arr', label: 'Sorted array', kind: 'int-array' },
    { name: 'target', label: 'Target sum', kind: 'int' },
  ],
  defaultInput: { arr: [1, 3, 4, 6, 8, 11, 14], target: 17 },
  presets: [
    { label: 'Pair exists', input: { arr: [1, 3, 4, 6, 8, 11, 14], target: 17 } },
    { label: 'No pair', input: { arr: [2, 4, 7, 9, 12], target: 8 } },
  ],
  complexity: { time: 'O(n)', space: 'O(1)' },

  run({ arr, target }, t) {
    const a = t.array('a', arr, { label: 'a (sorted)' });
    let l = 0;
    let r = arr.length - 1;
    const inv = 'Any valid pair uses indices inside [l, r].';

    a.pointer('l', l, 'active').pointer('r', r, 'active').range(l, r, 'candidate', 'window');
    t.at('init')
      .vars({ l, r, target })
      .say('Start with the smallest and the largest value.')
      .invariant(inv)
      .step();

    while (l < r) {
      const s = arr[l]! + arr[r]!;
      a.compare(l, r);
      const answer = s === target ? 'Found the pair' : s < target ? 'Move l right' : 'Move r left';
      t.at('sum')
        .vars({ l, r, sum: s })
        .say(`a[l] + a[r] = ${arr[l]} + ${arr[r]} = ${s}.`)
        .invariant(inv)
        .ask({
          kind: 'choice',
          prompt: `The sum is ${s} and the target is ${target}. What next?`,
          options: ['Found the pair', 'Move l right', 'Move r left'],
          answer,
          explain:
            s === target
              ? 'The sum matches.'
              : s < target
                ? 'The sum is too small; only a larger left value can raise it.'
                : 'The sum is too large; only a smaller right value can lower it.',
        })
        .step();

      if (s === target) {
        a.unrange('window').cell(l, 'found').cell(r, 'found');
        t.at('found')
          .say(`${arr[l]} + ${arr[r]} = ${target}. Pair at indices (${l}, ${r}).`)
          .emphasis('result')
          .step();
        return [l, r];
      }
      if (s < target) {
        a.cell(l, 'excluded');
        l++;
        a.pointer('l', l, 'active').range(l, r, 'candidate', 'window');
        t.at('moveLeft')
          .vars({ l })
          .say(`${s} < ${target}: a[l] cannot pair with anything, so l = ${l}.`)
          .invariant(inv)
          .step();
      } else {
        a.cell(r, 'excluded');
        r--;
        a.pointer('r', r, 'active').range(l, r, 'candidate', 'window');
        t.at('moveRight')
          .vars({ r })
          .say(`${s} > ${target}: a[r] cannot pair with anything, so r = ${r}.`)
          .invariant(inv)
          .step();
      }
    }
    a.unrange('window');
    t.at('notFound')
      .say('The pointers met — no pair sums to the target.')
      .emphasis('result')
      .step();
    return [-1, -1];
  },
});
