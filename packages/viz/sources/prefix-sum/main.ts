function rangeSum(a: number[], l: number, r: number): number {
  const n = a.length;
  const p = new Array<number>(n + 1).fill(0); // @init
  for (let i = 0; i < n; i++) {
    p[i + 1] = p[i] + a[i];                   // @build
  }
  return p[r + 1] - p[l];                     // @query
}
