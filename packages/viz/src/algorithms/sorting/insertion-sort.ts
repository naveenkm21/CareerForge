import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { smallInt } from '../shared';

export default defineAlgorithm({
  id: 'insertion-sort',
  title: 'Insertion Sort',
  category: 'sorting',
  skillId: 'dsa.sorting.elementary',
  summary: 'Grow a sorted prefix by sliding each new element left until it fits.',
  difficulty: 1,
  params: z.object({ arr: z.array(smallInt).min(1).max(14) }),
  inputSpec: [{ name: 'arr', label: 'Array', kind: 'int-array', hint: 'up to 14 values' }],
  defaultInput: { arr: [6, 2, 9, 4, 1, 7] },
  presets: [
    { label: 'Shuffled', input: { arr: [6, 2, 9, 4, 1, 7] } },
    { label: 'Already sorted (best case)', input: { arr: [1, 3, 5, 7, 9] } },
    { label: 'Reversed (worst case)', input: { arr: [8, 6, 4, 2, 0] } },
  ],
  complexity: { time: 'O(n²), O(n) if sorted', space: 'O(1)' },

  run({ arr }, t) {
    const a = t.array('a', arr, { label: 'a' });
    const v = [...arr];
    const n = v.length;
    a.cell(0, 'visited');
    t.at('init')
      .vars({ n })
      .say('a[0] alone is a sorted prefix. Insert the rest one at a time.')
      .invariant('a[0..i−1] is sorted.')
      .step();

    for (let i = 1; i < n; i++) {
      const key = v[i]!;
      let j = i - 1;
      a.range(0, i - 1, 'visited', 'sorted').pointer('key', i, 'active');
      t.at('pick')
        .vars({ i, key, j })
        .say(`Take key = a[${i}] = ${key} and insert it into the sorted prefix a[0..${i - 1}].`)
        .invariant('a[0..i−1] is sorted.')
        .step();

      for (;;) {
        const shifts = j >= 0 && v[j]! > key;
        if (j >= 0) a.compare(j, j + 1);
        t.at('compare')
          .vars({ j })
          .say(
            j < 0
              ? 'j < 0: reached the front.'
              : `a[${j}] = ${v[j]} ${shifts ? '>' : '≤'} key ${key}.`,
          )
          .ask({
            kind: 'choice',
            prompt:
              j < 0
                ? 'j = −1. Shift again?'
                : `a[${j}] = ${v[j]}, key = ${key}. Shift a[${j}] right?`,
            options: ['Shift', 'Stop and place the key'],
            answer: shifts ? 'Shift' : 'Stop and place the key',
            explain: shifts
              ? `${v[j]} > ${key}, so it moves right to make room.`
              : 'Nothing larger remains to the left, so the key belongs here.',
          })
          .step();
        if (!shifts) break;
        [v[j], v[j + 1]] = [v[j + 1]!, v[j]!];
        a.swap(j, j + 1).pointer('key', j, 'active');
        t.at('shift')
          .say(`Shift ${v[j + 1]} right; the key slides to index ${j}.`)
          .step();
        j--;
      }
      a.pointer('key', j + 1, 'found');
      a.range(0, i, 'visited', 'sorted');
      t.at('place')
        .vars({ j })
        .say(`Place key ${key} at index ${j + 1}. a[0..${i}] is sorted.`)
        .step();
      a.unpointer('key');
    }
    a.unrange('sorted').cells(
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
