import {
  MAX_STEPS,
  type ArrayState,
  type Checkpoint,
  type Emphasis,
  type FlowState,
  type GraphEdge,
  type GraphState,
  type Item,
  type Mark,
  type MatrixState,
  type Placement,
  type Point,
  type QueueState,
  type Scalar,
  type StackState,
  type Step,
  type StructureDecl,
  type StructureState,
  type TableState,
  type Tone,
  type TreeNode,
  type TreeState,
  type VarValue,
} from './types';

export class TraceLimitError extends Error {
  constructor(limit: number) {
    super(`Trace exceeded ${limit} steps. Use a smaller input.`);
    this.name = 'TraceLimitError';
  }
}

export class AuthoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthoringError';
  }
}

type DeclOpts = { label?: string; placement?: Placement };

const clone = <T>(v: T): T => structuredClone(v);

/**
 * Records a trace while an algorithm runs. Authors interleave recorder calls with ordinary code:
 *
 *   t.at('mid').vars({ lo, hi, mid }).say('…').step();
 *
 * Marks are sticky: a pointer keeps its position until moved or removed, cells keep their tone
 * until re-toned or cleared. `compare` marks are transient and vanish after one step.
 * Every `step()` captures a FULL snapshot of every structure (ADR-004).
 */
export class Recorder {
  readonly steps: Step[] = [];
  private readonly decls: StructureDecl[] = [];
  private readonly states = new Map<string, StructureState>();
  private readonly marks = new Map<string, Mark>();
  private readonly varState: Record<string, VarValue> = {};
  private pending: {
    anchor?: string;
    narration?: string;
    invariant?: string;
    checkpoint?: Checkpoint;
    emphasis?: Emphasis;
  } = {};

  constructor(private readonly maxSteps: number = MAX_STEPS) {}

  get structures(): StructureDecl[] {
    return this.decls;
  }

  // ── Structure declarations ────────────────────────────────────────────────

  private declare<S extends StructureState>(decl: StructureDecl, state: S): S {
    if (this.steps.length > 0) {
      throw new AuthoringError(
        `Declare structure "${decl.id}" before the first step so the stage layout is stable.`,
      );
    }
    if (this.states.has(decl.id))
      throw new AuthoringError(`Structure "${decl.id}" declared twice.`);
    this.decls.push(decl);
    this.states.set(decl.id, state);
    return state;
  }

  array(id: string, values: readonly Scalar[], opts: DeclOpts = {}): ArrayHandle {
    const state = this.declare<ArrayState>(
      { id, kind: 'array', ...opts },
      { kind: 'array', items: values.map((value, i) => ({ id: `${id}${i}`, value })) },
    );
    return new ArrayHandle(this, id, state);
  }

  matrix(
    id: string,
    cells: readonly (readonly Scalar[])[],
    opts: DeclOpts & { rowLabels?: string[]; colLabels?: string[] } = {},
  ): MatrixHandle {
    const rows = cells.length;
    const cols = cells[0]?.length ?? 0;
    const { rowLabels, colLabels, ...declOpts } = opts;
    const state = this.declare<MatrixState>(
      { id, kind: 'matrix', rows, cols, ...declOpts },
      {
        kind: 'matrix',
        cells: cells.map((r) => [...r]),
        ...(rowLabels ? { rowLabels } : {}),
        ...(colLabels ? { colLabels } : {}),
      },
    );
    return new MatrixHandle(this, id, state);
  }

  tree(id: string, opts: DeclOpts & { ordered?: boolean } = {}): TreeHandle {
    const { ordered = true, ...declOpts } = opts;
    const state = this.declare<TreeState>(
      { id, kind: 'tree', ordered, ...declOpts },
      { kind: 'tree', root: null, nodes: {} },
    );
    return new TreeHandle(this, id, state);
  }

