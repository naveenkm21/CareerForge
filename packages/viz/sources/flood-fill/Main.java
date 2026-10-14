static void floodFill(int[][] g, int sr, int sc, int color) {
    int old = g[sr][sc], R = g.length, C = g[0].length;
    int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
    Deque<int[]> q = new ArrayDeque<>();
    g[sr][sc] = color; q.add(new int[]{sr, sc});          // @init
    while (!q.isEmpty()) {
        int[] cur = q.poll(); int r = cur[0], c = cur[1]; // @dequeue
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            if (g[nr][nc] == old) {                       // @check
                g[nr][nc] = color; q.add(new int[]{nr, nc});  // @fill
            }
        }
    }
}                                                         // @done
