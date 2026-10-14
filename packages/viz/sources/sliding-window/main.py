def min_subarray_len(s, a):
    best, total, l = float("inf"), 0, 0      # @init
    for r in range(len(a)):
        total += a[r]                        # @expand
        while total >= s:
            best = min(best, r - l + 1)      # @record
            total -= a[l]                    # @shrink
            l += 1                           # @shrink
    return 0 if best == float("inf") else best   # @done
