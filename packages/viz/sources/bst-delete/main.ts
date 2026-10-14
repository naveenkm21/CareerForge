function deleteNode(root: Node | null, key: number): Node | null {  // @visit
  if (!root) return null;                                   // @notFound
  if (key < root.val) root.left = deleteNode(root.left, key);           // @goLeft
  else if (key > root.val) root.right = deleteNode(root.right, key);    // @goRight
  else {                                                    // @found
    if (!root.left) return root.right;                      // @noLeft
    if (!root.right) return root.left;                      // @noRight
    let succ = root.right;                                  // @findSucc
    while (succ.left) succ = succ.left;                     // @findSucc
    root.val = succ.val;                                    // @copy
    root.right = deleteNode(root.right, succ.val);          // @removeSucc
  }
  return root;                                              // @done
}
