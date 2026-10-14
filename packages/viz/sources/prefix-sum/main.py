def range_sum(a, l, r):
    n = len(a)
    p = [0] * (n + 1)               # @init
    for i in range(n):
        p[i + 1] = p[i] + a[i]      # @build
    return p[r + 1] - p[l]          # @query
