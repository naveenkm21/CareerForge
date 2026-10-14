// Min-heap stored in a list: children of i are 2i+1 and 2i+2.
static void push(List<Integer> h, int v) {    // @init
    h.add(v);                                 // @append
    int i = h.size() - 1;
    while (i > 0) {
        int p = (i - 1) / 2;                  // @parent
        if (h.get(p) <= h.get(i)) break;      // @stop
        Collections.swap(h, p, i);            // @swap
        i = p;
    }
}                                             // @done
