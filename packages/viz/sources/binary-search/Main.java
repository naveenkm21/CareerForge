static int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;              // @init
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;           // @mid
        if (a[mid] == target) return mid;       // @found
        if (a[mid] < target) lo = mid + 1;      // @goRight
        else hi = mid - 1;                      // @goLeft
    }
    return -1;                                  // @notFound
}
