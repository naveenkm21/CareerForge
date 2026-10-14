import { defineAlgorithm } from '../../define';
import { graphParams, layoutFor } from '../shared';
import { TRAVERSAL_GRAPH, TRAVERSAL_GRAPH_2, TRAVERSAL_LAYOUT } from './presets';

export default defineAlgorithm({
  id: 'bfs',
  title: 'Breadth-First Search',
  category: 'graphs',
  skillId: 'dsa.graphs.traversal',
  summary:
    'Explore outward in rings: every node at distance d is visited before any node at distance d + 1.',
  difficulty: 2,
  params: graphParams({ weighted: false }),
  inputSpec: [
    { name: 'nodes', label: 'Nodes', kind: 'string-list' },
    {
      name: 'edges',
      label: 'Edges (undirected)',
      kind: 'edge-list',
      weighted: false,
      hint: 'A-B, B-C, …',
    },
    { name: 'source', label: 'Start', kind: 'string' },
  ],
  defaultInput: TRAVERSAL_GRAPH,
  presets: [
    { label: 'Connected', input: TRAVERSAL_GRAPH },
    { label: 'Unreachable node', input: TRAVERSAL_GRAPH_2 },
  ],
  complexity: { time: 'O(V + E)', space: 'O(V)' },

  run({ nodes, edges, source }, t) {
    const g = t.graph(
      'g',
      {
        nodes: nodes.map((id) => ({ id })),
        edges,
        directed: false,
        weighted: false,
        layout: layoutFor(nodes, TRAVERSAL_LAYOUT),
      },
      { label: 'graph' },
    );
    const q = t.queue('queue', { label: 'queue (front → back)', placement: 'side' });
    const order = t.array('order', [], { label: 'visit order', placement: 'side' });
    const dist = new Map<string, number>([[source, 0]]);
    const visited: string[] = [];
    const treeEdges = new Set<string>();

    q.enqueue(source);
    g.cell(source, 'frontier').badge(source, 'd=0');
    t.at('init')
      .vars({ source })
      .say(`Mark ${source} seen and enqueue it.`)
      .invariant('Nodes leave the queue in non-decreasing distance from the start.')
      .step();

    while (!q.isEmpty) {
      const items = q.items();
      if (items.length >= 2) {
        t.at('loop')
          .say('Which node comes out next?')
          .ask({
            kind: 'choice',
            prompt: 'Which node is dequeued next?',
            options: items.map((x) => String(x.value)).sort(),
            answer: String(items[0]!.value),
            explain: 'BFS uses a FIFO queue: the earliest-discovered node is processed first.',
          })
          .step();
      }
      const u = String(q.dequeue().value);
      visited.push(u);
      order.push(u);
      order.cell(visited.length - 1, 'found');
      g.cell(u, 'active');
      t.at('dequeue')
        .vars({ u, 'dist[u]': dist.get(u)! })
        .say(`Dequeue ${u} (distance ${dist.get(u)}).`)
        .invariant('Nodes leave the queue in non-decreasing distance from the start.')
        .step();

      for (const { to: v } of g.neighbors(u)) {
        const seen = dist.has(v);
        g.edge(u, v, 'active');
        t.at('check')
          .vars({ v })
          .say(seen ? `${v} was already seen — skip.` : `${v} is new.`)
          .step();
        if (seen) {
          if (treeEdges.has([u, v].sort().join('-'))) g.edge(u, v, 'path');
          else g.unedge(u, v);
          continue;
        }
        treeEdges.add([u, v].sort().join('-'));
        dist.set(v, dist.get(u)! + 1);
        q.enqueue(v);
        g.edge(u, v, 'path')
          .cell(v, 'frontier')
          .badge(v, `d=${dist.get(v)}`);
        t.at('enqueue')
          .say(`Mark ${v} seen at distance ${dist.get(v)} and enqueue it.`)
          .step();
      }
      g.cell(u, 'visited');
    }
    const unreached = nodes.filter((n) => !dist.has(n));
    for (const n of unreached) g.cell(n, 'excluded');
    t.at('done')
      .vars({ u: undefined, v: undefined, 'dist[u]': undefined })
      .say(
        `BFS order: ${visited.join(' → ')}.${unreached.length ? ` Unreachable: ${unreached.join(', ')}.` : ''} Highlighted edges form the BFS tree of shortest paths.`,
      )
      .emphasis('result')
      .step();
    return visited;
  },
});
