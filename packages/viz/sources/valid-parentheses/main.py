def is_valid(s):
    match = {")": "(", "]": "[", "}": "{"}
    st = []                                     # @init
    for c in s:
        if c not in match:
            st.append(c)                        # @push
        else:
            if not st or st[-1] != match[c]:    # @check
                return False                    # @mismatch
            st.pop()                            # @pop
    return not st                               # @done
