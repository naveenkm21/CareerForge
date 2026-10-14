int rangeSum(const vector<int>& a, int l, int r) {
    int n = a.size();
    vector<int> p(n + 1, 0);                  // @init
    for (int i = 0; i < n; i++) {
        p[i + 1] = p[i] + a[i];               // @build
    }
    return p[r + 1] - p[l];                   // @query
}
