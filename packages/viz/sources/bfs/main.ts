function bfs(adj: Map<string, string[]>, s: string): string[] {
  const seen = new Set([s]);
  const q = [s];                                // @init
  const order: string[] = [];
  while (q.length) {                            // @loop
    const u = q.shift()!;                       // @dequeue
    order.push(u);
    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v)) {                       // @check
        seen.add(v); q.push(v);                 // @enqueue
      }
    }
  }
  return order;                                 // @done
}
