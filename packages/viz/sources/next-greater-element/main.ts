function nextGreater(a: number[]): number[] {
  const res = new Array<number>(a.length).fill(-1);
  const st: number[] = [];                          // @init
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[st[st.length - 1]] < a[i]) { // @compare
      res[st.pop()!] = a[i];                        // @resolve
    }
    st.push(i);                                     // @push
  }
  return res;                                       // @done
}
