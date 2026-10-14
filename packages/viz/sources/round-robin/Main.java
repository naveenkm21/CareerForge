// Processes sorted by arrival. Fills finish time per process.
static void roundRobin(Proc[] ps, int quantum) {
    Deque<Integer> ready = new ArrayDeque<>(); int t = 0, next = 0, finished = 0, n = ps.length;  // @init
    while (finished < n) {
        while (next < n && ps[next].arrival <= t) ready.add(next++);        // @arrive
        if (ready.isEmpty()) { t = ps[next].arrival; continue; }
        int i = ready.poll();                                              // @dispatch
        int slice = Math.min(quantum, ps[i].remaining);
        t += slice; ps[i].remaining -= slice;                              // @run
        if (ps[i].remaining > 0) {
            while (next < n && ps[next].arrival <= t) ready.add(next++);
            ready.add(i);                                                  // @requeue
        } else {
            ps[i].finish = t; finished++;                                  // @finish
        }
    }
}                                                                          // @done
