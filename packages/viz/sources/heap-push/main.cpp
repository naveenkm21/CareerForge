// Min-heap stored in a vector: children of i are 2i+1 and 2i+2.
void push(vector<int>& h, int v) {           // @init
    h.push_back(v);                           // @append
    int i = h.size() - 1;
    while (i > 0) {
        int p = (i - 1) / 2;                  // @parent
        if (h[p] <= h[i]) break;              // @stop
        swap(h[p], h[i]);                     // @swap
        i = p;
    }
}                                             // @done
