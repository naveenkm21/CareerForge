function minSubArrayLen(s: number, a: number[]): number {
  let best = Infinity, sum = 0, l = 0;         // @init
  for (let r = 0; r < a.length; r++) {
    sum += a[r];                               // @expand
    while (sum >= s) {
      best = Math.min(best, r - l + 1);        // @record
      sum -= a[l++];                           // @shrink
    }
  }
  return best === Infinity ? 0 : best;         // @done
}
