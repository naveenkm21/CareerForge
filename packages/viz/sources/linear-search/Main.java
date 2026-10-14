static int linearSearch(int[] a, int target) {
    int n = a.length;                 // @init
    for (int i = 0; i < n; i++) {
        if (a[i] == target) {         // @compare
            return i;                 // @found
        }
    }
    return -1;                        // @notFound
}
