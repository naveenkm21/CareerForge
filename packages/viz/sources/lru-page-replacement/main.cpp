int lruFaults(const vector<int>& refs, int capacity) {
    list<int> order; unordered_map<int, list<int>::iterator> pos; int faults = 0;  // @init
    for (int p : refs) {
        if (pos.count(p)) {                              // @access
            order.erase(pos[p]);                         // @hit
        } else {
            faults++;
            if ((int)order.size() == capacity) {
                pos.erase(order.front()); order.pop_front();   // @evict
            }
        }
        order.push_back(p); pos[p] = prev(order.end());  // @load
    }
    return faults;                                       // @done
}
