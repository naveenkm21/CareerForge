def bubble_sort(a):
    n = len(a)                                  # @init
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:                 # @compare
                a[j], a[j + 1] = a[j + 1], a[j] # @swap
                swapped = True
        if not swapped:                         # @passDone
            break
    return a                                    # @done
