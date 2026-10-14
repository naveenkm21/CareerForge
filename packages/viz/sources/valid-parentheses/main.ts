function isValid(s: string): boolean {
  const match: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const st: string[] = [];                             // @init
  for (const c of s) {
    if (!(c in match)) {
      st.push(c);                                      // @push
    } else {
      if (!st.length || st[st.length - 1] !== match[c]) // @check
        return false;                                  // @mismatch
      st.pop();                                        // @pop
    }
  }
  return st.length === 0;                              // @done
}
