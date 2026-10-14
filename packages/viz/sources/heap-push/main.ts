// Min-heap stored in an array: children of i are 2i+1 and 2i+2.
function push(h: number[], v: number): void { // @init
  h.push(v);                                  // @append
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;                   // @parent
    if (h[p] <= h[i]) break;                  // @stop
    [h[p], h[i]] = [h[i], h[p]];              // @swap
    i = p;
  }
}                                             // @done
