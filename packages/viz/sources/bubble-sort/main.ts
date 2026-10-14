function bubbleSort(a: number[]): void {
  const n = a.length;                               // @init
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) {                        // @compare
        [a[j], a[j + 1]] = [a[j + 1], a[j]];        // @swap
        swapped = true;
      }
    }
    if (!swapped) break;                            // @passDone
  }
}                                                   // @done