  graph(
    id: string,
    spec: {
      nodes: { id: string; label?: string }[];
      edges: GraphEdge[];
      directed: boolean;
      weighted: boolean;
      layout: Record<string, Point>;
    },
    opts: DeclOpts = {},
  ): GraphHandle {
    const state = this.declare<GraphState>(
      {
        id,
        kind: 'graph',
        directed: spec.directed,
        weighted: spec.weighted,
        layout: spec.layout,
        ...opts,
      },
      {
        kind: 'graph',
        nodes: spec.nodes.map((n) => ({ id: n.id, label: n.label ?? n.id })),
        edges: spec.edges.map((e) => ({ ...e })),
        badges: {},
      },
    );
    return new GraphHandle(this, id, state, spec.directed);
  }

  stack(id: string, opts: DeclOpts = {}): StackHandle {
    const state = this.declare<StackState>(
      { id, kind: 'stack', ...opts },
      { kind: 'stack', items: [] },
    );
    return new StackHandle(this, id, state);
  }

  queue(id: string, opts: DeclOpts & { priority?: boolean } = {}): QueueHandle {
    const { priority = false, ...declOpts } = opts;
    const state = this.declare<QueueState>(
      { id, kind: 'queue', priority, ...declOpts },
      { kind: 'queue', items: [] },
    );
    return new QueueHandle(this, id, state, priority);
  }

  table(
    id: string,
    columns: string[],
    rows: { id: string; label: string; cells?: Scalar[] }[],
    opts: DeclOpts = {},
  ): TableHandle {
    const state = this.declare<TableState>(
      { id, kind: 'table', ...opts },
      {
        kind: 'table',
        columns: [...columns],
        rows: rows.map((r) => ({
          id: r.id,
          label: r.label,
          cells: r.cells ? [...r.cells] : columns.map(() => null),
        })),
      },
    );
    return new TableHandle(this, id, state);
  }

  flow(
    id: string,
    nodes: { id: string; label: string; sub?: string }[],
    opts: DeclOpts = {},
  ): FlowHandle {
    const state = this.declare<FlowState>(
      { id, kind: 'flow', ...opts },
      {
        kind: 'flow',
        nodes: nodes.map((n) => ({ ...n })),
        edges: nodes.slice(1).map((n, i) => ({ from: nodes[i]!.id, to: n.id })),
        messages: {},
      },
    );
    return new FlowHandle(this, id, state);
  }

  // ── Step builder ──────────────────────────────────────────────────────────

  at(anchor: string): this {
    this.pending.anchor = anchor;
    return this;
  }

  /** Merges into the sticky variable panel. `undefined` removes a variable. */
  vars(v: Record<string, VarValue | undefined>): this {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete this.varState[k];
      else this.varState[k] = Array.isArray(val) ? [...val] : val;
    }
    return this;
  }

  say(narration: string): this {
    this.pending.narration = narration;
    return this;
  }

  invariant(text: string): this {
    this.pending.invariant = text;
    return this;
  }

  ask(checkpoint: Checkpoint): this {
    this.pending.checkpoint = checkpoint;
    return this;
  }

  emphasis(e: Emphasis): this {
    this.pending.emphasis = e;
    return this;
  }

  step(): void {
    const { anchor, narration = '', invariant, checkpoint, emphasis = 'normal' } = this.pending;
    if (!anchor)
      throw new AuthoringError(`Step ${this.steps.length} has no anchor; call t.at('name') first.`);
    if (this.steps.length >= this.maxSteps) throw new TraceLimitError(this.maxSteps);
    const snapshot: Record<string, StructureState> = {};
    for (const [id, s] of this.states) snapshot[id] = clone(s);
    const step: Step = {
      i: this.steps.length,
      anchor,
      snapshot,
      marks: [...this.marks.values()].map((m) => ({ ...m })),
      vars: clone(this.varState),
      narration,
      emphasis,
    };
    if (invariant) step.invariant = invariant;
    if (checkpoint) step.checkpoint = clone(checkpoint);
    this.steps.push(step);
    this.pending = {};
    for (const [k, m] of this.marks) if (m.type === 'compare') this.marks.delete(k);
  }

  /** Removes every mark, or only those on one structure. */
  clearMarks(struct?: string): this {
    for (const [k, m] of this.marks) if (!struct || m.struct === struct) this.marks.delete(k);
    return this;
  }

  // ── Internal API for handles ──────────────────────────────────────────────

  /** @internal */
  setMark(key: string, mark: Mark): void {
    this.marks.delete(key); // re-insert so later marks paint on top
    this.marks.set(key, mark);
  }

  /** @internal */
  deleteMark(key: string): void {
    this.marks.delete(key);
  }

  /** @internal */
  deleteMarksWhere(pred: (m: Mark) => boolean): void {
    for (const [k, m] of this.marks) if (pred(m)) this.marks.delete(k);
  }
}

