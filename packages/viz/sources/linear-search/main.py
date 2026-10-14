def linear_search(a, target):
    n = len(a)                  # @init
    for i in range(n):
        if a[i] == target:      # @compare
            return i            # @found
    return -1                   # @notFound
