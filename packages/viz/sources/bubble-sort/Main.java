static void bubbleSort(int[] a) {
    int n = a.length;                                 // @init
    for (int i = 0; i < n - 1; i++) {
        boolean swapped = false;
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {                    // @compare
                int tmp = a[j]; a[j] = a[j + 1]; a[j + 1] = tmp;   // @swap
                swapped = true;
            }
        }
        if (!swapped) break;                          // @passDone
    }
}                                                     // @done
