void inorder(Node* node, vector<int>& out) {      // @enter
    if (node->left) inorder(node->left, out);     // @left
    out.push_back(node->val);                     // @visit
    if (node->right) inorder(node->right, out);   // @right
}                                                 // @return

vector<int> traverse(Node* root) {
    vector<int> out;
    inorder(root, out);                           // @init
    return out;                                   // @done
}
