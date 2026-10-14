function linearSearch(a: number[], target: number): number {
  const n = a.length;                 // @init
  for (let i = 0; i < n; i++) {
    if (a[i] === target) {            // @compare
      return i;                       // @found
    }
  }
  return -1;                          // @notFound
}
