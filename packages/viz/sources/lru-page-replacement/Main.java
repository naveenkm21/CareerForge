static int lruFaults(int[] refs, int capacity) {
    LinkedHashSet<Integer> order = new LinkedHashSet<>(); int faults = 0;   // @init
    for (int p : refs) {
        if (order.contains(p)) {                         // @access
            order.remove(p);                             // @hit
        } else {
            faults++;
            if (order.size() == capacity) {
                order.remove(order.iterator().next());   // @evict
            }
        }
        order.add(p);                                    // @load
    }
    return faults;                                       // @done
}
