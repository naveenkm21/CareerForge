import {
  CATEGORY_LABELS,
  runAlgorithm,
  structureKindsOf,
  type AlgorithmCategory,
  type AnyAlgorithm,
} from './define';
import type { Complexity, StructureKind } from './types';

import bubbleSort from './algorithms/sorting/bubble-sort';
import insertionSort from './algorithms/sorting/insertion-sort';
import linearSearch from './algorithms/searching/linear-search';
import binarySearch from './algorithms/searching/binary-search';
import twoPointers from './algorithms/arrays/two-pointers';
import slidingWindow from './algorithms/arrays/sliding-window';
import prefixSum from './algorithms/arrays/prefix-sum';
import validParentheses from './algorithms/stacks-queues/valid-parentheses';
import nextGreaterElement from './algorithms/stacks-queues/next-greater-element';
import bstInsert from './algorithms/trees/bst-insert';
import bstDelete from './algorithms/trees/bst-delete';
import inorderTraversal from './algorithms/trees/inorder-traversal';
import levelOrderTraversal from './algorithms/trees/level-order-traversal';
import heapPush from './algorithms/heaps/heap-push';
import bfs from './algorithms/graphs/bfs';
import dfs from './algorithms/graphs/dfs';
import dijkstra from './algorithms/graphs/dijkstra';
import topologicalSort from './algorithms/graphs/topological-sort';
import floodFill from './algorithms/graphs/flood-fill';
import coinChange from './algorithms/dp/coin-change';
import roundRobin from './algorithms/os/round-robin';
import lruPageReplacement from './algorithms/os/lru-page-replacement';
import httpLifecycle from './algorithms/networks/http-lifecycle';

/** Registration order is the gallery order within each category. */
const ALGORITHMS: AnyAlgorithm[] = [
  linearSearch,
  binarySearch,
  twoPointers,
  slidingWindow,
  prefixSum,
  bubbleSort,
  insertionSort,
  validParentheses,
  nextGreaterElement,
  bstInsert,
  bstDelete,
  inorderTraversal,
  levelOrderTraversal,
  heapPush,
  bfs,
  dfs,
  dijkstra,
  topologicalSort,
  floodFill,
  coinChange,
  roundRobin,
  lruPageReplacement,
  httpLifecycle,
];

const byId = new Map(ALGORITHMS.map((a) => [a.id, a]));
if (byId.size !== ALGORITHMS.length) throw new Error('Duplicate algorithm id in registry');

export type AlgorithmMeta = {
  id: string;
  title: string;
  category: AlgorithmCategory;
  categoryLabel: string;
  skillId: string;
  summary: string;
  difficulty: number;
  complexity: Complexity;
  structureKinds: StructureKind[];
};

export function getAlgorithm(id: string): AnyAlgorithm | undefined {
  return byId.get(id);
}

export function allAlgorithms(): readonly AnyAlgorithm[] {
  return ALGORITHMS;
}

const metaCache = new Map<string, AlgorithmMeta>();

/** Serializable metadata (structure kinds derived from a default run — pure and cheap). */
export function getAlgorithmMeta(id: string): AlgorithmMeta | undefined {
  const cached = metaCache.get(id);
  if (cached) return cached;
  const def = byId.get(id);
  if (!def) return undefined;
  const run = runAlgorithm(def, def.defaultInput);
  const meta: AlgorithmMeta = {
    id: def.id,
    title: def.title,
    category: def.category,
    categoryLabel: CATEGORY_LABELS[def.category as AlgorithmCategory],
    skillId: def.skillId,
    summary: def.summary,
    difficulty: def.difficulty,
    complexity: def.complexity,
    structureKinds: run.ok ? structureKindsOf(run.trace) : [],
  };
  metaCache.set(id, meta);
  return meta;
}

export function listAlgorithms(): AlgorithmMeta[] {
  return ALGORITHMS.map((a) => getAlgorithmMeta(a.id)!);
}
