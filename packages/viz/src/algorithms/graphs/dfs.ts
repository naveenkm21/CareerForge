import { defineAlgorithm } from '../../define';
import { graphParams, layoutFor } from '../shared';
import { TRAVERSAL_GRAPH, TRAVERSAL_GRAPH_2, TRAVERSAL_LAYOUT } from './presets';

export default defineAlgorithm({
  id: 'dfs',
  title: 'Depth-First Search',
  category: 'graphs',
  skillId: 'dsa.graphs.traversal',
  summary:
    'Go as deep as possible along each branch before backtracking; the call stack is the path so far.',
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
  complexity: { time: 'O(V + E)', space: 'O(V) recursion' },

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
    const calls = t.stack('calls', { label: 'call stack', placement: 'side' });
    const order = t.array('order', [], { label: 'visit order', placement: 'side' });
    const seen = new Set<string>();
    const visited: string[] = [];
    const treeEdges = new Set<string>();
    const key = (a: string, b: string) => [a, b].sort().join('-');

    t.at('init')
      .vars({ source })
      .say(`Call dfs(${source}).`)
      .invariant('The call stack is exactly the path from the start to the current node.')
      .step();

    const dfs = (u: string) => {
      seen.add(u);
      visited.push(u);
      order.push(u);
      order.cell(visited.length - 1, 'found');
      const frame = calls.push(`dfs(${u})`);
      calls.cell(frame, 'active');
      g.cell(u, 'active');
      t.at('visit')
        .vars({ u })
        .say(`Enter dfs(${u}): mark it visited.`)
        .invariant('The call stack is exactly the path from the start to the current node.')
        .step();

      for (const { to: v } of g.neighbors(u)) {
        const isSeen = seen.has(v);
        g.edge(u, v, 'active');
        t.at('check')
          .vars({ u, v })
          .say(`Look at neighbour ${v}.`)
          .ask({
            kind: 'choice',
            prompt: `From ${u}, neighbour ${v}: recurse or skip?`,
            options: [`Recurse into ${v}`, `Skip ${v}`],
            answer: isSeen ? `Skip ${v}` : `Recurse into ${v}`,
            explain: isSeen ? `${v} is already visited.` : `${v} has not been visited yet.`,
          })
          .step();
        if (isSeen) {
          if (treeEdges.has(key(u, v))) g.edge(u, v, 'path');
          else g.unedge(u, v);
          continue;
        }
        treeEdges.add(key(u, v));
        g.edge(u, v, 'path').cell(u, 'frontier');
        calls.cell(frame, 'visited');
        t.at('recurse').say(`${v} is unvisited — go deeper.`).step();
        dfs(v);
        g.cell(u, 'active');
        calls.cell(frame, 'active');
      }
      calls.pop();
      g.cell(u, 'visited');
      t.at('return').vars({ u }).say(`Every neighbour of ${u} is done — backtrack.`).step();
    };

    dfs(source);
    const unreached = nodes.filter((n) => !seen.has(n));
    for (const n of unreached) g.cell(n, 'excluded');
    t.at('done')
      .vars({ u: undefined, v: undefined })
      .say(
        `DFS order: ${visited.join(' → ')}.${unreached.length ? ` Unreachable: ${unreached.join(', ')}.` : ''}`,
      )
      .emphasis('result')
      .step();
    return visited;
  },
});
