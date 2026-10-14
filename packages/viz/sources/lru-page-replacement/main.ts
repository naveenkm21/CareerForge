function lruFaults(refs: number[], capacity: number): number {
  const order = new Set<number>(); let faults = 0;   // @init
  for (const p of refs) {
    if (order.has(p)) {                              // @access
      order.delete(p);                               // @hit
    } else {
      faults++;
      if (order.size === capacity) {
        order.delete(order.values().next().value!);  // @evict
      }
    }
    order.add(p);                                    // @load
  }
  return faults;                                     // @done
}
