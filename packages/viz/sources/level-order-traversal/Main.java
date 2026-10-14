static List<Integer> levelOrder(Node root) {
    List<Integer> out = new ArrayList<>();
    Deque<Node> q = new ArrayDeque<>();
    q.add(root);                                  // @init
    while (!q.isEmpty()) {                        // @loop
        Node node = q.poll();                     // @dequeue
        out.add(node.val);                        // @visit
        if (node.left != null) q.add(node.left);  // @enqueueLeft
        if (node.right != null) q.add(node.right); // @enqueueRight
    }
    return out;                                   // @done
}
