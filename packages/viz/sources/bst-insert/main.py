def insert(root, v):                    # @init
    node = Node(v)                      # @create
    if root is None:
        return node                     # @asRoot
    cur = root
    while True:
        if v < cur.val:                 # @compare
            if cur.left is None:
                cur.left = node         # @attachLeft
                break
            cur = cur.left              # @goLeft
        else:
            if cur.right is None:
                cur.right = node        # @attachRight
                break
            cur = cur.right             # @goRight
    return root                         # @done
