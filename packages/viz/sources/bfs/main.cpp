vector<int> bfs(const vector<vector<int>>& adj, int s) {
    vector<bool> seen(adj.size(), false);
    queue<int> q;
    seen[s] = true; q.push(s);                    // @init
    vector<int> order;
    while (!q.empty()) {                          // @loop
        int u = q.front(); q.pop();               // @dequeue
        order.push_back(u);
        for (int v : adj[u]) {
            if (!seen[v]) {                       // @check
                seen[v] = true; q.push(v);        // @enqueue
            }
        }
    }
    return order;                                 // @done
}
