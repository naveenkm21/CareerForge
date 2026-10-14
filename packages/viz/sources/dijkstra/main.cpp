vector<int> dijkstra(const vector<vector<pair<int, int>>>& adj, int s) {
    vector<int> dist(adj.size(), INT_MAX);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    dist[s] = 0; pq.push({0, s});                     // @init
    while (!pq.empty()) {                             // @loop
        auto [d, u] = pq.top(); pq.pop();             // @pop
        if (d > dist[u]) continue;                    // @stale
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {              // @relaxCheck
                dist[v] = dist[u] + w;                // @relax
                pq.push({dist[v], v});                // @relax
            }
        }
    }
    return dist;                                      // @done
}
