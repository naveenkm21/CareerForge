/**
 * Interview question bank. `keyPoints` are what a strong answer covers; the rubric judge (LLM
 * or deterministic fixture) assesses coverage and emits QUALITATIVE levels. Code maps levels to
 * numbers (ADR-006).
 */
export type InterviewQuestion = {
  slug: string;
  kind: 'dsa' | 'fundamentals' | 'behavioral';
  skill: string;
  prompt: string;
  keyPoints: { label: string; terms: string[] }[];
  followUps: string[];
  modelAnswer: string;
};

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    slug: 'iq-longest-k-distinct',
    kind: 'dsa',
    skill: 'dsa.arrays.sliding-window',
    prompt:
      'Given an array of integers, find the length of the longest subarray with at most K distinct elements. Walk me through your approach.',
    keyPoints: [
      { label: 'Sliding window', terms: ['sliding window', 'window', 'two pointers'] },
      { label: 'Frequency map', terms: ['hash', 'map', 'count', 'frequency'] },
      { label: 'Shrink when > K distinct', terms: ['shrink', 'move left', 'more than k', '> k'] },
      { label: 'O(n) time', terms: ['o(n)', 'linear'] },
      { label: 'Edge cases', terms: ['k = 0', 'k=0', 'empty', 'all same', 'k larger'] },
    ],
    followUps: [
      'What if the array is a stream and you can only see each element once?',
      'How would you return the subarray itself, not just its length?',
    ],
    modelAnswer:
      'Use a sliding window [l, r] with a hash map of counts. Expand r; when the map has more than K keys, shrink l and decrement counts, deleting keys at zero. Track the max window length. Each index enters and leaves once: O(n) time, O(K) space. Edge cases: K = 0 → 0, empty array, K ≥ distinct count → n.',
  },
  {
    slug: 'iq-dijkstra-why',
    kind: 'dsa',
    skill: 'dsa.graphs.shortest-path',
    prompt:
      'Find the shortest delivery time from a warehouse to every city, given roads with travel times. Which algorithm, and why does it work?',
    keyPoints: [
      { label: "Dijkstra's algorithm", terms: ['dijkstra'] },
      { label: 'Min-heap / priority queue', terms: ['heap', 'priority queue'] },
      { label: 'Non-negative weights', terms: ['non-negative', 'negative', 'positive'] },
      {
        label: 'Complexity O((V+E) log V)',
        terms: ['log v', 'e log', 'v log', '(v + e)', '(v+e)'],
      },
      {
        label: 'Relaxation / settled nodes',
        terms: ['relax', 'settle', 'greedy', 'smallest distance'],
      },
    ],
    followUps: [
      'What breaks if a road can have negative time?',
      'How do you also return the actual route?',
    ],
    modelAnswer:
      "Dijkstra's algorithm with a min-heap of (distance, node). The unsettled node with the smallest tentative distance cannot improve because weights are non-negative, so settle it and relax its edges. O((V + E) log V). Negative weights break the greedy argument — use Bellman–Ford. Store a parent pointer to rebuild routes.",
  },
  {
    slug: 'iq-two-sum',
    kind: 'dsa',
    skill: 'dsa.hashing',
    prompt:
      'Given an unsorted array and a target, return indices of two numbers that add up to the target. Optimize it.',
    keyPoints: [
      { label: 'Brute force first', terms: ['brute', 'o(n^2)', 'o(n²)', 'nested'] },
      { label: 'Hash map of seen values', terms: ['hash', 'map', 'dictionary', 'seen'] },
      { label: 'Complement lookup', terms: ['complement', 'target -', 'target minus'] },
      { label: 'O(n) time, O(n) space', terms: ['o(n)', 'linear'] },
      {
        label: 'Duplicates / same index',
        terms: ['duplicate', 'same element', 'same index', 'twice'],
      },
    ],
    followUps: ['What if the array were sorted?', 'What if you need all pairs?'],
    modelAnswer:
      'Brute force checks all pairs in O(n²). Better: one pass with a hash map from value to index; for each x, look up target − x before inserting x so an element is not paired with itself. O(n) time and space. If sorted, two pointers give O(1) extra space.',
  },
  {
    slug: 'iq-process-thread',
    kind: 'fundamentals',
    skill: 'cs.os.concurrency',
    prompt: 'What is the difference between a process and a thread? When would you use each?',
    keyPoints: [
      { label: 'Separate vs shared address space', terms: ['address space', 'memory', 'shared'] },
      {
        label: 'Context-switch cost',
        terms: ['context switch', 'overhead', 'lightweight', 'cheaper'],
      },
      { label: 'Isolation / crash containment', terms: ['isolation', 'crash', 'fault'] },
      { label: 'Synchronization needs', terms: ['lock', 'mutex', 'race', 'synchroni'] },
      { label: 'Concrete example', terms: ['browser', 'tab', 'server', 'example'] },
    ],
    followUps: [
      'What is a race condition and how do you prevent one?',
      'What are the four conditions for deadlock?',
    ],
    modelAnswer:
      'A process has its own address space; threads within a process share memory. Threads are cheaper to create and switch, but shared memory needs synchronization (mutexes) to avoid races. Processes isolate failures — e.g. browsers run tabs as processes so one crash does not kill the rest.',
  },
  {
    slug: 'iq-index',
    kind: 'fundamentals',
    skill: 'cs.dbms.indexing',
    prompt:
      'A query filtering users by email is slow on a table with 10 million rows. What would you do and why does it help?',
    keyPoints: [
      { label: 'Add an index', terms: ['index'] },
      { label: 'B-tree structure', terms: ['b-tree', 'btree', 'b tree', 'tree'] },
      { label: 'Full scan → O(log n)', terms: ['full scan', 'table scan', 'log n', 'o(log'] },
      { label: 'Write cost / trade-off', terms: ['write', 'insert', 'trade', 'storage', 'slower'] },
      { label: 'Check with EXPLAIN', terms: ['explain', 'query plan', 'execution plan'] },
    ],
    followUps: [
      'When would an index NOT be used?',
      'What is a composite index and how does column order matter?',
    ],
    modelAnswer:
      'Confirm with EXPLAIN that it is a sequential scan, then add a (unique) B-tree index on email. Lookups become O(log n) tree descents instead of scanning 10M rows. Trade-offs: extra storage and slower writes, since every insert/update maintains the index.',
  },
  {
    slug: 'iq-url',
    kind: 'fundamentals',
    skill: 'cs.networks.http-lifecycle',
    prompt: 'What happens when you type a URL into the browser and press Enter?',
    keyPoints: [
      { label: 'DNS resolution', terms: ['dns'] },
      { label: 'TCP handshake', terms: ['tcp', 'syn', 'handshake'] },
      { label: 'TLS for HTTPS', terms: ['tls', 'ssl', 'certificate', 'https'] },
      { label: 'HTTP request/response', terms: ['http', 'get', 'request', 'response'] },
      { label: 'Rendering', terms: ['render', 'parse', 'dom', 'html'] },
    ],
    followUps: [
      'Where can caching cut latency in this chain?',
      'What changes with HTTP/2 or HTTP/3?',
    ],
    modelAnswer:
      'The browser parses the URL, resolves the host via DNS (cache → resolver), opens a TCP connection (SYN, SYN-ACK, ACK), performs the TLS handshake and verifies the certificate, sends an HTTP GET, the server responds, and the browser parses HTML, builds the DOM, fetches sub-resources and renders.',
  },
  {
    slug: 'iq-conflict',
    kind: 'behavioral',
    skill: 'soft.behavioral',
    prompt:
      'Tell me about a time you disagreed with a teammate on a technical decision. What happened?',
    keyPoints: [
      { label: 'Situation', terms: ['project', 'team', 'situation', 'when'] },
      { label: 'Your action', terms: ['i proposed', 'i suggested', 'i ', 'my'] },
      {
        label: 'Data over opinion',
        terms: ['data', 'benchmark', 'measure', 'prototype', 'evidence'],
      },
      { label: 'Outcome', terms: ['result', 'outcome', 'shipped', 'reduced', 'improved', '%'] },
      { label: 'Reflection', terms: ['learned', 'next time', 'would'] },
    ],
    followUps: [
      'What would you do differently now?',
      'How did it affect your working relationship?',
    ],
    modelAnswer:
      'Use STAR: the situation and stakes, the disagreement, what YOU did (proposed a quick benchmark/prototype to compare options), the measurable result, and what you learned about disagreeing productively.',
  },
  {
    slug: 'iq-project',
    kind: 'behavioral',
    skill: 'soft.communication',
    prompt: 'Walk me through the project you are proudest of. What was hard about it?',
    keyPoints: [
      { label: 'Problem and users', terms: ['problem', 'users', 'needed', 'goal'] },
      { label: 'Your role', terms: ['i built', 'i designed', 'i owned', 'my role', 'i '] },
      {
        label: 'Technical decision with trade-off',
        terms: ['chose', 'trade', 'because', 'instead of'],
      },
      { label: 'Hardest part', terms: ['hard', 'challenge', 'difficult', 'bug'] },
      { label: 'Measurable result', terms: ['%', 'users', 'faster', 'reduced', 'ms', 'x '] },
    ],
    followUps: ['If you rebuilt it today, what would you change?', 'How did you test it?'],
    modelAnswer:
      'State the problem and who it served, your specific ownership, one real decision with its trade-off, the hardest technical challenge and how you solved it, and a measurable outcome.',
  },
];

export const INTERVIEW_ROUNDS: Record<
  string,
  { kind: InterviewQuestion['kind']; title: string }[]
> = {
  'product-sde': [
    { kind: 'dsa', title: 'Round 1 · Data structures & algorithms' },
    { kind: 'fundamentals', title: 'Round 2 · CS fundamentals' },
    { kind: 'behavioral', title: 'Round 3 · Behavioral' },
  ],
  'startup-fullstack': [
    { kind: 'dsa', title: 'Round 1 · Problem solving' },
    { kind: 'fundamentals', title: 'Round 2 · Systems & the web' },
    { kind: 'behavioral', title: 'Round 3 · Ownership' },
  ],
  'service-graduate': [
    { kind: 'fundamentals', title: 'Round 1 · Fundamentals' },
    { kind: 'dsa', title: 'Round 2 · Coding' },
    { kind: 'behavioral', title: 'Round 3 · HR' },
  ],
};
