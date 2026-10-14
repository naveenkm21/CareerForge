import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import type { ArrayHandle } from '../../recorder';
import { intArray, isSortedAsc, smallInt } from '../shared';

/** Pointers only render while in bounds; lo can pass the end and hi can reach -1. */
function placeBounds(a: ArrayHandle, lo: number, hi: number) {
  if (lo >= 0 && lo < a.length) a.pointer('lo', lo, 'candidate');
  else a.unpointer('lo');
  if (hi >= 0 && hi < a.length) a.pointer('hi', hi, 'candidate');
  else a.unpointer('hi');
}

export default defineAlgorithm({
  id: 'binary-search',
  title: 'Binary Search',
  category: 'searching',
  skillId: 'dsa.searching.binary-search',
  summary: 'Halve a sorted search space each step by comparing the middle element with the target.',
  difficulty: 2,
  params: z.object({
    arr: intArray(1, 64).refine(isSortedAsc, 'the array must be sorted ascending'),
    target: smallInt,
  }),
  inputSpec: [
    { name: 'arr', label: 'Sorted array', kind: 'int-array', hint: 'ascending, up to 64 values' },
    { name: 'target', label: 'Target', kind: 'int' },
  ],
  defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38], target: 23 },
  presets: [
    { label: 'Found on the right', input: { arr: [2, 5, 8, 12, 16, 23, 38], target: 23 } },
    { label: 'Found on the left', input: { arr: [1, 3, 4, 7, 9, 11, 15, 20, 22], target: 3 } },
    { label: 'Absent', input: { arr: [2, 5, 8, 12, 16, 23, 38], target: 13 } },
    {
      label: 'Larger array',
      input: { arr: [1, 4, 6, 9, 13, 17, 21, 26, 30, 34, 39, 45, 52, 58, 63, 71], target: 58 },
    },
  ],
  complexity: { time: 'O(log n)', space: 'O(1)' },

  run({ arr, target }, t) {
    const a = t.array('a', arr, { label: 'a (sorted)' });
    let lo = 0;
    let hi = arr.length - 1;
    const inv = 'If the target exists, it is inside [lo, hi].';

    a.range(lo, hi, 'candidate', 'window');
    placeBounds(a, lo, hi);
    t.at('init')
      .vars({ lo, hi, target })
      .say(`Search the whole array: lo = 0, hi = ${hi}.`)
      .invariant(inv)
      .step();

    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1);
      const v = arr[mid]!;
      a.pointer('mid', mid, 'active');
      const answer =
        v === target ? 'Found it' : v < target ? 'Search the right half' : 'Search the left half';
      t.at('mid')
        .vars({ lo, hi, mid })
        .say(`mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}, and a[mid] = ${v}.`)
        .invariant(inv)
        .ask({
          kind: 'choice',
          prompt: `a[mid] = ${v} and the target is ${target}. What happens next?`,
          options: ['Found it', 'Search the left half', 'Search the right half'],
          answer,
          explain:
            v === target
              ? 'a[mid] equals the target.'
              : v < target
                ? `${v} < ${target}; the array is sorted, so everything at or left of mid is too small.`
                : `${v} > ${target}; everything at or right of mid is too large.`,
        })
        .step();

      if (v === target) {
        a.unpointer('lo').unpointer('hi').unrange('window').cell(mid, 'found');
        t.at('found')
          .say(`a[${mid}] = ${target}. Found at index ${mid}.`)
          .emphasis('result')
          .step();
        return mid;
      }
      a.unpointer('mid');
      if (v < target) {
        lo = mid + 1;
        a.range(0, lo - 1, 'excluded', 'exL');
        a.range(lo, hi, 'candidate', 'window');
        placeBounds(a, lo, hi);
        t.at('goRight')
          .vars({ lo, mid: undefined })
          .say(`${v} < ${target}: discard the left half. lo = mid + 1 = ${lo}.`)
          .invariant(inv)
          .step();
      } else {
        hi = mid - 1;
        a.range(hi + 1, arr.length - 1, 'excluded', 'exR');
        a.range(lo, hi, 'candidate', 'window');
        placeBounds(a, lo, hi);
        t.at('goLeft')
          .vars({ hi, mid: undefined })
          .say(`${v} > ${target}: discard the right half. hi = mid − 1 = ${hi}.`)
          .invariant(inv)
          .step();
      }
    }
    t.at('notFound')
      .vars({ lo, hi })
      .say(`lo (${lo}) > hi (${hi}): the range is empty, so ${target} is absent.`)
      .emphasis('result')
      .step();
    return -1;
  },
});
