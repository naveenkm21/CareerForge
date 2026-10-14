# 07 — Architecture Decision Record

Short, dated, and revisitable. Each entry states what was decided, why, and what would make us
change our mind.

---

### ADR-001 — Evidence is an append-only event log; all scores are projections
**Status:** accepted · 2026-09-21

Mastery, readiness, XP, streaks, and badges are derived from `evidence_events` and `xp_ledger`,
which are never updated or deleted.

**Why:** the scoring formula will change repeatedly. Without the log, historical scores become
incomparable and the product's core promise ("every number has evidence") is unenforceable.
Replay also gives us free rubric versioning and safe nightly recomputation.

**Cost:** a projector to maintain and a large table to index. Accepted.

**Would reconsider if:** event volume exceeded what a single Postgres could index — at which
point the fix is partitioning, not abandoning the pattern.

---

### ADR-002 — One Next.js app plus a small stateful gateway; no NestJS
**Status:** accepted · 2026-09-21

`apps/web` serves all HTTP/RSC. `apps/gateway` (Fastify + Socket.IO + BullMQ) handles only
websockets, background jobs, and long-running streams.

**Why:** a second full backend adds a deploy, an auth integration, a validation layer, and a
network hop per read, and buys nothing at this team size. The genuine need is for *stateful*
work that Vercel handles badly — which is what the gateway is scoped to.

**Would reconsider if:** a public third-party API or a second consuming client appears. The
gateway is the growth path.

---

### ADR-003 — Algorithm traces are computed, never stored
**Status:** accepted · 2026-09-21

`packages/viz` is pure TypeScript shipped to the browser. Traces are generated on demand from
the reference implementation.

**Why:** zero storage, zero latency, instant re-run on user-edited input, and trace changes ship
with code rather than requiring a data migration. Pedagogical input sizes make this trivially
cheap.

**Would reconsider if:** an algorithm needed inputs large enough to be slow in-browser — then
that specific algorithm gets a server-side cached trace. The interface already allows it.

---

### ADR-004 — Full state snapshots per step, not diffs
**Status:** accepted · 2026-09-21

**Why:** O(1) backward scrubbing and step-jumping, half the code, and an entire class of
inverse-operation bugs eliminated. Traces are capped (500 steps, small structures) and never
persisted, so the memory cost is irrelevant.

---

### ADR-005 — Line anchors map one trace to four language sources
**Status:** accepted · 2026-09-21

Reference code in C++/Java/Python/TS is annotated with `// @anchor` comments stripped at build
time; steps reference anchors, not line numbers.

**Why:** it delivers the side-by-side visual-debugger experience in any language without
executing that language, and refactoring the displayed code cannot desynchronize the animation.

---

### ADR-006 — The LLM never produces a number
**Status:** accepted · 2026-09-21

LLMs generate language and qualitative rubric judgments. Those judgments enter the system as
weighted *evidence*. All aggregation is deterministic code.

**Why:** LLM-generated scores are non-reproducible, non-explainable, drift with model updates,
and cannot be recomputed historically. They would break ADR-001 and the product's main claim.

**This one is permanent.** If it is ever violated, the readiness score is worthless.

---

### ADR-007 — Renderers are per structure kind, not per algorithm
**Status:** accepted · 2026-09-21

Eight renderers (array, matrix, list, tree, graph, stack/queue, table, flow) serve the entire
curriculum.

**Why:** it turns "visualize 45 algorithms" from 45 UI projects into 8 UI projects plus 45
small pure functions. This ratio is the only reason the scope is achievable.

---

### ADR-008 — Skills form a tree for navigation and a DAG for prerequisites
**Status:** accepted · 2026-09-21

`skills.parent_id` is the taxonomy tree; `skill_edges` is the prerequisite DAG. They are
separate.

**Why:** *Heaps* is a child of *Data Structures* but a prerequisite of *Dijkstra*. Collapsing
the two relationships makes both the roadmap and the "weakest prerequisite" recommendation wrong.

---

### ADR-009 — The planner is deterministic; the LLM only narrates
**Status:** accepted · 2026-09-21

Plan item selection, ordering, and reasoning use gap × weight, prerequisite unblocking, decay
review, topological ordering, and time-budget fitting. Every item carries an enum `reason_code`.

**Why:** free, instant, reproducible, testable, and honestly explainable. An LLM planner is
slower, costs money per view, and cannot justify itself consistently.

---

### ADR-010 — Code execution is isolated in a separate service with no network
**Status:** accepted · 2026-09-21

Judge0 CE in Docker on a dedicated host, `network_mode: none`, CPU/memory/process caps, output
truncation, Redis-enforced per-user concurrency and rate limits.

**Why:** running untrusted code anywhere near the app process or database is the single largest
security risk in this product.

---

### ADR-011 — Visualizing the user's own submitted code is out of scope
**Status:** accepted · 2026-09-21

The judge determines correctness. Visualization always comes from the curated reference
implementation.

**Why:** instrumenting arbitrary C++/Java to produce reliable traces is a larger project than
everything else in this repo combined.

**Would reconsider if:** Python-only tracing (via `sys.settrace` in the sandbox) proves cheap
after v1. It is the natural first extension.

---

### ADR-012 — React Flow for the roadmap, hand-rolled SVG for algorithm animation
**Status:** accepted · 2026-09-21

**Why:** React Flow is an excellent node-editor and a poor animation surface. Algorithm
animation needs precise frame-driven control over every cell and edge. d3 is used for layout
mathematics only; React owns the DOM.

---

### ADR-013 — pgvector instead of a dedicated vector database
**Status:** accepted · 2026-09-21

Resume and job-description embeddings live in Postgres.

**Why:** one datastore, transactional consistency with the rows they describe, and the corpus
size (thousands of jobs, not millions) is far below where a specialized store pays off.
