# 03 — The Visual Algorithm Engine

This is the hardest and most valuable component. Everything in the DSA and CS-fundamentals
surfaces derives from it. Get this right and the rest of the product is CRUD.

## 1. The central idea

> An algorithm is authored **once**, as an instrumented reference implementation.
> It emits a **Trace**. Animation, code highlighting, scrubbing, interactive
> checkpoints, "predict the next state" questions, and admin previews are all
> *pure functions of that Trace*.

One authoring cost, six features.

```text
   defineAlgorithm(...)          ← written once, in TypeScript, ~60 lines
            │
            ▼
      run(input, recorder)
            │
            ▼
         ┌──────┐
         │TRACE │  steps[] + structures[] + code sources + line anchors
         └──┬───┘
            │
   ┌────────┼─────────┬──────────────┬──────────────┬────────────┐
   ▼        ▼         ▼              ▼              ▼            ▼
 PLAYER  CODE PANE  PREDICT Q    INTERACTIVE     ADMIN        ASSESSMENT
 (anim)  (highlight) (auto-gen)  ("pick next")   PREVIEW      ITEM BANK
```

## 2. Core types

Lives in `packages/viz/src/types.ts`. Pure data, serializable, no classes on the wire.

```ts
export type Trace = {
  algorithmId: string;
  input: unknown;
  structures: StructureDecl[];   // the visual models this algorithm uses
  steps: Step[];
  sources: Record<Lang, CodeSource>;  // cpp | java | python | ts
  complexity: { time: string; space: string };
};

export type StructureDecl =
  | { id: string; kind: 'array';      length: number }
  | { id: string; kind: 'matrix';     rows: number; cols: number }
  | { id: string; kind: 'list';       cyclic?: boolean }
  | { id: string; kind: 'tree';       ordered: boolean }
  | { id: string; kind: 'graph';      directed: boolean; weighted: boolean; layout: Point[] }
  | { id: string; kind: 'stack' }
  | { id: string; kind: 'queue' }
  | { id: string; kind: 'table' };    // DP tables, distance tables, scheduling charts

export type Step = {
  i: number;
  anchor: LineAnchor;              // maps to a line range in EVERY language source
  snapshot: Record<string, StructureState>;  // full state of each structure
  marks: Mark[];                   // pointers, windows, highlights, edge states
  vars: Record<string, Scalar>;    // l, r, mid, dist[], visited count...
  narration: string;               // "a[mid]=12 < 23, so the answer is to the right"
  invariant?: string;              // "the answer lies within [l, r]"
  checkpoint?: Checkpoint;         // optional interactive gate at this step
  emphasis?: 'normal' | 'key' | 'result';
};

export type Mark =
  | { type: 'pointer'; struct: string; at: number | string; label: string; tone: Tone }
  | { type: 'range';   struct: string; from: number; to: number; tone: Tone }
  | { type: 'cell';    struct: string; at: number | string; tone: Tone }
  | { type: 'edge';    struct: string; from: string; to: string; tone: Tone }
  | { type: 'compare'; struct: string; a: number; b: number };

export type Tone = 'active'|'visited'|'excluded'|'candidate'|'found'|'frontier'|'path'|'error';
```

### Decision: full snapshots, not diffs

Each `Step` carries a **complete** `snapshot`, not a patch.

- Backward scrubbing becomes O(1) instead of requiring inverse operations.
- Jumping to step 47 is an array index.
- Diffing/patching would double the code and every bug class.
- Pedagogical inputs are tiny (array n ≤ 64, graph V ≤ 16, tree nodes ≤ 31), and traces
  cap at 500 steps. Worst realistic trace is well under 1 MB and it is never persisted.

If a trace ever exceeds `MAX_STEPS`, the recorder throws at author time, not runtime.

## 3. Authoring API

An author writes the algorithm naturally, with recorder calls interleaved.

```ts
// packages/viz/src/algorithms/arrays/binary-search.ts
export default defineAlgorithm({
  id: 'binary-search',
  title: 'Binary Search',
  skillId: 'dsa.searching.binary-search',
  params: z.object({ arr: z.array(z.number()).max(64), target: z.number() }),
  defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38], target: 23 },
  complexity: { time: 'O(log n)', space: 'O(1)' },

  run({ arr, target }, t) {
    const a = t.array('a', arr);
    let lo = 0, hi = arr.length - 1;

    t.at('init').vars({ lo, hi, target }).say('Search the whole array.').step();

    while (lo <= hi) {
      a.range(lo, hi, 'candidate');
      const mid = (lo + hi) >> 1;
      a.pointer('mid', mid, 'active');

      t.at('mid')
        .vars({ lo, hi, mid })
        .say(`mid = ${mid}, a[mid] = ${arr[mid]}`)
        .invariant('If the target exists, it is inside [lo, hi].')
        .ask({                                   // ← interactive checkpoint
          kind: 'choice',
          prompt: 'Which half survives?',
          options: ['left', 'right', 'found'],
          answer: arr[mid] === target ? 'found' : arr[mid] < target ? 'right' : 'left',
        })
        .step();

      if (arr[mid] === target) {
        a.cell(mid, 'found');
        t.at('found').say('Target located.').emphasis('result').step();
        return mid;
      }
      if (arr[mid] < target) {
        a.range(lo, mid, 'excluded');
        lo = mid + 1;
        t.at('goRight').vars({ lo }).say('Discard the left half.').step();
      } else {
        a.range(mid, hi, 'excluded');
        hi = mid - 1;
        t.at('goLeft').vars({ hi }).say('Discard the right half.').step();
      }
    }
    t.at('notFound').say('Range is empty — target is absent.').emphasis('result').step();
    return -1;
  },
});
```

### Line anchors are the trick