// ── Handles ─────────────────────────────────────────────────────────────────

abstract class Handle {
  constructor(
    protected readonly t: Recorder,
    readonly id: string,
  ) {}

  protected key(kind: string, suffix: string | number): string {
    return `${kind}:${this.id}:${suffix}`;
  }

  pointer(label: string, at: number | string, tone: Tone = 'active'): this {
    this.t.setMark(this.key('p', label), { type: 'pointer', struct: this.id, at, label, tone });
    return this;
  }

  unpointer(label: string): this {
    this.t.deleteMark(this.key('p', label));
    return this;
  }

  clearMarks(): this {
    this.t.clearMarks(this.id);
    return this;
  }
}

export class ArrayHandle extends Handle {
  private counter: number;

  constructor(
    t: Recorder,
    id: string,
    private readonly state: ArrayState,
  ) {
    super(t, id);
    this.counter = state.items.length;
  }

  get length(): number {
    return this.state.items.length;
  }

  values(): Scalar[] {
    return this.state.items.map((it) => it.value);
  }

  get(i: number): Scalar {
    return this.item(i).value;
  }

  private item(i: number): Item {
    const it = this.state.items[i];
    if (!it) throw new AuthoringError(`${this.id}[${i}] is out of bounds (length ${this.length}).`);
    return it;
  }

  set(i: number, value: Scalar): this {
    this.item(i).value = value;
    return this;
  }

  /** Swaps items (with their identities), so the renderer animates the move. */
  swap(i: number, j: number): this {
    const a = this.item(i);
    const b = this.item(j);
    this.state.items[i] = b;
    this.state.items[j] = a;
    return this;
  }

  push(value: Scalar): this {
    this.state.items.push({ id: `${this.id}${this.counter++}`, value });
    return this;
  }

  range(from: number, to: number, tone: Tone, key: string = tone): this {
    if (from > to) return this.unrange(key);
    this.t.setMark(this.key('r', key), { type: 'range', struct: this.id, from, to, tone, key });
    return this;
  }

  unrange(key: string): this {
    this.t.deleteMark(this.key('r', key));
    return this;
  }

  cell(i: number, tone: Tone): this {
    this.t.setMark(this.key('c', i), { type: 'cell', struct: this.id, at: i, tone });
    return this;
  }

  cells(indices: Iterable<number>, tone: Tone): this {
    for (const i of indices) this.cell(i, tone);
    return this;
  }

  uncell(i: number): this {
    this.t.deleteMark(this.key('c', i));
    return this;
  }

  compare(a: number, b: number): this {
    this.t.setMark(this.key('x', 'cmp'), { type: 'compare', struct: this.id, a, b });
    return this;
  }
}

export class MatrixHandle extends Handle {
  constructor(
    t: Recorder,
    id: string,
    private readonly state: MatrixState,
  ) {
    super(t, id);
  }

  get rows(): number {
    return this.state.cells.length;
  }

  get cols(): number {
    return this.state.cells[0]?.length ?? 0;
  }

