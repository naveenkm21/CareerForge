static boolean isValid(String s) {
    Map<Character, Character> match = Map.of(')', '(', ']', '[', '}', '{');
    Deque<Character> st = new ArrayDeque<>();            // @init
    for (char c : s.toCharArray()) {
        if (!match.containsKey(c)) {
            st.push(c);                                  // @push
        } else {
            if (st.isEmpty() || st.peek() != match.get(c)) // @check
                return false;                            // @mismatch
            st.pop();                                    // @pop
        }
    }
    return st.isEmpty();                                 // @done
}
