static void inorder(Node node, List<Integer> out) { // @enter
    if (node.left != null) inorder(node.left, out);  // @left
    out.add(node.val);                               // @visit
    if (node.right != null) inorder(node.right, out); // @right
}                                                    // @return

static List<Integer> traverse(Node root) {
    List<Integer> out = new ArrayList<>();
    inorder(root, out);                              // @init
    return out;                                      // @done
}
