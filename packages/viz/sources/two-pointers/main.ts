function pairSum(a: number[], target: number): [number, number] {
  let l = 0, r = a.length - 1;                // @init
  while (l < r) {
    const sum = a[l] + a[r];                  // @sum
    if (sum === target) return [l, r];        // @found
    if (sum < target) l++;                    // @moveLeft
    else r--;                                 // @moveRight
  }
  return [-1, -1];                            // @notFound
}
