import { defineAlgorithm } from '../../define';
import { dagParams, layoutFor } from '../shared';
import { DAG, DAG_LAYOUT } from './presets';

export default defineAlgorithm({
  id: 'topological-sort',
  title: "Topological Sort (Kahn's)",
  category: 'graphs',
  skillId: 'dsa.graphs.topological-sort',
  summary:
    'Repeatedly take a node with no remaining incoming edges; if none exists before all are taken, there is a cycle.',
  difficulty: 3,
  params: dagParams(),
  inputSpec: [
    { name: 'nodes', label: 'Nodes', kind: 'string-list' },
    {
      name: 'edges',
      label: 'Directed edges',
      kind: 'edge-list',
      weighted: false,
      hint: 'A-C means A → C',
    },
  ],
  defaultInput: { nodes: DAG.nodes, edges: DAG.edges },
  presets: [
    { label: 'DAG', input: { nodes: DAG.nodes, edges: DAG.edges } },
    {
      label: 'Has a cycle',
      input: {
        nodes: ['A', 'B', 'C', 'D'],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
          { from: 'C', to: 'D' },
          { from: 'D', to: 'B' },
        ],
      },
    },
  ],
  complexity: { time: 'O(V + E)', space: 'O(V)' },

  run({ nodes, edges }, t) {
    const g = t.graph(
      'g',
      {
        nodes: nodes.map((id) => ({ id })),
        edges,
        directed: true,
        weighted: false,
        layout: layoutFor(nodes, DAG_LAYOUT),
      },
      { label: 'graph' },
    );
    const col = new Map(nodes.map((n, i) => [n, i]));
    const indeg = new Map(nodes.map((n) => [n, 0]));
    for (const e of edges) indeg.set(e.to, indeg.get(e.to)! + 1);
    const table = t.table(
      'indeg',
      nodes,
      [{ id: 'indeg', label: 'in-degree', cells: nodes.map(() => null) }],
      { label: 'in-degree' },
    );
    const q = t.queue('queue', { label: 'ready queue', placement: 'side' });
    const order = t.array('order', [], { label: 'topological order', placement: 'side' });
    const taken: string[] = [];
    const inv = 'A node is ready exactly when every edge into it has been removed.';

    for (const n of nodes) table.set('indeg', col.get(n)!, indeg.get(n)!);
    t.at('count').say('Count incoming edges for every node.').invariant(inv).step();

    for (const n of nodes) {
      if (indeg.get(n) === 0) {
        q.enqueue(n);
        g.cell(n, 'frontier');
        table.cell('indeg', col.get(n)!, 'found');
      }
    }
    t.at('seed')
      .say(
        `Nodes with in-degree 0 have no prerequisites: ${
          q
            .items()
            .map((x) => x.value)
            .join(', ') || 'none'
        }.`,
      )
      .invariant(inv)
      .step();

    while (!q.isEmpty) {
      const items = q.items();
      if (items.length >= 2) {
        t.at('loop')
          .say('Several nodes are ready.')
          .ask({
            kind: 'choice',
            prompt: 'Which ready node does Kahn’s algorithm (with a FIFO queue) take next?',
            options: items.map((x) => String(x.value)).sort(),
            answer: String(items[0]!.value),
            explain:
              'Any ready node gives a valid order; with a FIFO queue it is the earliest to become ready.',
          })
          .step();
      }
      const u = String(q.dequeue().value);
      taken.push(u);
      order.push(u);
      order.cell(taken.length - 1, 'found');
      g.cell(u, 'active');
      table.clearMarks().cell('indeg', col.get(u)!, 'visited');
      t.at('take').vars({ u }).say(`Take ${u} and append it to the order.`).step();

      for (const { to: v } of g.neighbors(u)) {
        const next = indeg.get(v)! - 1;
        g.edge(u, v, 'active');
        table.cell('indeg', col.get(v)!, 'candidate');
        t.at('edge')
          .vars({ v })
          .say(`Remove edge ${u} → ${v}.`)
          .ask({
            kind: 'value',
            prompt: `in-degree[${v}] is ${indeg.get(v)}. What is it after removing ${u} → ${v}?`,
            answer: String(next),
            explain: `One fewer incoming edge: ${indeg.get(v)} − 1 = ${next}.`,
          })
          .step();
        indeg.set(v, next);
        table.set('indeg', col.get(v)!, next);
        g.edge(u, v, 'excluded');
        if (next === 0) {
          q.enqueue(v);
          g.cell(v, 'frontier');
          table.cell('indeg', col.get(v)!, 'found');
        } else {
          table.uncell('indeg', col.get(v)!);
        }
        t.at('decrement')
          .say(
            next === 0
              ? `in-degree[${v}] = 0 — ${v} is ready. Enqueue it.`
              : `in-degree[${v}] = ${next}; still waiting.`,
          )
          .step();
      }
      g.cell(u, 'visited');
    }

    const cyclic = taken.length < nodes.length;
    if (cyclic) {
      for (const n of nodes) if (!taken.includes(n)) g.cell(n, 'error');
      t.at('cycle')
        .vars({ u: undefined, v: undefined })
        .say(
          `Only ${taken.length} of ${nodes.length} nodes were taken: the rest (${nodes.filter((n) => !taken.includes(n)).join(', ')}) sit on a cycle. No topological order exists.`,
        )
        .emphasis('result')
        .step();
      return [];
    }
    t.at('done')
      .vars({ u: undefined, v: undefined })
      .say(`Topological order: ${taken.join(' → ')}. Every edge points forward.`)
      .emphasis('result')
      .step();
    return taken;
  },
});
