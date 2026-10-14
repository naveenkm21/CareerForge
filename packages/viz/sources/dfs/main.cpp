void dfs(const vector<vector<int>>& adj, int u, vector<bool>& seen, vector<int>& order) {
    seen[u] = true; order.push_back(u);           // @visit
    for (int v : adj[u]) {
        if (!seen[v]) {                           // @check
            dfs(adj, v, seen, order);             // @recurse
        }
    }
}                                                 // @return

vector<int> traverse(const vector<vector<int>>& adj, int s) {
    vector<bool> seen(adj.size(), false);
    vector<int> order;
    dfs(adj, s, seen, order);                     // @init
    return order;                                 // @done
}
