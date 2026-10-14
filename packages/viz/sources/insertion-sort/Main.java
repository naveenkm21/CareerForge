static void insertionSort(int[] a) {
    int n = a.length;                         // @init
    for (int i = 1; i < n; i++) {
        int key = a[i], j = i - 1;            // @pick
        while (j >= 0 && a[j] > key) {        // @compare
            a[j + 1] = a[j];                  // @shift
            j--;
        }
        a[j + 1] = key;                       // @place
    }
}                                             // @done
