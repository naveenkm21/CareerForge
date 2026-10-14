int linearSearch(const vector<int>& a, int target) {
    int n = a.size();                 // @init
    for (int i = 0; i < n; i++) {
        if (a[i] == target) {         // @compare
            return i;                 // @found
        }
    }
    return -1;                        // @notFound
}
