vector<int> levelOrder(Node* root) {
    vector<int> out;
    queue<Node*> q;
    q.push(root);                                 // @init
    while (!q.empty()) {                          // @loop
        Node* node = q.front(); q.pop();          // @dequeue
        out.push_back(node->val);                 // @visit
        if (node->left) q.push(node->left);       // @enqueueLeft
        if (node->right) q.push(node->right);     // @enqueueRight
    }
    return out;                                   // @done
}
