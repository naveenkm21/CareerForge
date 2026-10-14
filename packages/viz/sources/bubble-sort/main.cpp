void bubbleSort(vector<int>& a) {
    int n = a.size();                                 // @init
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {                    // @compare
                swap(a[j], a[j + 1]);                 // @swap
                swapped = true;
            }
        }
        if (!swapped) break;                          // @passDone
    }
}                                                     // @done
