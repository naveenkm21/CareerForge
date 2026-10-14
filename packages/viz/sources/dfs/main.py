def dfs(adj, u, seen, order):
    seen.add(u)                         # @visit
    order.append(u)                     # @visit
    for v in adj[u]:
        if v not in seen:               # @check
            dfs(adj, v, seen, order)    # @recurse
    return                              # @return


def traverse(adj, s):
    seen, order = set(), []
    dfs(adj, s, seen, order)            # @init
    return order                        # @done
