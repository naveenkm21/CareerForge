function dijkstra(adj: Map<string, [string, number][]>, s: string): Map<string, number> {
  const dist = new Map([...adj.keys()].map((u) => [u, Infinity]));
  const pq = new MinHeap<[number, string]>((a, b) => a[0] - b[0]);
  dist.set(s, 0); pq.push([0, s]);                  // @init
  while (pq.size) {                                 // @loop
    const [d, u] = pq.pop()!;                       // @pop
    if (d > dist.get(u)!) continue;                 // @stale
    for (const [v, w] of adj.get(u) ?? []) {
      if (dist.get(u)! + w < dist.get(v)!) {        // @relaxCheck
        dist.set(v, dist.get(u)! + w);              // @relax
        pq.push([dist.get(v)!, v]);                 // @relax
      }
    }
  }
  return dist;                                      // @done
}
