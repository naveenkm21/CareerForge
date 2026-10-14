function dfs(adj: Map<string, string[]>, u: string, seen: Set<string>, order: string[]): void {
  seen.add(u); order.push(u);                   // @visit
  for (const v of adj.get(u) ?? []) {
    if (!seen.has(v)) {                         // @check
      dfs(adj, v, seen, order);                 // @recurse
    }
  }
}                                               // @return

function traverse(adj: Map<string, string[]>, s: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  dfs(adj, s, seen, order);                     // @init
  return order;                                 // @done
}
