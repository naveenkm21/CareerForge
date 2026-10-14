// Processes sorted by arrival. Returns finish time per process.
void roundRobin(vector<Proc>& ps, int quantum) {
    queue<int> ready; int t = 0, next = 0, finished = 0, n = ps.size();   // @init
    while (finished < n) {
        while (next < n && ps[next].arrival <= t) ready.push(next++);       // @arrive
        if (ready.empty()) { t = ps[next].arrival; continue; }
        int i = ready.front(); ready.pop();                                // @dispatch
        int slice = min(quantum, ps[i].remaining);
        t += slice; ps[i].remaining -= slice;                              // @run
        if (ps[i].remaining > 0) {
            while (next < n && ps[next].arrival <= t) ready.push(next++);
            ready.push(i);                                                 // @requeue
        } else {
            ps[i].finish = t; finished++;                                  // @finish
        }
    }
}                                                                          // @done
