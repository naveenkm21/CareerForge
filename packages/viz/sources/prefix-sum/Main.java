static int rangeSum(int[] a, int l, int r) {
    int n = a.length;
    int[] p = new int[n + 1];                 // @init
    for (int i = 0; i < n; i++) {
        p[i + 1] = p[i] + a[i];               // @build
    }
    return p[r + 1] - p[l];                   // @query
}
