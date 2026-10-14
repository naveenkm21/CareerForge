static int[] nextGreater(int[] a) {
    int n = a.length;
    int[] res = new int[n];
    Arrays.fill(res, -1);
    Deque<Integer> st = new ArrayDeque<>();        // @init
    for (int i = 0; i < n; i++) {
        while (!st.isEmpty() && a[st.peek()] < a[i]) { // @compare
            res[st.pop()] = a[i];                  // @resolve
        }
        st.push(i);                                // @push
    }
    return res;                                    // @done
}
