import heapq


def dijkstra(adj, s):
    dist = {u: float("inf") for u in adj}
    dist[s] = 0
    pq = [(0, s)]                               # @init
    while pq:                                   # @loop
        d, u = heapq.heappop(pq)                # @pop
        if d > dist[u]:
            continue                            # @stale
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:           # @relaxCheck
                dist[v] = dist[u] + w           # @relax
                heapq.heappush(pq, (dist[v], v))  # @relax
    return dist                                 # @done
