function inorder(node: Node, out: number[]): void { // @enter
  if (node.left) inorder(node.left, out);           // @left
  out.push(node.val);                               // @visit
  if (node.right) inorder(node.right, out);         // @right
}                                                   // @return

function traverse(root: Node): number[] {
  const out: number[] = [];
  inorder(root, out);                               // @init
  return out;                                       // @done
}
