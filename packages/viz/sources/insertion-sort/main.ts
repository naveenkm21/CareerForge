function insertionSort(a: number[]): void {
  const n = a.length;                       // @init
  for (let i = 1; i < n; i++) {
    const key = a[i];                       // @pick
    let j = i - 1;                          // @pick
    while (j >= 0 && a[j] > key) {          // @compare
      a[j + 1] = a[j];                      // @shift
      j--;
    }
    a[j + 1] = key;                         // @place
  }
}                                           // @done
