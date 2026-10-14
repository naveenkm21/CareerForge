Node* insert(Node* root, int v) {             // @init
    Node* node = new Node(v);                 // @create
    if (!root) return node;                   // @asRoot
    Node* cur = root;
    while (true) {
        if (v < cur->val) {                   // @compare
            if (!cur->left) { cur->left = node; break; }    // @attachLeft
            cur = cur->left;                  // @goLeft
        } else {
            if (!cur->right) { cur->right = node; break; }  // @attachRight
            cur = cur->right;                 // @goRight
        }
    }
    return root;                              // @done
}
