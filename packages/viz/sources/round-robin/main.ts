// Processes sorted by arrival. Fills finish time per process.
function roundRobin(ps: Proc[], quantum: number): void {
  const ready: number[] = []; let t = 0, next = 0, finished = 0; const n = ps.length; // @init
  while (finished < n) {
    while (next < n && ps[next].arrival <= t) ready.push(next++);       // @arrive
    if (ready.length === 0) { t = ps[next].arrival; continue; }
    const i = ready.shift()!;                                          // @dispatch
    const slice = Math.min(quantum, ps[i].remaining);
    t += slice; ps[i].remaining -= slice;                              // @run
    if (ps[i].remaining > 0) {
      while (next < n && ps[next].arrival <= t) ready.push(next++);
      ready.push(i);                                                   // @requeue
    } else {
      ps[i].finish = t; finished++;                                    // @finish
    }
  }
}                                                                      // @done
