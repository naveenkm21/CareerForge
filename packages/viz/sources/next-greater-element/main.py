def next_greater(a):
    res = [-1] * len(a)
    st = []                                 # @init
    for i in range(len(a)):
        while st and a[st[-1]] < a[i]:      # @compare
            res[st.pop()] = a[i]            # @resolve
        st.append(i)                        # @push
    return res                              # @done
