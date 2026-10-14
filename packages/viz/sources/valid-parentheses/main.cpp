bool isValid(const string& s) {
    unordered_map<char, char> match = {{')', '('}, {']', '['}, {'}', '{'}};
    stack<char> st;                                      // @init
    for (char c : s) {
        if (!match.count(c)) {
            st.push(c);                                  // @push
        } else {
            if (st.empty() || st.top() != match[c])      // @check
                return false;                            // @mismatch
            st.pop();                                    // @pop
        }
    }
    return st.empty();                                   // @done
}
