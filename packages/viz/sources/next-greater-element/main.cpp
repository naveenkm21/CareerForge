vector<int> nextGreater(const vector<int>& a) {
    int n = a.size();
    vector<int> res(n, -1);
    stack<int> st;                                 // @init
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.top()] < a[i]) { // @compare
            res[st.top()] = a[i];                  // @resolve
            st.pop();                              // @resolve
        }
        st.push(i);                                // @push
    }
    return res;                                    // @done
}
