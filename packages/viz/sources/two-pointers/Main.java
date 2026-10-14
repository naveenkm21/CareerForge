static int[] pairSum(int[] a, int target) {
    int l = 0, r = a.length - 1;                  // @init
    while (l < r) {
        int sum = a[l] + a[r];                    // @sum
        if (sum == target) return new int[]{l, r}; // @found
        if (sum < target) l++;                    // @moveLeft
        else r--;                                 // @moveRight
    }
    return new int[]{-1, -1};                     // @notFound
}
