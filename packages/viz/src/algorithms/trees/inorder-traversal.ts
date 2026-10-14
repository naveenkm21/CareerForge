import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { buildBst, intArray } from '../shared';

export default defineAlgorithm({
  id: 'inorder-traversal',
  title: 'In-order Traversal (DFS)',
  category: 'trees',
  skillId: 'dsa.trees.traversal',
  summary:
    'Left subtree, node, right subtree — watch the call stack grow and unwind. On a BST it yields sorted order.',
  difficulty: 2,
  params: z.object({ values: intArray(1, 12) }),
  inputSpec: [
    { name: 'values', label: 'Build BST from', kind: 'int-array', hint: 'up to 12 values' },
  ],
  defaultInput: { values: [50, 30, 70, 20, 40, 60, 80] },
  presets: [
    { label: 'Balanced', input: { values: [50, 30, 70, 20, 40, 60, 80] } },
    { label: 'Lopsided', input: { values: [8, 3, 10, 1, 6, 4, 7, 14, 13] } },
  ],
  complexity: { time: 'O(n)', space: 'O(h) call stack' },

  run({ values }, t) {
    const tree = t.tree('tree', { label: 'tree' });
    buildBst(tree, values);
    const calls = t.stack('calls', { label: 'call stack', placement: 'side' });
    const out = t.array('out', [], { label: 'output', placement: 'side' });
    const visited: number[] = [];

    const leftmost = (id: string): number => {
      let cur = id;
      while (tree.node(cur).left) cur = tree.node(cur).left!;
      return tree.node(cur).value as number;
    };

    t.at('init')
      .say(
        'Call inorder(root). Each call handles its left subtree, then itself, then its right subtree.',
      )
      .step();

    const visit = (id: string) => {
      const node = tree.node(id);
      const frame = calls.push(`inorder(${node.value})`);
      calls.cell(frame, 'active');
      tree.cell(id, 'frontier');
      t.at('enter')
        .vars({ node: node.value })
        .say(`Enter inorder(${node.value}).`)
        .invariant('Every node is output after its entire left subtree.')
        .step();

      if (node.left) {
        tree.edge(id, node.left, 'path');
        calls.cell(frame, 'visited');
        t.at('left')
          .say(`${node.value} has a left child — recurse into ${tree.node(node.left).value} first.`)
          .step();
        visit(node.left);
        calls.cell(frame, 'active');
      }

      visited.push(node.value as number);
      out.push(node.value);
      out.cell(visited.length - 1, 'found');
      tree.cell(id, 'found');
      t.at('visit')
        .vars({ node: node.value })
        .say(`Left subtree of ${node.value} is done — output ${node.value}.`)
        .step();

      if (node.right) {
        tree.edge(id, node.right, 'path');
        const rightChild = tree.node(node.right);
        calls.cell(frame, 'visited');
        t.at('right')
          .say(`Now the right subtree of ${node.value}.`)
          .ask({
            kind: 'value',
            prompt: `Which value will be output next?`,
            answer: String(leftmost(node.right)),
            explain: `The next output is the leftmost node of ${rightChild.value}'s subtree.`,
          })
          .step();
        visit(node.right);
        calls.cell(frame, 'active');
      }
      calls.pop();
      t.at('return').vars({ node: node.value }).say(`inorder(${node.value}) returns.`).step();
    };

    visit(tree.root!);
    t.at('done')
      .vars({ node: undefined })
      .say(`Output: ${visited.join(', ')} — sorted, because the tree is a BST.`)
      .emphasis('result')
      .step();
    return visited;
  },
});
