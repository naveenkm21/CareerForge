int minSubArrayLen(int s, const vector<int>& a) {
    int best = INT_MAX, sum = 0, l = 0;          // @init
    for (int r = 0; r < a.size(); r++) {
        sum += a[r];                             // @expand
        while (sum >= s) {
            best = min(best, r - l + 1);         // @record
            sum -= a[l++];                       // @shrink
        }
    }
    return best == INT_MAX ? 0 : best;           // @done
}
