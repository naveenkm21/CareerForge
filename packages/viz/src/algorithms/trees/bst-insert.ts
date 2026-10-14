import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { intArray } from '../shared';

export default defineAlgorithm({
  id: 'bst-insert',
  title: 'BST Insertion',
  category: 'trees',
  skillId: 'dsa.trees.bst',
  summary:
    'Walk down from the root — left if smaller, right otherwise — and attach at the first empty slot.',
  difficulty: 2,
  params: z.object({ values: intArray(1, 15) }),
  inputSpec: [
    { name: 'values', label: 'Insert in order', kind: 'int-array', hint: 'up to 15 values' },
  ],
  defaultInput: { values: [50, 30, 70, 20, 40, 60, 80] },
  presets: [
    { label: 'Balanced', input: { values: [50, 30, 70, 20, 40, 60, 80] } },
    { label: 'Sorted input (degenerate)', input: { values: [10, 20, 30, 40, 50] } },
    { label: 'Random', input: { values: [41, 20, 65, 11, 29, 50, 91, 32, 72, 99] } },
  ],
  complexity: { time: 'O(h) per insert', space: 'O(1)' },

  run({ values }, t) {
    const seq = t.array('input', values, { label: 'insert order', placement: 'side' });
    const tree = t.tree('bst', { label: 'BST' });
    t.at('init')
      .say('Insert each value in turn. Smaller keys go left; equal or larger keys go right.')
      .invariant('For every node: left subtree < node ≤ right subtree.')
      .step();

    values.forEach((v, k) => {
      tree.clearMarks();
      seq.pointer('next', k, 'active');
      if (k > 0) seq.cell(k - 1, 'visited');
      t.at('create').vars({ v, cur: null }).say(`Insert ${v}.`).step();

      if (tree.root === null) {
        const id = tree.add(v);
        tree.setRoot(id).cell(id, 'found');
        t.at('asRoot').say(`The tree is empty, so ${v} becomes the root.`).step();
        return;
      }
      let cur = tree.root;
      for (;;) {
        const node = tree.node(cur);
        const cv = node.value as number;
        const left = v < cv;
        tree.cell(cur, 'active');
        t.at('compare')
          .vars({ cur: cv })
          .say(`${v} ${left ? '<' : '≥'} ${cv}.`)
          .invariant('For every node: left subtree < node ≤ right subtree.')
          .ask({
            kind: 'choice',
            prompt: `Inserting ${v} at node ${cv}. Which way?`,
            options: ['Go left', 'Go right'],
            answer: left ? 'Go left' : 'Go right',
            explain: left ? `${v} < ${cv}.` : `${v} ≥ ${cv}.`,
          })
          .step();
        const next = left ? node.left : node.right;
        if (next === null) {
          const id = tree.add(v);
          if (left) tree.setLeft(cur, id);
          else tree.setRight(cur, id);
          tree.cell(cur, 'visited').edge(cur, id, 'path').cell(id, 'found');
          t.at(left ? 'attachLeft' : 'attachRight')
            .say(`The ${left ? 'left' : 'right'} slot of ${cv} is empty — attach ${v} there.`)
            .step();
          return;
        }
        tree.cell(cur, 'visited').edge(cur, next, 'path');
        cur = next;
        t.at(left ? 'goLeft' : 'goRight')
          .say(`Move ${left ? 'left' : 'right'} to ${tree.node(cur).value}.`)
          .step();
      }
    });
    tree.clearMarks();
    seq.clearMarks().cells(
      values.map((_, i) => i),
      'visited',
    );
    t.at('done')
      .say(`Inserted ${values.length} value${values.length > 1 ? 's' : ''}.`)
      .emphasis('result')
      .step();
  },
});
