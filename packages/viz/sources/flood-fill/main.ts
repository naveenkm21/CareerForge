function floodFill(g: number[][], sr: number, sc: number, color: number): void {
  const old = g[sr][sc], R = g.length, C = g[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  g[sr][sc] = color;
  const q: [number, number][] = [[sr, sc]];               // @init
  while (q.length) {
    const [r, c] = q.shift()!;                            // @dequeue
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
      if (g[nr][nc] === old) {                            // @check
        g[nr][nc] = color; q.push([nr, nc]);              // @fill
      }
    }
  }
}                                                         // @done
