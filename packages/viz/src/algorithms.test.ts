import { describe, expect, it } from 'vitest';
import { runAlgorithm } from './define';
import { getAlgorithm } from './registry';
import { checkTrace } from './invariants';
import type { Trace } from './types';

/** Seeded LCG so the "random" cases are reproducible. */
function rng(seed: number) {
  let s = seed;
  return (lo: number, hi: number) => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return lo + (s % (hi - lo + 1));
  };
}

function run(id: string, input: unknown): Trace {
  const r = runAlgorithm(getAlgorithm(id)!, input);
  if (!r.ok) throw new Error(`${id}: ${r.error}`);
  const problems = checkTrace(r.trace);
  if (problems.length) throw new Error(`${id} invariants:\n${problems.join('\n')}`);
  return r.trace;
}

const lastArray = (tr: Trace, id: string) => {
  const s = tr.steps[tr.steps.length - 1]!.snapshot[id]!;
  if (s.kind !== 'array') throw new Error('not an array');
  return s.items.map((x) => x.value);
};

describe('reference implementations are correct (randomized)', () => {
  const r = rng(42);

  it('sorts sort, and array identities are preserved', () => {
    for (let k = 0; k < 40; k++) {
      const arr = Array.from({ length: r(1, 12) }, () => r(-20, 20));
      for (const id of ['bubble-sort', 'insertion-sort']) {
        const tr = run(id, { arr });
        const sorted = [...arr].sort((a, b) => a - b);
        expect(tr.result).toEqual(sorted);
        expect(lastArray(tr, 'a')).toEqual(sorted);
        const ids = tr.steps[tr.steps.length - 1]!.snapshot.a!;
        expect(new Set((ids as { items: { id: string }[] }).items.map((i) => i.id)).size).toBe(
          arr.length,
        );
      }
    }
  });

  it('binary and linear search agree with indexOf semantics', () => {
    for (let k = 0; k < 60; k++) {
      const arr = [...new Set(Array.from({ length: r(1, 20) }, () => r(0, 40)))].sort(
        (a, b) => a - b,
      );
      const target = r(0, 40);
      const idx = arr.indexOf(target);
      expect(run('binary-search', { arr, target }).result).toBe(idx);
      expect(run('linear-search', { arr, target }).result).toBe(idx);
    }
  });

  it('two pointers finds a pair iff one exists', () => {
    for (let k = 0; k < 60; k++) {
      const arr = Array.from({ length: r(2, 12) }, () => r(0, 30)).sort((a, b) => a - b);
      const target = r(0, 60);
      const exists = arr.some((a, i) => arr.some((b, j) => i < j && a + b === target));
      const [l, rr] = run('two-pointers', { arr, target }).result as number[];
      if (exists) expect(arr[l!]! + arr[rr!]!).toBe(target);
      else expect([l, rr]).toEqual([-1, -1]);
    }
  });

  it('sliding window matches brute force', () => {
    for (let k = 0; k < 60; k++) {
      const arr = Array.from({ length: r(1, 14) }, () => r(1, 9));
      const s = r(1, 40);
      let best = 0;
      for (let i = 0; i < arr.length; i++) {
        let sum = 0;
        for (let j = i; j < arr.length; j++) {
          sum += arr[j]!;
          if (sum >= s) {
            if (!best || j - i + 1 < best) best = j - i + 1;
            break;
          }
        }
      }
      expect(run('sliding-window', { arr, s }).result).toBe(best);
    }
  });

  it('prefix sum range queries', () => {
    for (let k = 0; k < 40; k++) {
      const arr = Array.from({ length: r(1, 12) }, () => r(-9, 9));
      const l = r(0, arr.length - 1);
      const rr = r(l, arr.length - 1);
      expect(run('prefix-sum', { arr, l, r: rr }).result).toBe(
        arr.slice(l, rr + 1).reduce((a, b) => a + b, 0),
      );
    }
  });

  it('valid parentheses matches a reference checker', () => {
    const ref = (s: string) => {
      const st: string[] = [];
      const m: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
      for (const c of s) {
        if (!(c in m)) st.push(c);
        else if (st.pop() !== m[c]) return false;
      }
      return st.length === 0;
    };
    for (let k = 0; k < 80; k++) {
      const s = Array.from({ length: r(1, 10) }, () => '()[]{}'[r(0, 5)]).join('');
      expect(run('valid-parentheses', { s }).result).toBe(ref(s));
    }
  });

  it('next greater element matches O(n²)', () => {
    for (let k = 0; k < 40; k++) {
      const arr = Array.from({ length: r(1, 12) }, () => r(0, 20));
      const expected = arr.map((v, i) => arr.slice(i + 1).find((w) => w > v) ?? -1);
      expect(run('next-greater-element', { arr }).result).toEqual(expected);
    }
  });

  it('BST insert/delete keep in-order output sorted', () => {
    for (let k = 0; k < 30; k++) {
      const values = [...new Set(Array.from({ length: r(1, 12) }, () => r(1, 60)))];
      expect(run('inorder-traversal', { values }).result).toEqual(
        [...values].sort((a, b) => a - b),
      );
      run('bst-insert', { values });
      const key = r(0, 1) ? values[r(0, values.length - 1)]! : 61;
      const tr = run('bst-delete', { values, key });
      expect(tr.result).toBe(values.includes(key));
      const tree = tr.steps[tr.steps.length - 1]!.snapshot.bst!;
      if (tree.kind !== 'tree') throw new Error();
      const out: number[] = [];
      const walk = (id: string | null) => {
        if (!id) return;
        walk(tree.nodes[id]!.left);
        out.push(tree.nodes[id]!.value as number);
        walk(tree.nodes[id]!.right);
      };
      walk(tree.root);
      expect(out).toEqual(values.filter((v) => v !== key).sort((a, b) => a - b));
    }
  });

  it('level order visits every node level by level', () => {
    const tr = run('level-order-traversal', { values: [50, 30, 70, 20, 40, 60, 80] });
    expect(tr.result).toEqual([50, 30, 70, 20, 40, 60, 80]);
  });

  it('heap push maintains the min-heap property', () => {
    for (let k = 0; k < 30; k++) {
      const values = Array.from({ length: r(1, 15) }, () => r(0, 50));
      const h = run('heap-push', { values }).result as number[];
      h.forEach((v, i) => {
        if (i > 0) expect(h[(i - 1) >> 1]!).toBeLessThanOrEqual(v);
      });
      expect([...h].sort((a, b) => a - b)).toEqual([...values].sort((a, b) => a - b));
    }
  });

  const randomGraph = (n: number, m: number, weighted: boolean) => {
    const nodes = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
    const edges: { from: string; to: string; weight?: number }[] = [];
    const seen = new Set<string>();
    for (let k = 0; k < m; k++) {
      const a = r(0, n - 1);
      const b = r(0, n - 1);
      const key = [Math.min(a, b), Math.max(a, b)].join('-');
      if (a === b || seen.has(key)) continue;
      seen.add(key);
      edges.push(
        weighted
          ? { from: nodes[a]!, to: nodes[b]!, weight: r(0, 12) }
          : { from: nodes[a]!, to: nodes[b]! },
      );
    }
    return { nodes, edges, source: nodes[0]! };
  };

  it('Dijkstra matches Bellman–Ford', () => {
    for (let k = 0; k < 30; k++) {
      const g = randomGraph(r(2, 8), r(1, 14), true);
      const dist = new Map(g.nodes.map((n) => [n, n === g.source ? 0 : Infinity]));
      for (let i = 0; i < g.nodes.length; i++) {
        for (const e of g.edges) {
          const w = e.weight!;
          if (dist.get(e.from)! + w < dist.get(e.to)!) dist.set(e.to, dist.get(e.from)! + w);
          if (dist.get(e.to)! + w < dist.get(e.from)!) dist.set(e.from, dist.get(e.to)! + w);
        }
      }
      const expected = g.nodes.map((n) => (dist.get(n) === Infinity ? '∞' : String(dist.get(n))));
      expect(run('dijkstra', g).result).toEqual(expected);
    }
  });

  it('BFS and DFS reach exactly the connected component', () => {
    for (let k = 0; k < 30; k++) {
      const g = randomGraph(r(1, 9), r(0, 12), false);
      const comp = new Set([g.source]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const e of g.edges) {
          if (comp.has(e.from) !== comp.has(e.to)) {
            comp.add(e.from);
            comp.add(e.to);
            grew = true;
          }
        }
      }
      for (const id of ['bfs', 'dfs']) {
        const order = run(id, g).result as string[];
        expect(new Set(order)).toEqual(comp);
        expect(order[0]).toBe(g.source);
      }
    }
  });

  it('topological order respects every edge, or reports a cycle', () => {
    for (let k = 0; k < 30; k++) {
      const n = r(1, 8);
      const nodes = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
      const edges: { from: string; to: string }[] = [];
      const seen = new Set<string>();
      const cyclic = r(0, 3) === 0;
      for (let m = 0; m < n * 2; m++) {
        let a = r(0, n - 1);
        let b = r(0, n - 1);
        if (a === b) continue;
        if (!cyclic && a > b) [a, b] = [b, a];
        const key = `${a}>${b}`;
        if (seen.has(key) || seen.has(`${b}>${a}`)) continue;
        seen.add(key);
        edges.push({ from: nodes[a]!, to: nodes[b]! });
      }
      const order = run('topological-sort', { nodes, edges }).result as string[];
      if (order.length) {
        const pos = new Map(order.map((x, i) => [x, i]));
        expect(order.length).toBe(n);
        for (const e of edges) expect(pos.get(e.from)!).toBeLessThan(pos.get(e.to)!);
      } else {
        expect(cyclic).toBe(true);
      }
    }
  });

  it('coin change matches exhaustive search', () => {
    for (let k = 0; k < 30; k++) {
      const coins = [...new Set(Array.from({ length: r(1, 4) }, () => r(1, 9)))];
      const amount = r(1, 20);
      const best = new Array<number>(amount + 1).fill(Infinity);
      best[0] = 0;
      for (let x = 1; x <= amount; x++)
        for (const c of coins) if (c <= x) best[x] = Math.min(best[x]!, best[x - c]! + 1);
      expect(run('coin-change', { coins, amount }).result).toBe(
        best[amount] === Infinity ? -1 : best[amount],
      );
    }
  });

  it('flood fill fills exactly the start component', () => {
    const grid = [
      [1, 1, 0],
      [0, 1, 0],
      [1, 0, 1],
    ];
    expect(run('flood-fill', { grid, sr: 0, sc: 0 }).result).toBe(3);
    const bad = runAlgorithm(getAlgorithm('flood-fill')!, { grid, sr: 0, sc: 2 });
    expect(bad.ok).toBe(false);
  });
});

describe('runAlgorithm input handling', () => {
  it('rejects schema violations with readable messages', () => {
    const r = runAlgorithm(getAlgorithm('binary-search')!, { arr: [3, 1, 2], target: 1 });
    expect(r).toMatchObject({ ok: false, kind: 'input' });
    expect(!r.ok && r.error).toMatch(/sorted/);
  });
});
