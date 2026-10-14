static int[] dijkstra(List<List<int[]>> adj, int s) {
    int[] dist = new int[adj.size()];
    Arrays.fill(dist, Integer.MAX_VALUE);
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    dist[s] = 0; pq.add(new int[]{0, s});             // @init
    while (!pq.isEmpty()) {                           // @loop
        int[] top = pq.poll(); int d = top[0], u = top[1];  // @pop
        if (d > dist[u]) continue;                    // @stale
        for (int[] e : adj.get(u)) {
            int v = e[0], w = e[1];
            if (dist[u] + w < dist[v]) {              // @relaxCheck
                dist[v] = dist[u] + w;                // @relax
                pq.add(new int[]{dist[v], v});        // @relax
            }
        }
    }
    return dist;                                      // @done
}
