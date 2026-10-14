import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { buildBst, intArray } from '../shared';

export default defineAlgorithm({
  id: 'level-order-traversal',
  title: 'Level-order Traversal (BFS)',
  category: 'trees',
  skillId: 'dsa.trees.traversal',
  summary: 'Visit the tree level by level using a FIFO queue.',
  difficulty: 2,
  params: z.object({ values: intArray(1, 15) }),
  inputSpec: [{ name: 'values', label: 'Build BST from', kind: 'int-array' }],
  defaultInput: { values: [50, 30, 70, 20, 40, 60, 80] },
  presets: [
    { label: 'Balanced', input: { values: [50, 30, 70, 20, 40, 60, 80] } },
    { label: 'Uneven', input: { values: [8, 3, 10, 1, 6, 14, 4, 7, 13] } },
  ],
  complexity: { time: 'O(n)', space: 'O(w), w = max width' },

  run({ values }, t) {
    const tree = t.tree('tree', { label: 'tree' });
    buildBst(tree, values);
    const q = t.queue('queue', { label: 'queue (front → back)', placement: 'side' });
    const out = t.array('out', [], { label: 'output', placement: 'side' });
    const order: number[] = [];
    const nodeOf = new Map<string, string>();

    const rootId = tree.root!;
    nodeOf.set(q.enqueue(tree.node(rootId).value), rootId);
    tree.cell(rootId, 'frontier');
    t.at('init')
      .say('Start with the root in the queue.')
      .invariant('The queue holds discovered nodes in the order they will be visited.')
      .step();

    while (!q.isEmpty) {
      const it = q.dequeue();
      const id = nodeOf.get(it.id)!;
      const node = tree.node(id);
      tree.cell(id, 'active');
      t.at('dequeue')
        .vars({ node: node.value })
        .say(`Dequeue ${node.value} from the front.`)
        .step();

      order.push(node.value as number);
      out.push(node.value);
      out.cell(order.length - 1, 'found');
      tree.cell(id, 'found');
      t.at('visit').say(`Output ${node.value}.`).step();

      for (const [side, child] of [
        ['left', node.left],
        ['right', node.right],
      ] as const) {
        if (!child) continue;
        nodeOf.set(q.enqueue(tree.node(child).value), child);
        tree.cell(child, 'frontier').edge(id, child, 'path');
        t.at(side === 'left' ? 'enqueueLeft' : 'enqueueRight')
          .say(`Enqueue the ${side} child ${tree.node(child).value} at the back.`)
          .step();
      }
      const front = q.front();
      if (front && q.size >= 2) {
        t.at('loop')
          .say('Back to the top of the loop.')
          .ask({
            kind: 'choice',
            prompt: 'Which node is visited next?',
            options: [...new Set(q.items().map((x) => String(x.value)))],
            answer: String(front.value),
            explain: 'A queue is FIFO: the node enqueued earliest is at the front.',
          })
          .step();
      }
    }
    t.at('done')
      .vars({ node: undefined })
      .say(`Level order: ${order.join(', ')}.`)
      .emphasis('result')
      .step();
    return order;
  },
});
