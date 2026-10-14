static List<Integer> topoSort(List<List<Integer>> adj) {
    int n = adj.size();
    int[] indeg = new int[n];
    for (int u = 0; u < n; u++) for (int v : adj.get(u)) indeg[v]++;  // @count
    Deque<Integer> q = new ArrayDeque<>();
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.add(u);         // @seed
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {                                           // @loop
        int u = q.poll();
        order.add(u);                                                // @take
        for (int v : adj.get(u)) {                                   // @edge
            if (--indeg[v] == 0) q.add(v);                           // @decrement
        }
    }
    if (order.size() < n) return List.of();                          // @cycle
    return order;                                                    // @done
}
