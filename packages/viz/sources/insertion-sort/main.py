def insertion_sort(a):
    n = len(a)                          # @init
    for i in range(1, n):
        key, j = a[i], i - 1            # @pick
        while j >= 0 and a[j] > key:    # @compare
            a[j + 1] = a[j]             # @shift
            j -= 1
        a[j + 1] = key                  # @place
    return a                            # @done
