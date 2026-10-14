def binary_search(a, target):
    lo, hi = 0, len(a) - 1              # @init
    while lo <= hi:
        mid = lo + (hi - lo) // 2       # @mid
        if a[mid] == target:
            return mid                  # @found
        if a[mid] < target:
            lo = mid + 1                # @goRight
        else:
            hi = mid - 1                # @goLeft
    return -1                           # @notFound
