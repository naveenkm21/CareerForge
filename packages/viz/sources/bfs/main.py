from collections import deque


def bfs(adj, s):
    seen = {s}
    q = deque([s])                  # @init
    order = []
    while q:                        # @loop
        u = q.popleft()             # @dequeue
        order.append(u)
        for v in adj[u]:
            if v not in seen:       # @check
                seen.add(v)         # @enqueue
                q.append(v)         # @enqueue
    return order                    # @done