  get(r: number, c: number): Scalar {
    const row = this.state.cells[r];
    if (!row || c < 0 || c >= row.length)
      throw new AuthoringError(`${this.id}[${r}][${c}] is out of bounds.`);
    return row[c]!;
  }

  set(r: number, c: number, value: Scalar): this {
    this.get(r, c);
    this.state.cells[r]![c] = value;
    return this;
  }

  cell(r: number, c: number, tone: Tone): this {
    this.t.setMark(this.key('c', `${r},${c}`), {
      type: 'cell',
      struct: this.id,
      at: `${r},${c}`,
      tone,
    });
    return this;
  }

  uncell(r: number, c: number): this {
    this.t.deleteMark(this.key('c', `${r},${c}`));
    return this;
  }

  pointAt(label: string, r: number, c: number, tone: Tone = 'active'): this {
    return this.pointer(label, `${r},${c}`, tone);
  }
}

export class TreeHandle extends Handle {
  private counter = 0;

  constructor(
    t: Recorder,
    id: string,
    private readonly state: TreeState,
  ) {
    super(t, id);
  }

  get root(): string | null {
    return this.state.root;
  }

  node(nodeId: string): TreeNode {
    const n = this.state.nodes[nodeId];
    if (!n) throw new AuthoringError(`Tree "${this.id}" has no node "${nodeId}".`);
    return n;
  }

  has(nodeId: string | null): nodeId is string {
    return nodeId !== null && nodeId in this.state.nodes;
  }

  /** Creates a detached node and returns its id. */
  add(value: Scalar): string {
    const nodeId = `n${this.counter++}`;
    this.state.nodes[nodeId] = { id: nodeId, value, left: null, right: null };
    return nodeId;
  }

  setRoot(nodeId: string | null): this {
    if (nodeId !== null) this.node(nodeId);
    this.state.root = nodeId;
    return this;
  }

  setLeft(parent: string, child: string | null): this {
    if (child !== null) this.node(child);
    this.node(parent).left = child;
    return this;
  }

  setRight(parent: string, child: string | null): this {
    if (child !== null) this.node(child);
    this.node(parent).right = child;
    return this;
  }

  setValue(nodeId: string, value: Scalar): this {
    this.node(nodeId).value = value;
    return this;
  }

  /** Deletes a node record and every mark that refers to it. Unlinking is the author's job. */
  remove(nodeId: string): this {
    this.node(nodeId);
    delete this.state.nodes[nodeId];
    this.t.deleteMarksWhere(
      (m) =>
        m.struct === this.id &&
        ((m.type !== 'edge' && m.type !== 'compare' && m.type !== 'range' && m.at === nodeId) ||
          (m.type === 'edge' && (m.from === nodeId || m.to === nodeId))),
    );
    return this;
  }

  cell(nodeId: string, tone: Tone): this {
    this.t.setMark(this.key('c', nodeId), { type: 'cell', struct: this.id, at: nodeId, tone });
    return this;
  }

  uncell(nodeId: string): this {
    this.t.deleteMark(this.key('c', nodeId));
    return this;
  }

  edge(from: string, to: string, tone: Tone): this {
    this.t.setMark(this.key('e', `${from}->${to}`), {
      type: 'edge',
      struct: this.id,
      from,
      to,
      tone,
    });
    return this;
  }

  unedge(from: string, to: string): this {
    this.t.deleteMark(this.key('e', `${from}->${to}`));
    return this;
  }
}

export class GraphHandle extends Handle {
  constructor(
    t: Recorder,
    id: string,
    private readonly state: GraphState,
    readonly directed: boolean,
  ) {
    super(t, id);
  }

  get nodeIds(): string[] {
    return this.state.nodes.map((n) => n.id);
  }

  /** Outgoing neighbours in edge-declaration order (both directions when undirected). */
  neighbors(u: string): { to: string; weight: number }[] {
    const out: { to: string; weight: number }[] = [];
    for (const e of this.state.edges) {
      if (e.from === u) out.push({ to: e.to, weight: e.weight ?? 1 });
      else if (!this.directed && e.to === u) out.push({ to: e.from, weight: e.weight ?? 1 });
    }
    return out;
  }

