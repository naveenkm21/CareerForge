import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { intArray } from '../shared';

export default defineAlgorithm({
  id: 'next-greater-element',
  title: 'Next Greater Element',
  category: 'stacks-queues',
  skillId: 'dsa.stacks-queues.monotonic-stack',
  summary:
    'A decreasing stack of unresolved indices answers every "next greater" query in one pass.',
  difficulty: 3,
  params: z.object({ arr: intArray(1, 16) }),
  inputSpec: [{ name: 'arr', label: 'Array', kind: 'int-array' }],
  defaultInput: { arr: [4, 5, 2, 10, 8, 1, 3] },
  presets: [
    { label: 'Mixed', input: { arr: [4, 5, 2, 10, 8, 1, 3] } },
    { label: 'Decreasing (all wait)', input: { arr: [9, 7, 5, 3, 1] } },
  ],
  complexity: { time: 'O(n) amortized', space: 'O(n)' },

  run({ arr }, t) {
    const n = arr.length;
    const a = t.array('a', arr, { label: 'a' });
    const res = t.array(
      'res',
      arr.map(() => -1),
      { label: 'res' },
    );
    const st = t.stack('stack', { label: 'stack (indices, values decreasing)', placement: 'side' });
    const stackIdx: number[] = [];
    const itemIds: string[] = [];
    t.at('init')
      .say(
        'res starts as −1 everywhere. The stack holds indices still waiting for a greater value.',
      )
      .invariant('Values on the stack are decreasing from bottom to top.')
      .step();

    for (let i = 0; i < n; i++) {
      a.pointer('i', i, 'active');
      for (;;) {
        const top = stackIdx[stackIdx.length - 1];
        const pops = top !== undefined && arr[top]! < arr[i]!;
        if (top !== undefined) {
          st.cell(itemIds[itemIds.length - 1]!, 'active');
          a.compare(top, i);
        }
        t.at('compare')
          .vars({ i, 'a[i]': arr[i]!, top: top ?? null })
          .say(
            top === undefined
              ? 'The stack is empty.'
              : `Top index ${top} holds ${arr[top]}; a[i] = ${arr[i]}.`,
          )
          .invariant('Values on the stack are decreasing from bottom to top.')
          .ask({
            kind: 'choice',
            prompt:
              top === undefined
                ? `The stack is empty. Pop?`
                : `a[top] = ${arr[top]}, a[i] = ${arr[i]}. Does a[i] resolve the top?`,
            options: ['Yes — pop and record', 'No — push i'],
            answer: pops ? 'Yes — pop and record' : 'No — push i',
            explain: pops
              ? `${arr[i]} > ${arr[top!]}, so ${arr[i]} is the next greater element of index ${top}.`
              : 'Nothing on the stack is smaller than a[i].',
          })
          .step();
        if (!pops) break;
        stackIdx.pop();
        itemIds.pop();
        st.pop();
        res.set(top!, arr[i]!).cell(top!, 'found');
        a.cell(top!, 'visited');
        t.at('resolve').say(`res[${top}] = ${arr[i]}. Pop index ${top}.`).step();
      }
      st.clearMarks();
      stackIdx.push(i);
      itemIds.push(st.push(arr[i]!, `i=${i}`));
      a.cell(i, 'frontier');
      t.at('push').say(`Push index ${i} (${arr[i]}); it waits for something greater.`).step();
    }
    a.unpointer('i');
    t.at('done')
      .say(`Indices left on the stack have no greater element: res = [${res.values().join(', ')}].`)
      .emphasis('result')
      .step();
    return res.values();
  },
});