The displayed C++ / Java / Python source is stored alongside the algorithm with the **same
named anchors**:

```cpp
int binarySearch(vector<int>& a, int target) {
    int lo = 0, hi = a.size() - 1;              // @init
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;           // @mid
        if (a[mid] == target) return mid;       // @found
        if (a[mid] < target) lo = mid + 1;      // @goRight
        else hi = mid - 1;                      // @goLeft
    }
    return -1;                                  // @notFound
}
```

A build step strips `// @anchor` comments and produces `{ code, anchors: {init: 2, mid: 4, ...} }`.

**Consequence:** one TypeScript trace drives synchronized highlighting in four languages, and
we never execute C++ to show C++. This is what makes the side-by-side "visual debugger" panel
achievable without a compiler in the loop.

## 4. Renderers — the real leverage

Renderers are keyed by **structure kind, not by algorithm**. Eight renderers cover the entire
curriculum:

| Renderer | Serves |
|---|---|
| `ArrayView` | traversal, two pointers, sliding window, prefix sum, binary search, all sorts |
| `MatrixView` | grids, DP tables, adjacency matrix, Floyd–Warshall, spiral/rotate |
| `ListView` | singly/doubly linked list, reverse, cycle detection, merge |
| `TreeView` | BST ops, traversals, heaps, tries, AVL rotations, segment trees |
| `GraphView` | BFS, DFS, Dijkstra, Bellman–Ford, Kruskal, Prim, topological sort, union-find |
| `StackQueueView` | stack, queue, deque, monotonic stack, BFS queue side-panel |
| `TableView` | DP memo tables, distance tables, OS scheduling (Gantt), page-replacement frames |
| `FlowView` | CN request lifecycle, DBMS query pipeline, OS state machines |

45 algorithms / 8 renderers ≈ **5.6 algorithms per renderer.** That ratio is the reason the
scope is feasible. A new algorithm is a new `defineAlgorithm` file, not new UI.

### Rendering rules

- SVG with a fixed `viewBox`; React owns the DOM.
- `d3-hierarchy` (Reingold–Tilford) for tree coordinates; graphs prefer **author-supplied fixed
  coordinates** because stable, readable node positions matter more than automatic layout —
  `d3-force` only as a fallback for user-generated graphs.
- Transitions via `motion`, driven by `layoutId` on node/cell keys, so an element moving from
  index 3 to index 5 *animates* rather than re-mounting.
- `prefers-reduced-motion` → instant state changes, no tweening.
- Colors come from the semantic `Tone` set, never hardcoded per-algorithm. One legend across
  the whole product means the vocabulary transfers between topics.

## 5. The player

```text
 ┌──────────────────────────┬───────────────────────────────┐
 │  CODE  (lang switcher)   │  VISUALIZATION                │
 │  line 4 highlighted ────►│  [2 5 8 12 16 23 38]          │
 │                          │         ▲ mid                 │
 ├──────────────────────────┤  lo=0  hi=6  target=23        │
 │  VARIABLES               ├───────────────────────────────┤
 │  lo 0 · hi 6 · mid 3     │  NARRATION                    │
 │                          │  a[mid]=12 < 23 → go right    │
 └──────────────────────────┴───────────────────────────────┘
   ⏮  ◀  ▶/⏸  ▶▶  ⏭     speed ▁▃▅█     step 3 / 9   [edit input]
```

- Keyboard: `←/→` step, `space` play/pause, `0` restart, `e` edit input.
- Deep-linkable: `?algo=binary-search&input=...&step=4` — required for the admin preview,
  for sharing, and for linking a wrong assessment answer back to the exact step.
- "Edit input" re-runs `run()` client-side. Instant, no network.

## 6. Interactive mode — free from the trace

Section 4 of the brief ("let the student drive Dijkstra") needs **no separate system**. A
`Checkpoint` on a step already encodes the correct answer, because the correct answer is
simply what the algorithm does next.

- `kind: 'choice'` — "which node is processed next?"
- `kind: 'predict-state'` — user drags/sets cells, compared against the next snapshot.
- `kind: 'order'` — reorder the frontier.
- Wrong answer → show the invariant that was violated, then the correct step. Never just "❌".
- Every answer emits a `checkpoint.answered` evidence event with the step's difficulty weight.

This is also where the **assessment item bank** comes from: checkpoints are auto-harvestable
into graded questions, so content authoring produces practice items as a side effect.

## 7. What this engine explicitly does not do

- It does **not** execute the user's submitted code. Correctness comes from the judge
  (`05-ai-layer.md` §4). Visualizing arbitrary user C++ is a stated non-goal.
- It does **not** use an LLM. Traces are deterministic; an LLM-generated animation would be
  wrong occasionally, which is fatal for a teaching tool.
- It does **not** persist frames. Traces are recomputed; only *evidence about* interactions is stored.

## 8. Test strategy

`packages/viz` is pure, so it gets golden-file testing:

- For each algorithm: run `defaultInput`, snapshot the trace, commit it. Any behavioural drift
  shows up as a reviewable diff.
- Invariant assertions: step count within bounds, every `anchor` resolves in every language
  source, every checkpoint answer matches the subsequent step, no `Mark` references an index
  outside its structure.
- A single parameterized suite runs those invariants across the **whole registry**, so a new
  algorithm is validated the moment it is registered.

## 9. Build order within the engine

1. Types + recorder + registry + golden-test harness.
2. `ArrayView` + binary search, two pointers, sliding window. **Ship the player.**
3. `TreeView` + BST insert/delete/traversals.
4. `GraphView` + BFS/DFS/Dijkstra. (Hardest renderer — do it third, not first.)
5. `StackQueueView`, `MatrixView`, `TableView`.
6. Checkpoints + interactive mode.
7. `FlowView` for CS fundamentals (Phase 7).