  badge(nodeId: string, text: string | null): this {
    if (text === null) delete this.state.badges[nodeId];
    else this.state.badges[nodeId] = text;
    return this;
  }

  cell(nodeId: string, tone: Tone): this {
    this.t.setMark(this.key('c', nodeId), { type: 'cell', struct: this.id, at: nodeId, tone });
    return this;
  }

  uncell(nodeId: string): this {
    this.t.deleteMark(this.key('c', nodeId));
    return this;
  }

  private edgeKey(from: string, to: string): string {
    if (this.directed) return `${from}->${to}`;
    return from < to ? `${from}--${to}` : `${to}--${from}`;
  }

  edge(from: string, to: string, tone: Tone): this {
    this.t.setMark(this.key('e', this.edgeKey(from, to)), {
      type: 'edge',
      struct: this.id,
      from,
      to,
      tone,
    });
    return this;
  }

  unedge(from: string, to: string): this {
    this.t.deleteMark(this.key('e', this.edgeKey(from, to)));
    return this;
  }
}

export class StackHandle extends Handle {
  private counter = 0;

  constructor(
    t: Recorder,
    id: string,
    private readonly state: StackState,
  ) {
    super(t, id);
  }

  get size(): number {
    return this.state.items.length;
  }

  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  /** Top of stack (last item) or undefined. */
  peek(): Item | undefined {
    return this.state.items[this.state.items.length - 1];
  }

  push(value: Scalar, note?: string): string {
    const itemId = `${this.id}${this.counter++}`;
    this.state.items.push(note === undefined ? { id: itemId, value } : { id: itemId, value, note });
    return itemId;
  }

  /** Current contents, bottom first (copies). */
  items(): Item[] {
    return this.state.items.map((it) => ({ ...it }));
  }

  pop(): Item {
    const it = this.state.items.pop();
    if (!it) throw new AuthoringError(`pop() on empty stack "${this.id}".`);
    this.t.deleteMarksWhere(
      (m) =>
        m.struct === this.id &&
        m.type !== 'edge' &&
        m.type !== 'compare' &&
        m.type !== 'range' &&
        m.at === it.id,
    );
    return it;
  }

  cell(itemId: string, tone: Tone): this {
    this.t.setMark(this.key('c', itemId), { type: 'cell', struct: this.id, at: itemId, tone });
    return this;
  }
}

export class QueueHandle extends Handle {
  private counter = 0;
  private readonly priorities = new Map<string, number>();

  constructor(
    t: Recorder,
    id: string,
    private readonly state: QueueState,
    private readonly isPriority: boolean,
  ) {
    super(t, id);
  }

  get size(): number {
    return this.state.items.length;
  }

  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  front(): Item | undefined {
    return this.state.items[0];
  }

  /** Current contents, front first (copies). */
  items(): Item[] {
    return this.state.items.map((it) => ({ ...it }));
  }

  private newItem(value: Scalar, note?: string): Item {
    const itemId = `${this.id}${this.counter++}`;
    return note === undefined ? { id: itemId, value } : { id: itemId, value, note };
  }

  enqueue(value: Scalar, note?: string): string {
    if (this.isPriority)
      throw new AuthoringError(`Use push(value, priority) on priority queue "${this.id}".`);
    const it = this.newItem(value, note);
    this.state.items.push(it);
    return it.id;
  }

  /** Priority insert: stable, lowest priority first. The note defaults to the priority. */
  push(value: Scalar, priority: number, note: string = String(priority)): string {
    if (!this.isPriority)
      throw new AuthoringError(`push() is for priority queues; use enqueue() on "${this.id}".`);
    const it = this.newItem(value, note);
    this.priorities.set(it.id, priority);
    let at = this.state.items.length;
    while (at > 0 && this.priorities.get(this.state.items[at - 1]!.id)! > priority) at--;
    this.state.items.splice(at, 0, it);
    return it.id;
  }

