from collections import OrderedDict


def lru_faults(refs, capacity):
    order, faults = OrderedDict(), 0             # @init
    for p in refs:
        if p in order:                           # @access
            order.pop(p)                         # @hit
        else:
            faults += 1
            if len(order) == capacity:
                order.popitem(last=False)        # @evict
        order[p] = True                          # @load
    return faults                                # @done
