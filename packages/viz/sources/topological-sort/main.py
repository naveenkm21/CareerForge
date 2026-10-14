from collections import deque


def topo_sort(adj):
    indeg = {u: 0 for u in adj}
    for u in adj:
        for v in adj[u]:
            indeg[v] += 1                       # @count
    q = deque(u for u in adj if indeg[u] == 0)  # @seed
    order = []
    while q:                                    # @loop
        u = q.popleft()
        order.append(u)                         # @take
        for v in adj[u]:                        # @edge
            indeg[v] -= 1                       # @decrement
            if indeg[v] == 0:
                q.append(v)                     # @decrement
    if len(order) < len(adj):
        return []                               # @cycle
    return order                                # @done
