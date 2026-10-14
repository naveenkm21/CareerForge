import { z } from 'zod';
import { defineAlgorithm } from '../../define';
import { buildBst, intArray, smallInt } from '../shared';

export default defineAlgorithm({
  id: 'bst-delete',
  title: 'BST Deletion',
  category: 'trees',
  skillId: 'dsa.trees.bst',
  summary:
    'Find the key, then handle three cases: no left child, no right child, or two children (use the in-order successor).',
  difficulty: 3,
  params: z.object({ values: intArray(1, 15), key: smallInt }),
  inputSpec: [
    { name: 'values', label: 'Build BST from', kind: 'int-array' },
    { name: 'key', label: 'Delete key', kind: 'int' },
  ],
  defaultInput: { values: [50, 30, 70, 20, 40, 60, 80, 65], key: 50 },
  presets: [
    {
      label: 'Two children (successor)',
      input: { values: [50, 30, 70, 20, 40, 60, 80, 65], key: 50 },
    },
    { label: 'Leaf', input: { values: [50, 30, 70, 20, 40, 60, 80], key: 20 } },
    { label: 'One child', input: { values: [50, 30, 70, 20, 60, 80, 65], key: 60 } },
    { label: 'Missing key', input: { values: [50, 30, 70], key: 45 } },
  ],
  complexity: { time: 'O(h)', space: 'O(h) recursion' },

  run({ values, key }, t) {
    const tree = t.tree('bst', { label: 'BST' });
    buildBst(tree, values);
    const inv = 'For every node: left subtree < node ≤ right subtree.';

    let parent: string | null = null;
    let side: 'left' | 'right' | null = null;
    let cur: string | null = tree.root;

    /** Replace the link parent→child (or the root) with `replacement`. */
    const relink = (p: string | null, s: 'left' | 'right' | null, replacement: string | null) => {
      if (p === null) tree.setRoot(replacement);
      else if (s === 'left') tree.setLeft(p, replacement);
      else tree.setRight(p, replacement);
    };

    for (;;) {
      if (cur === null) {
        t.at('notFound')
          .say(`Reached an empty subtree — ${key} is not in the tree.`)
          .emphasis('result')
          .step();
        return false;
      }
      const node = tree.node(cur);
      const v = node.value as number;
      const answer = key === v ? 'Found it' : key < v ? 'Go left' : 'Go right';
      tree.cell(cur, 'active');
      t.at('visit')
        .vars({ key, 'root.val': v })
        .say(`Visit ${v}.`)
        .invariant(inv)
        .ask({
          kind: 'choice',
          prompt: `Deleting ${key}; the current node is ${v}. What next?`,
          options: ['Go left', 'Go right', 'Found it'],
          answer,
          explain: key === v ? 'The keys match.' : `${key} ${key < v ? '<' : '>'} ${v}.`,
        })
        .step();
      if (key === v) break;
      const next: string | null = key < v ? node.left : node.right;
      tree.cell(cur, 'visited');
      if (next) tree.edge(cur, next, 'path');
      parent = cur;
      side = key < v ? 'left' : 'right';
      cur = next;
      t.at(key < v ? 'goLeft' : 'goRight')
        .say(`${key} ${key < v ? '<' : '>'} ${v}: recurse into the ${side} subtree.`)
        .step();
    }

    const target = tree.node(cur);
    const hasL = target.left !== null;
    const hasR = target.right !== null;
    const kind = !hasL ? 'No left child' : !hasR ? 'No right child' : 'Two children';
    tree.cell(cur, 'error');
    t.at('found')
      .say(
        `Found ${key}. It has ${hasL && hasR ? 'two children' : hasL || hasR ? 'one child' : 'no children'}.`,
      )
      .ask({
        kind: 'choice',
        prompt: 'Which deletion case applies?',
        options: ['No left child', 'No right child', 'Two children'],
        answer: kind,
        explain:
          hasL && hasR
            ? 'Both subtrees exist, so the in-order successor must take its place.'
            : 'At most one subtree exists; it can be spliced up directly.',
      })
      .step();

    if (!hasL || !hasR) {
      const child = hasL ? target.left : target.right;
      relink(parent, side, child);
      tree.remove(cur);
      if (child) tree.cell(child, 'found');
      t.at(!hasL ? 'noLeft' : 'noRight')
        .say(
          child
            ? `Splice the ${hasL ? 'left' : 'right'} child ${tree.node(child).value} into ${key}'s place.`
            : `${key} is a leaf — just remove it.`,
        )
        .invariant(inv)
        .step();
    } else {
      let sParent = cur;
      let succ = target.right!;
      tree.cell(succ, 'candidate');
      t.at('findSucc')
        .say(
          `The in-order successor is the smallest key in the right subtree. Start at ${tree.node(succ).value}.`,
        )
        .step();
      while (tree.node(succ).left !== null) {
        tree.cell(succ, 'visited');
        sParent = succ;
        succ = tree.node(succ).left!;
        tree.edge(sParent, succ, 'path').cell(succ, 'candidate');
        t.at('findSucc')
          .say(`Go left to ${tree.node(succ).value}.`)
          .step();
      }
      const sv = tree.node(succ).value;
      tree.setValue(cur, sv).cell(cur, 'found').cell(succ, 'error');
      t.at('copy')
        .vars({ succ: sv })
        .say(`Copy the successor ${sv} into the node being deleted.`)
        .step();
      relink(sParent, sParent === cur ? 'right' : 'left', tree.node(succ).right);
      tree.remove(succ);
      t.at('removeSucc')
        .say(`Delete the old ${sv}: it has no left child, so splice its right subtree up.`)
        .invariant(inv)
        .step();
    }
    tree.clearMarks();
    t.at('done').say(`${key} deleted. The BST ordering still holds.`).emphasis('result').step();
    return true;
  },
});
