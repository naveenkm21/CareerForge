static List<Integer> bfs(List<List<Integer>> adj, int s) {
    boolean[] seen = new boolean[adj.size()];
    Deque<Integer> q = new ArrayDeque<>();
    seen[s] = true; q.add(s);                     // @init
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {                        // @loop
        int u = q.poll();                         // @dequeue
        order.add(u);
        for (int v : adj.get(u)) {
            if (!seen[v]) {                       // @check
                seen[v] = true; q.add(v);         // @enqueue
            }
        }
    }
    return order;                                 // @done
}
