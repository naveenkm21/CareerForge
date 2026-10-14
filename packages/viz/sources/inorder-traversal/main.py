def inorder(node, out):                 # @enter
    if node.left:
        inorder(node.left, out)         # @left
    out.append(node.val)                # @visit
    if node.right:
        inorder(node.right, out)        # @right
    return                              # @return


def traverse(root):
    out = []
    inorder(root, out)                  # @init
    return out                          # @done
