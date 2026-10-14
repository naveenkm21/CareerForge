import { defineAlgorithm } from '../../define';
import { graphParams, layoutFor } from '../shared';
import { WEIGHTED_GRAPH, WEIGHTED_LAYOUT } from './presets';

const fmt = (d: number) => (d === Infinity ? '∞' : String(d));

export default defineAlgorithm({
  id: 'dijkstra',
  title: "Dijkstra's Shortest Paths",
  category: 'graphs',
  skillId: 'dsa.graphs.shortest-path',
  summary:
    'Repeatedly settle the unvisited node with the smallest tentative distance, relaxing its edges.',
  difficulty: 4,
  params: graphParams({ weighted: true, maxNodes: 10, maxEdges: 24 }),
  inputSpec: [
    { name: 'nodes', label: 'Nodes', kind: 'string-list' },
    {
      name: 'edges',
      label: 'Weighted edges (undirected)',
      kind: 'edge-list',
      weighted: true,
      hint: 'A-B:4, B-C:1, … (weights ≥ 0)',
    },
    { name: 'source', label: 'Source', kind: 'string' },
  ],
  defaultInput: WEIGHTED_GRAPH,
  presets: [
    { label: 'Classic', input: WEIGHTED_GRAPH },
    {
      label: 'Greedy trap',
      input: {
        nodes: ['A', 'B', 'C', 'D'],
        edges: [
          { from: 'A', to: 'B', weight: 1 },
          { from: 'B', to: 'D', weight: 10 },
          { from: 'A', to: 'C', weight: 4 },
          { from: 'C', to: 'D', weight: 2 },
        ],
        source: 'A',
      },
    },
  ],
  complexity: { time: 'O((V + E) log V)', space: 'O(V + E)' },

  run({ nodes, edges, source }, t) {
    const g = t.graph(
      'g',
      {
        nodes: nodes.map((id) => ({ id })),
        edges,
        directed: false,
        weighted: true,
        layout: layoutFor(nodes, WEIGHTED_LAYOUT),
      },
      { label: 'graph' },
    );
    const table = t.table(
      'dist',
      nodes,
      [
        { id: 'dist', label: 'dist', cells: nodes.map((n) => (n === source ? 0 : '∞')) },
        { id: 'prev', label: 'prev', cells: nodes.map(() => '—') },
      ],
      { label: 'distance table' },
    );
    const pq = t.queue('pq', {
      label: 'priority queue (min first)',
      priority: true,
      placement: 'side',
    });

    const col = new Map(nodes.map((n, i) => [n, i]));
    const dist = new Map(nodes.map((n) => [n, n === source ? 0 : Infinity]));
    const prev = new Map<string, string>();
    const settled = new Set<string>();
    const inv = 'Every settled node already has its final shortest distance.';

    for (const n of nodes) g.badge(n, n === source ? '0' : '∞');
    pq.push(source, 0, `d=0`);
    g.cell(source, 'frontier');
    table.cell('dist', col.get(source)!, 'found');
    t.at('init')
      .vars({ source })
      .say(`dist[${source}] = 0, every other node ∞. Push (0, ${source}).`)
      .invariant(inv)
      .step();

    while (!pq.isEmpty) {
      const front = pq.front()!;
      const frontNode = String(front.value);
      const candidates = [...new Set(pq.items().map((x) => String(x.value)))].filter(
        (n) => !settled.has(n),
      );
      // Ask only when the answer is unambiguous (no tie for the minimum distance).
      const tied = candidates.filter((n) => dist.get(n) === dist.get(frontNode)).length > 1;
      if (!settled.has(frontNode) && candidates.length >= 2 && !tied) {
        table.clearMarks();
        t.at('loop')
          .say('Which node does Dijkstra settle next?')
          .invariant(inv)
          .ask({
            kind: 'choice',
            prompt: 'Which node should be processed next?',
            options: candidates.sort(),
            answer: frontNode,
            explain: `${frontNode} has the smallest tentative distance (${fmt(dist.get(frontNode)!)}) among unvisited nodes. Any other route to it would have to pass through a node that is already at least that far.`,
          })
          .step();
      }

      const top = pq.dequeue();
      const u = String(top.value);
      const d = top.priority!;
      table.clearMarks();
      for (const s of settled) table.cell('dist', col.get(s)!, 'visited');
      if (d > dist.get(u)!) {
        t.at('stale')
          .vars({ u, d })
          .say(
            `Popped (${d}, ${u}), but dist[${u}] is already ${dist.get(u)} — a stale entry. Skip it.`,
          )
          .step();
        continue;
      }
      settled.add(u);
      g.cell(u, 'active');
      table.cell('dist', col.get(u)!, 'active');
      t.at('pop')
        .vars({ u, d })
        .say(`Pop (${d}, ${u}). ${u} is settled with distance ${d}.`)
        .invariant(inv)
        .step();

      for (const { to: v, weight: w } of g.neighbors(u)) {
        const cand = d + w;
        const improves = cand < dist.get(v)!;
        g.edge(u, v, 'active');
        table.cell('dist', col.get(v)!, 'candidate');
        t.at('relaxCheck')
          .vars({ v, w, 'dist[u] + w': cand, 'dist[v]': fmt(dist.get(v)!) })
          .say(
            `Edge ${u}–${v} (w = ${w}): ${d} + ${w} = ${cand} vs dist[${v}] = ${fmt(dist.get(v)!)}.`,
          )
          .ask({
            kind: 'choice',
            prompt: `${d} + ${w} = ${cand}; dist[${v}] = ${fmt(dist.get(v)!)}. Relax the edge?`,
            options: ['Yes — shorter path found', 'No — keep the current distance'],
            answer: improves ? 'Yes — shorter path found' : 'No — keep the current distance',
            explain: improves
              ? `${cand} < ${fmt(dist.get(v)!)}.`
              : `${cand} ≥ ${fmt(dist.get(v)!)}.`,
          })
          .step();
        if (!improves) {
          if (prev.get(v) === u || prev.get(u) === v) g.edge(u, v, 'path');
          else g.unedge(u, v);
          table.uncell('dist', col.get(v)!);
          if (settled.has(v)) table.cell('dist', col.get(v)!, 'visited');
          continue;
        }
        const old = prev.get(v);
        if (old) g.unedge(old, v);
        dist.set(v, cand);
        prev.set(v, u);
        g.edge(u, v, 'path').badge(v, String(cand)).cell(v, 'frontier');
        table
          .set('dist', col.get(v)!, cand)
          .set('prev', col.get(v)!, u)
          .cell('dist', col.get(v)!, 'found')
          .cell('prev', col.get(v)!, 'found');
        pq.push(v, cand, `d=${cand}`);
        t.at('relax')
          .vars({ 'dist[v]': cand })
          .say(
            `dist[${v}] = ${cand} via ${u}${old ? ` (was via ${old})` : ''}. Push (${cand}, ${v}).`,
          )
          .step();
      }
      g.cell(u, 'visited');
    }

    table.clearMarks();
    for (const n of nodes) {
      if (!settled.has(n)) g.cell(n, 'excluded');
      else table.cell('dist', col.get(n)!, 'visited');
    }
    const result = nodes.map((n) => fmt(dist.get(n)!));
    t.at('done')
      .vars({
        u: undefined,
        d: undefined,
        v: undefined,
        w: undefined,
        'dist[u] + w': undefined,
        'dist[v]': undefined,
      })
      .say(
        `Final distances from ${source}: ${nodes.map((n) => `${n}=${fmt(dist.get(n)!)}`).join(', ')}. Highlighted edges form the shortest-path tree.`,
      )
      .emphasis('result')
      .step();
    return result;
  },
});
