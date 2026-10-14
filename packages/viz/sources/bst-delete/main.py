def delete_node(root, key):                             # @visit
    if root is None:
        return None                                     # @notFound
    if key < root.val:
        root.left = delete_node(root.left, key)         # @goLeft
    elif key > root.val:
        root.right = delete_node(root.right, key)       # @goRight
    else:                                               # @found
        if root.left is None:
            return root.right                           # @noLeft
        if root.right is None:
            return root.left                            # @noRight
        succ = root.right                               # @findSucc
        while succ.left:
            succ = succ.left                            # @findSucc
        root.val = succ.val                             # @copy
        root.right = delete_node(root.right, succ.val)  # @removeSucc
    return root                                         # @done
