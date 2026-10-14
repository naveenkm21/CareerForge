vector<int> topoSort(const vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> indeg(n, 0);
    for (int u = 0; u < n; u++) for (int v : adj[u]) indeg[v]++;     // @count
    queue<int> q;
    for (int u = 0; u < n; u++) if (indeg[u] == 0) q.push(u);        // @seed
    vector<int> order;
    while (!q.empty()) {                                             // @loop
        int u = q.front(); q.pop();
        order.push_back(u);                                          // @take
        for (int v : adj[u]) {                                       // @edge
            if (--indeg[v] == 0) q.push(v);                          // @decrement
        }
    }
    if ((int)order.size() < n) return {};                            // @cycle
    return order;                                                    // @done
}
