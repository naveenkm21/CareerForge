# Min-heap stored in a list: children of i are 2i+1 and 2i+2.
def push(h, v):                         # @init
    h.append(v)                         # @append
    i = len(h) - 1
    while i > 0:
        p = (i - 1) // 2                # @parent
        if h[p] <= h[i]:
            break                       # @stop
        h[p], h[i] = h[i], h[p]         # @swap
        i = p
    return h                            # @done
