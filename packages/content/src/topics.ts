/**
 * Topics follow the 8-stage ladder (docs/00 §3): Understand → Visualize → Trace → Predict →
 * Implement → Test → Explain → Interview. Stages 1–4 come free from one trace. Deep topics get
 * all eight lessons; shallow topics get the four that matter most.
 */

export type LessonBlockDef =
  | { kind: 'markdown'; body: string }
  | { kind: 'callout'; tone: 'info' | 'tip' | 'warning'; body: string }
  | { kind: 'viz'; algorithmId: string; input?: unknown; caption?: string; practice?: boolean }
  | { kind: 'quiz'; questionSlug: string }
  | { kind: 'problem'; problemSlug: string }
  | { kind: 'explain'; prompt: string; keyPoints: string[] }
  | { kind: 'interview'; body: string };

export type LessonDef = {
  slug: string;
  title: string;
  stage: number;
  estMinutes: number;
  blocks: LessonBlockDef[];
};
export type TopicDef = {
  slug: string;
  title: string;
  skill: string;
  blurb: string;
  lessons: LessonDef[];
};

export const STAGE_NAMES = [
  'Understand',
  'Visualize',
  'Trace',
  'Predict',
  'Implement',
  'Test',
  'Explain',
  'Interview',
] as const;

type TopicSpec = {
  slug: string;
  title: string;
  skill: string;
  blurb: string;
  concept: string;
  algorithmId: string;
  altInput?: unknown;
  altAlgorithmId?: string;
  invariant: string;
  quizzes: string[];
  problems: string[];
  pitfalls: string;
  explain?: { prompt: string; keyPoints: string[] };
  interview?: string;
};

function deep(t: TopicSpec): TopicDef {
  const L = (
    stage: number,
    slug: string,
    title: string,
    estMinutes: number,
    blocks: LessonBlockDef[],
  ): LessonDef => ({ slug, title, stage, estMinutes, blocks });
  const lessons: LessonDef[] = [
    L(1, 'understand', `What ${t.title} is`, 8, [
      { kind: 'markdown', body: t.concept },
      {
        kind: 'viz',
        algorithmId: t.algorithmId,
        caption:
          'Press play and watch one full run. Do not try to memorize it yet — just notice what moves.',
      },
    ]),
    L(2, 'visualize', 'Change the input', 8, [
      {
        kind: 'markdown',
        body: 'Now break it. Edit the input (press **e** in the player) and look for the cases where the behaviour changes: empty or tiny inputs, the answer at either end, no answer at all.',
      },
      {
        kind: 'viz',
        algorithmId: t.altAlgorithmId ?? t.algorithmId,
        input: t.altInput,
        caption: 'A different input. Try a few presets, then your own.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        body: 'Every state you see is shareable — the URL in the full visualizer captures input, step and language.',
      },
    ]),
    L(3, 'trace', 'Trace it line by line', 10, [
      {
        kind: 'markdown',
        body: `Step through slowly with **←** and **→**. The highlighted line is the code that produced the current picture — in C++, Java, Python or TypeScript.\n\nThe invariant to keep in your head:\n\n> ${t.invariant}`,
      },
      {
        kind: 'viz',
        algorithmId: t.algorithmId,
        caption:
          'Switch languages mid-run: the highlight follows, because every language shares the same named anchors.',
      },
    ]),
    L(4, 'predict', 'Predict the next step', 10, [
      {
        kind: 'markdown',
        body: 'Practice mode pauses at every decision. Answer before the algorithm does — a wrong answer shows the invariant you broke. Every answer is recorded as evidence.',
      },
      { kind: 'viz', algorithmId: t.algorithmId, practice: true },
      ...t.quizzes.map((q) => ({ kind: 'quiz' as const, questionSlug: q })),
    ]),
    L(5, 'implement', 'Implement it', 20, [
      {
        kind: 'markdown',
        body: 'Write it yourself. The judge runs your code against hidden tests; a verdict becomes the strongest evidence in your skill model.',
      },
      { kind: 'problem', problemSlug: t.problems[0]! },
    ]),
    L(6, 'test', 'Edge cases and a harder variant', 20, [
      { kind: 'callout', tone: 'warning', body: t.pitfalls },
      { kind: 'problem', problemSlug: t.problems[1] ?? t.problems[0]! },
    ]),
    L(7, 'explain', 'Explain your approach', 8, [
      {
        kind: 'markdown',
        body: 'Interviewers grade the explanation as much as the code. Write it the way you would say it out loud.',
      },
      {
        kind: 'explain',
        ...(t.explain ?? {
          prompt: `Explain how ${t.title} works, its time and space complexity, and one edge case.`,
          keyPoints: ['invariant', 'complexity', 'edge case'],
        }),
      },
    ]),
    L(8, 'interview', 'Interview pressure', 5, [
      {
        kind: 'interview',
        body:
          t.interview ??
          `Mock interviews draw follow-ups from ${t.title}: expect "can you do better?", "what if the input doesn't fit in memory?" and "walk me through an edge case".`,
      },
    ]),
  ];
  return { slug: t.slug, title: t.title, skill: t.skill, blurb: t.blurb, lessons };
}

