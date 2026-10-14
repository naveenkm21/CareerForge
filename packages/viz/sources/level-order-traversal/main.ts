function levelOrder(root: Node): number[] {
  const out: number[] = [];
  const q: Node[] = [root];                     // @init
  while (q.length) {                            // @loop
    const node = q.shift()!;                    // @dequeue
    out.push(node.val);                         // @visit
    if (node.left) q.push(node.left);           // @enqueueLeft
    if (node.right) q.push(node.right);         // @enqueueRight
  }
  return out;                                   // @done
}
