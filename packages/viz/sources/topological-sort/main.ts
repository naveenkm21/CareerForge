function topoSort(adj: Map<string, string[]>): string[] {
  const indeg = new Map([...adj.keys()].map((u) => [u, 0]));
  for (const vs of adj.values()) for (const v of vs) indeg.set(v, indeg.get(v)! + 1); // @count
  const q = [...adj.keys()].filter((u) => indeg.get(u) === 0);       // @seed
  const order: string[] = [];
  while (q.length) {                                                 // @loop
    const u = q.shift()!;
    order.push(u);                                                   // @take
    for (const v of adj.get(u) ?? []) {                              // @edge
      indeg.set(v, indeg.get(v)! - 1);                               // @decrement
      if (indeg.get(v) === 0) q.push(v);                             // @decrement
    }
  }
  if (order.length < adj.size) return [];                            // @cycle
  return order;                                                      // @done
}