/** Shallow topics: Understand, Predict, Implement (+ Visualize when an alternative input exists). */
function shallow(t: TopicSpec): TopicDef {
  const full = deep(t);
  const keep = new Set([1, 2, 4, 5]);
  return {
    ...full,
    lessons: full.lessons.filter(
      (l) => keep.has(l.stage) && (l.stage !== 5 || t.problems.length > 0),
    ),
  };
}

export const TOPICS: TopicDef[] = [
  shallow({
    slug: 'arrays-traversal',
    title: 'Array Traversal',
    skill: 'dsa.arrays.traversal',
    blurb: 'The linear scan underneath almost every array technique.',
    concept:
      'An array stores values **contiguously**, so `a[i]` is a single address computation — O(1). A **traversal** visits every index once, carrying a little state (a running sum, the best value so far).\n\nLinear search is the simplest traversal: compare each element with the target and stop at the first match. It is O(n) and needs no ordering.',
    algorithmId: 'linear-search',
    altInput: { arr: [4, 8, 15, 16, 23, 42], target: 5 },
    invariant: 'The target is not in a[0..i−1].',
    quizzes: ['q-arrays-index'],
    problems: ['array-sum', 'second-largest'],
    pitfalls:
      'Sums overflow 32-bit integers quickly — use 64-bit. "Second largest" means second largest DISTINCT value.',
  }),
  deep({
    slug: 'two-pointers',
    title: 'Two Pointers',
    skill: 'dsa.arrays.two-pointers',
    blurb: 'Two indices that close in on the answer, turning O(n²) pair searches into O(n).',
    concept:
      'When the array is **sorted**, comparing `a[l] + a[r]` with the target tells you which pointer can move safely:\n\n- sum too small → only a larger left value helps, so `l++`\n- sum too large → only a smaller right value helps, so `r--`\n\nEach step discards one candidate for good, so the scan is O(n) with O(1) extra space.',
    algorithmId: 'two-pointers',
    altInput: { arr: [2, 4, 7, 9, 12], target: 8 },
    invariant: 'Any valid pair uses indices inside [l, r].',
    quizzes: ['q-two-pointers-when'],
    problems: ['pair-sum-sorted', 'dedupe-sorted'],
    pitfalls:
      'The two pointers must be DIFFERENT positions (`l < r`). Duplicates are fine; an unsorted array is not.',
    explain: {
      prompt:
        'Explain why moving the left pointer right is safe when the sum is too small, and state the complexity.',
      keyPoints: ['sorted', 'discard', 'O(n)', 'O(1) space'],
    },
  }),
  deep({
    slug: 'sliding-window',
    title: 'Sliding Window',
    skill: 'dsa.arrays.sliding-window',
    blurb: 'A contiguous window that grows on the right and shrinks on the left.',
    concept:
      'A **window** `[l, r]` represents one contiguous subarray. Instead of recomputing each subarray from scratch, keep its summary (sum, counts) up to date:\n\n- **expand**: `r++`, add `a[r]`\n- **shrink**: remove `a[l]`, `l++`\n\nEach index enters and leaves the window at most once — O(n) total, even with the inner `while`.',
    algorithmId: 'sliding-window',
    altInput: { arr: [1, 4, 4, 9, 2, 1], s: 9 },
    invariant: 'sum = a[l] + … + a[r], and every shorter valid window has been recorded.',
    quizzes: ['q-sliding-window-shrink'],
    problems: ['max-sum-window', 'longest-unique-substring'],
    pitfalls:
      'The shrink-while-valid trick needs a monotone summary — it works for positive numbers, not for arrays with negatives.',
    explain: {
      prompt: 'Explain why the sliding window is O(n) even though it has a nested loop.',
      keyPoints: ['each index', 'once', 'O(n)', 'amortized'],
    },
  }),
  shallow({
    slug: 'prefix-sums',
    title: 'Prefix Sums',
    skill: 'dsa.arrays.prefix-sum',
    blurb: 'Pay O(n) once; answer every range-sum query in O(1).',
    concept:
      'Define `p[0] = 0` and `p[i+1] = p[i] + a[i]`. Then any range sum is a subtraction:\n\n`sum(a[l..r]) = p[r+1] − p[l]`\n\nThe same idea counts subarrays with a given sum: two prefixes that differ by k bracket a subarray summing to k.',
    algorithmId: 'prefix-sum',
    altInput: { arr: [5, -2, 7, 0, 3], l: 0, r: 4 },
    invariant: 'p[i] = a[0] + … + a[i−1].',
    quizzes: ['q-prefix-query'],
    problems: ['range-sum-queries', 'subarray-sum-k'],
    pitfalls: 'Off-by-one is the whole game: p has n + 1 entries.',
  }),
  deep({
    slug: 'binary-search',
    title: 'Binary Search',
    skill: 'dsa.searching.binary-search',
    blurb: 'Halve a monotone search space every step: O(log n).',
    concept:
      'Binary search keeps an interval `[lo, hi]` that must contain the answer if it exists. Compare with the middle element; because the array is **sorted**, one half can be thrown away.\n\nThe same idea works on any **monotone** yes/no question — not just arrays. "Is m·m ≤ x?" is false-false-…-true-true, so you can binary search the answer.',
    algorithmId: 'binary-search',
    altInput: { arr: [2, 5, 8, 12, 16, 23, 38], target: 13 },
    invariant: 'If the target exists, it is inside [lo, hi].',
    quizzes: ['q-binary-search-precondition', 'q-binary-search-overflow'],
    problems: ['lower-bound', 'integer-sqrt'],
    pitfalls:
      'Pick ONE interval convention ([lo, hi] or [lo, hi)) and keep it everywhere. Compute mid as lo + (hi − lo) / 2. Squares of large numbers overflow 32 bits.',
    explain: {
      prompt:
        'Explain the invariant binary search maintains, why it terminates, and its complexity.',
      keyPoints: ['sorted', 'invariant', 'half', 'O(log n)'],
    },
  }),
  shallow({
    slug: 'sorting-basics',
    title: 'Elementary Sorting',
    skill: 'dsa.sorting.elementary',
    blurb: 'Insertion and bubble sort: simple, stable, and the base case of faster sorts.',
    concept:
      '**Insertion sort** grows a sorted prefix: take the next key and slide it left past larger elements. It is O(n²) in the worst case but O(n) on nearly-sorted input — which is why real sorting libraries use it for small slices.',
    algorithmId: 'insertion-sort',
    altAlgorithmId: 'bubble-sort',
    invariant: 'a[0..i−1] is sorted.',
    quizzes: ['q-insertion-best'],
    problems: ['sort-array'],
    pitfalls: 'Use `>` not `>=` when shifting, or the sort stops being stable.',
  }),
  shallow({
    slug: 'stacks',
    title: 'Stacks',
    skill: 'dsa.stacks-queues.stack',
    blurb: 'Last in, first out — matching, parsing and undo.',
    concept:
      'A **stack** only touches its top: `push`, `pop`, `peek`, all O(1). Anything with nesting — brackets, function calls, HTML tags — is a stack problem, because the most recent open thing must close first.',
    algorithmId: 'valid-parentheses',
    altInput: { s: '([)]' },
    invariant: 'The stack holds the unmatched openers, innermost on top.',
    quizzes: ['q-stack-lifo'],
    problems: ['balanced-brackets'],
    pitfalls:
      'Check for an empty stack before peeking, and remember a non-empty stack at the end means unclosed openers.',
  }),
  shallow({
    slug: 'monotonic-stack',
    title: 'Monotonic Stack',
    skill: 'dsa.stacks-queues.monotonic-stack',
    blurb: 'A stack kept sorted answers "next greater" questions in one pass.',
    concept:
      'Keep a stack of indices whose answer is still unknown. Their values are **decreasing** from bottom to top. When a bigger value arrives, it is the answer for every smaller value on top — pop them all.',
    algorithmId: 'next-greater-element',
    altInput: { arr: [9, 7, 5, 3, 1] },
    invariant: 'Values on the stack are decreasing from bottom to top.',
    quizzes: ['q-monotonic'],
    problems: ['next-greater'],
    pitfalls: 'Store indices, not values, when you need to write the answer back into position.',
  }),
  shallow({
    slug: 'tree-traversal',
    title: 'Tree Traversal',
    skill: 'dsa.trees.traversal',
    blurb: 'Depth-first with a call stack, breadth-first with a queue.',
    concept:
      '**In-order** (left, node, right) is recursion: the call stack remembers where to come back to. **Level order** is BFS: a queue hands out nodes level by level. On a BST, in-order yields sorted output.',
    algorithmId: 'inorder-traversal',
    altAlgorithmId: 'level-order-traversal',
    invariant: 'Every node is output after its entire left subtree.',
    quizzes: ['q-inorder-bst'],
    problems: ['level-order-sums'],
    pitfalls:
      'Deep, skewed trees can overflow the recursion stack — iterative traversal with an explicit stack avoids it.',
  }),
  shallow({
    slug: 'bst',
    title: 'Binary Search Trees',
    skill: 'dsa.trees.bst',
    blurb: 'Ordered trees: search, insert and delete in O(height).',
    concept:
      'Every node is larger than its left subtree and no larger than its right. Search walks one root-to-leaf path, so everything costs O(h) — O(log n) when balanced, O(n) when the tree degenerates.\n\nDeleting a node with two children copies in its **in-order successor**.',
    algorithmId: 'bst-insert',
    altAlgorithmId: 'bst-delete',
    invariant: 'For every node: left subtree < node ≤ right subtree.',
    quizzes: ['q-bst-worst', 'q-bst-delete'],
    problems: ['bst-height'],
    pitfalls:
      'Sorted insertion order builds a linked list. Decide where duplicates go and be consistent.',
  }),
  shallow({
    slug: 'heaps',
    title: 'Heaps & Priority Queues',
    skill: 'dsa.heaps',
    blurb: 'Always know the minimum, in O(log n) per update.',
    concept:
      'A binary heap is a complete tree stored in an array: children of `i` are `2i+1` and `2i+2`. Push appends then **sifts up** while the parent is larger. It powers Dijkstra, scheduling, and "top k" questions.',
    algorithmId: 'heap-push',
    altInput: { values: [10, 8, 6, 4, 2, 1] },
    invariant: 'Every parent ≤ its children.',
    quizzes: ['q-heap-push'],
    problems: ['kth-smallest'],
    pitfalls: 'C++ priority_queue is a MAX-heap by default; use greater<> for a min-heap.',
  }),
  deep({
    slug: 'graph-traversal',
    title: 'Graph Traversal',
    skill: 'dsa.graphs.traversal',
    blurb: 'BFS explores in rings; DFS dives deep and backtracks.',
    concept:
      'A graph is nodes plus edges, stored as an **adjacency list**. Both traversals mark nodes as seen so each is processed once — O(V + E).\n\n- **BFS** uses a queue and finds shortest paths in unweighted graphs.\n- **DFS** uses recursion (or a stack) and is the base of cycle detection, topological sort and connected components.',
    algorithmId: 'bfs',
    altAlgorithmId: 'dfs',
    invariant: 'Nodes leave the BFS queue in non-decreasing distance from the start.',
    quizzes: ['q-bfs-shortest', 'q-dfs-stack'],
    problems: ['connected-components', 'shortest-path-unweighted'],
    pitfalls:
      'Mark a node as seen when you ENQUEUE it, not when you dequeue it — otherwise it can be queued many times.',
    explain: {
      prompt: 'Explain why BFS gives shortest paths in an unweighted graph but DFS does not.',
      keyPoints: ['queue', 'distance', 'level', 'O(V + E)'],
    },
  }),
  shallow({
    slug: 'shortest-paths',
    title: 'Shortest Paths',
    skill: 'dsa.graphs.shortest-path',
    blurb: 'Dijkstra: settle the closest unsettled node, relax its edges, repeat.',
    concept:
      'With non-negative weights, the unsettled node with the smallest tentative distance can never be improved — so settle it. Then **relax** each edge: if `dist[u] + w < dist[v]`, update `v`. A min-heap finds the next node in O(log V).',
    algorithmId: 'dijkstra',
    invariant: 'Every settled node already has its final shortest distance.',
    quizzes: ['q-dijkstra-next', 'q-dijkstra-negative'],
    problems: ['dijkstra-distances'],
    pitfalls:
      'With a lazy heap, skip stale entries (d > dist[u]). Negative edges break Dijkstra — use Bellman–Ford.',
  }),
  shallow({
    slug: 'topological-sort',
    title: 'Topological Sort',
    skill: 'dsa.graphs.topological-sort',
    blurb: 'Order a DAG so every edge points forward — or prove a cycle exists.',
    concept:
      "Kahn's algorithm repeatedly takes a node with **in-degree 0** (no remaining prerequisites) and removes its outgoing edges. If nodes remain that never reach in-degree 0, they sit on a cycle.",
    algorithmId: 'topological-sort',
    invariant: 'A node is ready exactly when every edge into it has been removed.',
    quizzes: ['q-topo-cycle'],
    problems: ['course-schedule'],
    pitfalls: 'Read the edge direction carefully: "b before a" is an edge b → a.',
  }),
  shallow({
    slug: 'grid-graphs',
    title: 'Grids as Graphs',
    skill: 'dsa.graphs.grid',
    blurb: 'Every cell is a node joined to its four neighbours.',
    concept:
      'A 2D grid is an implicit graph: no adjacency list needed, the neighbours of `(r, c)` are computed. Flood fill is BFS/DFS that stops at a different colour. Counting islands is "how many flood fills did I start?"',
    algorithmId: 'flood-fill',
    invariant: 'Every queued cell is already coloured, so nothing is enqueued twice.',
    quizzes: [],
    problems: ['number-of-islands'],
    pitfalls: 'Check bounds before reading a neighbour, and colour on enqueue.',
  }),
  shallow({
    slug: 'dp-1d',
    title: '1D Dynamic Programming',
    skill: 'dsa.dp.1d',
    blurb: 'Solve each subproblem once, in an order where its inputs are ready.',
    concept:
      'DP = recursion + memory. Define the state (`dp[x]` = fewest coins for amount x), the transition (`1 + min dp[x − c]`), the base case (`dp[0] = 0`), and fill the table in an order where every dependency is already computed.',
    algorithmId: 'coin-change',
    altInput: { coins: [1, 5, 6, 9], amount: 11 },
    invariant: 'dp[y] is final for every y < x.',
    quizzes: ['q-dp-overlap', 'q-greedy-coins'],
    problems: ['climbing-stairs', 'min-coins'],
    pitfalls: 'Initialise impossible states to infinity, not 0, and never add 1 to infinity.',
  }),
  shallow({
    slug: 'cpu-scheduling',
    title: 'CPU Scheduling',
    skill: 'cs.os.scheduling',
    blurb: 'Who gets the CPU next — and what it costs in waiting time.',
    concept:
      '**Round Robin** gives each ready process at most one time **quantum**, then moves it to the back of the ready queue. A small quantum is responsive but pays more context switches; a huge quantum degenerates into first-come-first-served.',
    algorithmId: 'round-robin',
    altInput: { arrivals: [0, 1, 2], bursts: [4, 3, 2], quantum: 6 },
    invariant: 'A process never runs more than one quantum before yielding.',
    quizzes: ['q-rr-quantum'],
    problems: [],
    pitfalls:
      'Processes that arrive during a time slice join the queue BEFORE the preempted process.',
  }),
  shallow({
    slug: 'page-replacement',
    title: 'Page Replacement',
    skill: 'cs.os.memory',
    blurb: 'Memory is full and a page faults: which page leaves?',
    concept:
      '**LRU** evicts the page used least recently, betting that the recent past predicts the near future. It is implemented with a hash map plus a doubly linked list so every access is O(1).',
    algorithmId: 'lru-page-replacement',
    altInput: { refs: [1, 2, 3, 4, 1, 2, 3, 4], frames: 3 },
    invariant: 'The front of the recency list is always the eviction victim.',
    quizzes: ['q-lru'],
    problems: [],
    pitfalls: 'A hit still updates recency — forgetting that turns LRU into FIFO.',
  }),
  shallow({
    slug: 'request-lifecycle',
    title: 'The Request Lifecycle',
    skill: 'cs.networks.http-lifecycle',
    blurb: 'DNS, TCP, TLS, HTTP — and why latency is mostly round trips.',
    concept:
      'Before a single byte of HTML arrives, the browser resolves the name (**DNS**), opens a connection (**TCP** handshake), sets up encryption (**TLS**), and only then sends the **HTTP** request. Each is at least one round trip, which is why CDNs, connection reuse and DNS caching matter so much.',
    algorithmId: 'http-lifecycle',
    altInput: { url: 'https://example.org/', rttMs: 250, dnsCached: 0, serverMs: 30 },
    invariant: 'Nothing encrypted can be sent before a TCP connection exists.',
    quizzes: ['q-tls-order', 'q-tcp-handshake'],
    problems: [],
    pitfalls: 'HTTP/3 runs over QUIC (UDP) and merges the transport and TLS handshakes.',
  }),
];
