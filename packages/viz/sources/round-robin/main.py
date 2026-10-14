from collections import deque


def round_robin(ps, quantum):  # ps sorted by arrival
    ready, t, nxt, finished, n = deque(), 0, 0, 0, len(ps)   # @init
    while finished < n:
        while nxt < n and ps[nxt].arrival <= t:
            ready.append(nxt)                                 # @arrive
            nxt += 1
        if not ready:
            t = ps[nxt].arrival
            continue
        i = ready.popleft()                                   # @dispatch
        run = min(quantum, ps[i].remaining)
        t += run                                              # @run
        ps[i].remaining -= run
        if ps[i].remaining > 0:
            while nxt < n and ps[nxt].arrival <= t:
                ready.append(nxt)
                nxt += 1
            ready.append(i)                                   # @requeue
        else:
            ps[i].finish = t                                  # @finish
            finished += 1
    return ps                                                 # @done
