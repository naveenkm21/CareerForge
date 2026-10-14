static Node insert(Node root, int v) {        // @init
    Node node = new Node(v);                  // @create
    if (root == null) return node;            // @asRoot
    Node cur = root;
    while (true) {
        if (v < cur.val) {                    // @compare
            if (cur.left == null) { cur.left = node; break; }    // @attachLeft
            cur = cur.left;                   // @goLeft
        } else {
            if (cur.right == null) { cur.right = node; break; }  // @attachRight
            cur = cur.right;                  // @goRight
        }
    }
    return root;                              // @done
}
