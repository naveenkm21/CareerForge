import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { intArray } from '../shared';

export default defineAlgorithm({
  id: 'heap-push',
  title: 'Min-Heap Push (Sift Up)',
  category: 'heaps',
  skillId: 'dsa.heaps',
  summary:
    'Append at the end, then swap upward while the parent is larger. The array and the tree are the same heap.',
  difficulty: 2,
  params: z.object({ values: intArray(1, 15) }),
  inputSpec: [
    { name: 'values', label: 'Push in order', kind: 'int-array', hint: 'up to 15 values' },
  ],
  defaultInput: { values: [9, 5, 7, 2, 8, 1, 6] },
  presets: [
    { label: 'Mixed', input: { values: [9, 5, 7, 2, 8, 1, 6] } },
    { label: 'Descending (max sifting)', input: { values: [10, 8, 6, 4, 2, 1] } },
    { label: 'Ascending (no sifting)', input: { values: [1, 2, 3, 4, 5, 6] } },
  ],
  complexity: { time: 'O(log n) per push', space: 'O(1)' },

  run({ values }, t) {
    const tree = t.tree('tree', { label: 'heap as a tree', ordered: false });
    const arr = t.array('heap', [], { label: 'heap as an array' });
    const h: number[] = [];
    const inv = 'Every parent ≤ its children (except along the path being repaired).';
    t.at('init')
      .say(
        'A min-heap is a complete binary tree stored level by level in an array: children of i are 2i+1 and 2i+2.',
      )
      .step();

    for (const v of values) {
      tree.clearMarks();
      arr.clearMarks();
      h.push(v);
      let i = h.length - 1;
      arr.push(v);
      const id = tree.add(v);
      if (i === 0) tree.setRoot(id);
      else if (i % 2 === 1) tree.setLeft(`n${(i - 1) >> 1}`, id);
      else tree.setRight(`n${(i - 1) >> 1}`, id);
      arr.cell(i, 'active');
      tree.cell(id, 'active');
      t.at('append')
        .vars({ v, i })
        .say(`Push ${v}: append it at index ${i}, the next free slot of the bottom level.`)
        .invariant(inv)
        .step();

      while (i > 0) {
        const p = (i - 1) >> 1;
        const swap = h[p]! > h[i]!;
        arr.compare(p, i);
        tree.cell(`n${p}`, 'candidate').edge(`n${p}`, `n${i}`, 'active');
        t.at('parent')
          .vars({ i, p })
          .say(`Parent of index ${i} is (${i} − 1) / 2 = ${p}, holding ${h[p]}.`)
          .ask({
            kind: 'choice',
            prompt: `Parent ${h[p]}, child ${h[i]}. Swap?`,
            options: ['Swap', 'Stop'],
            answer: swap ? 'Swap' : 'Stop',
            explain: swap
              ? `${h[p]} > ${h[i]} violates the min-heap property.`
              : `${h[p]} ≤ ${h[i]}: the heap property holds.`,
          })
          .step();
        if (!swap) {
          tree.unedge(`n${p}`, `n${i}`).cell(`n${p}`, 'visited').cell(`n${i}`, 'found');
          arr.cell(i, 'found');
          t.at('stop')
            .say(`${h[p]} ≤ ${h[i]} — ${v} has settled at index ${i}.`)
            .invariant(inv)
            .step();
          break;
        }
        [h[p], h[i]] = [h[i]!, h[p]!];
        arr.swap(p, i).uncell(i).cell(p, 'active');
        tree
          .setValue(`n${p}`, h[p]!)
          .setValue(`n${i}`, h[i]!)
          .unedge(`n${p}`, `n${i}`)
          .cell(`n${i}`, 'visited')
          .cell(`n${p}`, 'active');
        i = p;
        t.at('swap')
          .vars({ i })
          .say(i === 0 ? `Swap — ${v} reaches the root.` : `Swap ${v} up to index ${i}.`)
          .step();
      }
    }
    tree.clearMarks();
    arr.clearMarks().cell(0, 'found');
    tree.cell('n0', 'found');
    t.at('done')
      .vars({ v: undefined, i: undefined, p: undefined })
      .say(`Heap built. The minimum, ${h[0]}, is at the root.`)
      .emphasis('result')
      .step();
    return h;
  },
});
