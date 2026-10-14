from collections import deque


def flood_fill(g, sr, sc, color):
    old, R, C = g[sr][sc], len(g), len(g[0])
    g[sr][sc] = color
    q = deque([(sr, sc)])                           # @init
    while q:
        r, c = q.popleft()                          # @dequeue
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if not (0 <= nr < R and 0 <= nc < C):
                continue
            if g[nr][nc] == old:                    # @check
                g[nr][nc] = color                   # @fill
                q.append((nr, nc))                  # @fill
    return g                                        # @done
