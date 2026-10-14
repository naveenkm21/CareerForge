def pair_sum(a, target):
    l, r = 0, len(a) - 1            # @init
    while l < r:
        s = a[l] + a[r]             # @sum
        if s == target:
            return (l, r)           # @found
        if s < target:
            l += 1                  # @moveLeft
        else:
            r -= 1                  # @moveRight
    return (-1, -1)                 # @notFound
