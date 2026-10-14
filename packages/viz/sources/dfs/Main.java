static void dfs(List<List<Integer>> adj, int u, boolean[] seen, List<Integer> order) {
    seen[u] = true; order.add(u);                 // @visit
    for (int v : adj.get(u)) {
        if (!seen[v]) {                           // @check
            dfs(adj, v, seen, order);             // @recurse
        }
    }
}                                                 // @return

static List<Integer> traverse(List<List<Integer>> adj, int s) {
    boolean[] seen = new boolean[adj.size()];
    List<Integer> order = new ArrayList<>();
    dfs(adj, s, seen, order);                     // @init
    return order;                                 // @done
}
