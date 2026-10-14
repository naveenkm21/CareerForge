static int minSubArrayLen(int s, int[] a) {
    int best = Integer.MAX_VALUE, sum = 0, l = 0;    // @init
    for (int r = 0; r < a.length; r++) {
        sum += a[r];                                 // @expand
        while (sum >= s) {
            best = Math.min(best, r - l + 1);        // @record
            sum -= a[l++];                           // @shrink
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;     // @done
}
