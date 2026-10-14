import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { intArray, smallInt } from '../shared';

export default defineAlgorithm({
  id: 'linear-search',
  title: 'Linear Search',
  category: 'searching',
  skillId: 'dsa.searching.linear-search',
  summary: 'Check each element in turn until the target turns up or the array runs out.',
  difficulty: 1,
  params: z.object({ arr: intArray(1, 24), target: smallInt }),
  inputSpec: [
    { name: 'arr', label: 'Array', kind: 'int-array' },
    { name: 'target', label: 'Target', kind: 'int' },
  ],
  defaultInput: { arr: [7, 3, 9, 1, 12, 5, 8], target: 12 },
  presets: [
    { label: 'Target present', input: { arr: [7, 3, 9, 1, 12, 5, 8], target: 12 } },
    { label: 'Target absent', input: { arr: [4, 8, 15, 16, 23, 42], target: 5 } },
  ],
  complexity: { time: 'O(n)', space: 'O(1)' },

  run({ arr, target }, t) {
    const a = t.array('a', arr, { label: 'a' });
    t.at('init')
      .vars({ n: arr.length, target })
      .say(`Scan left to right, looking for ${target}.`)
      .step();

    for (let i = 0; i < arr.length; i++) {
      const v = arr[i]!;
      a.pointer('i', i, 'active');
      t.at('compare')
        .vars({ i })
        .say(`a[${i}] = ${v}${v === target ? ` — that is ${target}!` : `, not ${target}.`}`)
        .invariant(`${target} is not in a[0..${i - 1}].`)
        .ask({
          kind: 'choice',
          prompt: `a[${i}] = ${v}. Does the scan stop here?`,
          options: ['Yes — return i', 'No — keep scanning'],
          answer: v === target ? 'Yes — return i' : 'No — keep scanning',
          explain:
            v === target
              ? 'The element equals the target, so we return its index.'
              : 'Only an exact match stops a linear search.',
        })
        .step();
      if (v === target) {
        a.cell(i, 'found');
        t.at('found')
          .say(`Found ${target} at index ${i} after ${i + 1} comparison${i ? 's' : ''}.`)
          .emphasis('result')
          .step();
        return i;
      }
      a.cell(i, 'excluded');
    }
    a.unpointer('i');
    t.at('notFound')
      .say(`Checked all ${arr.length} elements — ${target} is absent.`)
      .emphasis('result')
      .step();
    return -1;
  },
});