  /** Removes a specific item (e.g. to move it to the back, as LRU does). */
  remove(itemId: string): Item {
    const i = this.state.items.findIndex((it) => it.id === itemId);
    if (i < 0) throw new AuthoringError(`Queue "${this.id}" has no item "${itemId}".`);
    const [it] = this.state.items.splice(i, 1);
    this.priorities.delete(itemId);
    this.t.deleteMarksWhere(
      (m) => m.struct === this.id && (m.type === 'cell' || m.type === 'pointer') && m.at === itemId,
    );
    return it!;
  }

  /** Removes the front item (the minimum, for a priority queue). */
  dequeue(): Item & { priority?: number } {
    const it = this.state.items.shift();
    if (!it) throw new AuthoringError(`dequeue() on empty queue "${this.id}".`);
    this.t.deleteMarksWhere(
      (m) =>
        m.struct === this.id &&
        m.type !== 'edge' &&
        m.type !== 'compare' &&
        m.type !== 'range' &&
        m.at === it.id,
    );
    const priority = this.priorities.get(it.id);
    this.priorities.delete(it.id);
    return priority === undefined ? it : { ...it, priority };
  }

  cell(itemId: string, tone: Tone): this {
    this.t.setMark(this.key('c', itemId), { type: 'cell', struct: this.id, at: itemId, tone });
    return this;
  }
}

export class TableHandle extends Handle {
  constructor(
    t: Recorder,
    id: string,
    private readonly state: TableState,
  ) {
    super(t, id);
  }

  private row(rowId: string) {
    const r = this.state.rows.find((x) => x.id === rowId);
    if (!r) throw new AuthoringError(`Table "${this.id}" has no row "${rowId}".`);
    return r;
  }

  get(rowId: string, col: number): Scalar {
    const r = this.row(rowId);
    if (col < 0 || col >= r.cells.length)
      throw new AuthoringError(`Table "${this.id}" column ${col} out of bounds.`);
    return r.cells[col]!;
  }

  set(rowId: string, col: number, value: Scalar): this {
    this.get(rowId, col);
    this.row(rowId).cells[col] = value;
    return this;
  }

  cell(rowId: string, col: number, tone: Tone): this {
    this.t.setMark(this.key('c', `${rowId},${col}`), {
      type: 'cell',
      struct: this.id,
      at: `${rowId},${col}`,
      tone,
    });
    return this;
  }

  uncell(rowId: string, col: number): this {
    this.t.deleteMark(this.key('c', `${rowId},${col}`));
    return this;
  }

  /** Marks a whole column (every row) with a tone. */
  column(col: number, tone: Tone): this {
    for (const r of this.state.rows) this.cell(r.id, col, tone);
    return this;
  }
}

export class FlowHandle extends Handle {
  constructor(
    t: Recorder,
    id: string,
    private readonly state: FlowState,
  ) {
    super(t, id);
  }

  cell(nodeId: string, tone: Tone): this {
    this.t.setMark(this.key('c', nodeId), { type: 'cell', struct: this.id, at: nodeId, tone });
    return this;
  }

  /** Shows a message on the edge between two stages (null clears it) and tones the edge. */
  send(from: string, to: string, message: string | null, tone: Tone = 'active'): this {
    const k = `${from}->${to}`;
    if (message === null) {
      delete this.state.messages[k];
      this.t.deleteMark(this.key('e', k));
    } else {
      this.state.messages[k] = message;
      this.t.setMark(this.key('e', k), { type: 'edge', struct: this.id, from, to, tone });
    }
    return this;
  }

  sub(nodeId: string, text: string): this {
    const n = this.state.nodes.find((x) => x.id === nodeId);
    if (!n) throw new AuthoringError(`Flow "${this.id}" has no stage "${nodeId}".`);
    n.sub = text;
    return this;
  }
}
