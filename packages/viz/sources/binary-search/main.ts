function binarySearch(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;                // @init
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);          // @mid
    if (a[mid] === target) return mid;          // @found
    if (a[mid] < target) lo = mid + 1;          // @goRight
    else hi = mid - 1;                          // @goLeft
  }
  return -1;                                    // @notFound
}
