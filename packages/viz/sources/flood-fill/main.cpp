void floodFill(vector<vector<int>>& g, int sr, int sc, int color) {
    int old = g[sr][sc], R = g.size(), C = g[0].size();
    int dr[] = {-1, 1, 0, 0}, dc[] = {0, 0, -1, 1};
    queue<pair<int, int>> q;
    g[sr][sc] = color; q.push({sr, sc});                  // @init
    while (!q.empty()) {
        auto [r, c] = q.front(); q.pop();                 // @dequeue
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            if (g[nr][nc] == old) {                       // @check
                g[nr][nc] = color; q.push({nr, nc});      // @fill
            }
        }
    }
}                                                         // @done
