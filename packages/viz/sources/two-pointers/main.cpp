pair<int, int> pairSum(const vector<int>& a, int target) {
    int l = 0, r = a.size() - 1;              // @init
    while (l < r) {
        int sum = a[l] + a[r];                // @sum
        if (sum == target) return {l, r};     // @found
        if (sum < target) l++;                // @moveLeft
        else r--;                             // @moveRight
    }
    return {-1, -1};                          // @notFound
}
