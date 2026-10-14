from collections import deque


def level_order(root):
    out = []
    q = deque([root])                   # @init
    while q:                            # @loop
        node = q.popleft()              # @dequeue
        out.append(node.val)            # @visit
        if node.left:
            q.append(node.left)         # @enqueueLeft
        if node.right:
            q.append(node.right)        # @enqueueRight
    return out                          # @done
