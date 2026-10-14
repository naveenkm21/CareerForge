# CareerForge

**AI-powered career development & job-readiness platform.**
One platform to learn, practice, track, and prove your job readiness.

> The identity of the product: **Code → See → Understand → Solve**

A user declares a target role. CareerForge measures where they actually are, then drives a
continuously adapting loop: visual learning → active practice → measured evidence → interview
proof → job applications. Every number in the product traces back to a logged, graded event.

---

## Design documents

Read in order. Nothing gets built before these are agreed.

| Doc                                                          | Contents                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [00 — Product Spec](docs/00-product-spec.md)                 | What it is, what makes it defensible, the 8-stage ladder, explicit non-goals     |
| [01 — Architecture](docs/01-architecture.md)                 | Deployables, monorepo layout, request paths, stack changes & additions, security |
| [02 — Data Model](docs/02-data-model.md)                     | Domain map, every table, the append-only evidence log, invariants                |
| [03 — Visualization Engine](docs/03-visualization-engine.md) | Trace types, authoring API, line anchors, renderers, interactive mode            |
| [04 — Scoring Engine](docs/04-scoring-engine.md)             | Mastery math, decay, prereq gating, readiness composite, the planner             |
| [05 — AI Layer & Execution](docs/05-ai-layer.md)             | The six sanctioned AI jobs, guardrails, the code judge                           |
| [06 — Build Plan](docs/06-build-plan.md)                     | 12 phases as vertical slices, each with a hard exit criterion                    |
| [07 — Decisions (ADR)](docs/07-decisions.md)                 | 13 decisions with rationale and reversal conditions                              |
| [08 — Risks & Open Questions](docs/08-risks.md)              | What will actually go wrong, and what still needs deciding                       |
| [09 — v1 Schedule](docs/09-v1-schedule.md)                   | The resolved 8-week plan, $0 infra topology, week-by-week, demo script           |
| [10 — Build Log](docs/10-build-log.md)                       | What each of the 12 phases delivers, simplifications, what needs real accounts   |
| [11 — Demo Script](docs/11-demo-script.md)                   | A 10-minute presentation walkthrough and likely questions                        |

---

## The three load-bearing ideas

**1. One trace, six features.** Each algorithm is authored once as an instrumented reference
implementation that emits a step trace. Animation, code highlighting, scrubbing, interactive
"predict the next step" checkpoints, admin previews, and harvested assessment questions are all
pure functions of that trace. _(ADR-003, ADR-005)_

**2. Evidence is the source of truth.** `evidence_events` is append-only. Mastery, readiness,
XP, and streaks are projections that can be dropped and rebuilt. This is what makes
`/explain/readiness` — drilling from `74%` to an individual failed submission — a real feature
rather than a marketing claim. _(ADR-001)_

**3. The LLM never produces a number.** It generates language and qualitative rubric
judgments; those enter as weighted evidence. Every score, ordering, and recommendation is
deterministic code. _(ADR-006)_

---

## Stack

```
Next.js 15 · TypeScript (strict) · Tailwind · shadcn/ui · motion · Monaco · React Flow
PostgreSQL + pgvector · Drizzle · Redis · BullMQ · Socket.IO · Clerk
Judge0 (isolated Docker) · LLM API + embeddings
Turborepo · Vitest · Playwright · GitHub Actions · Vercel + Render/Fly + Neon
```

Three deployables: `apps/web` (Next.js), `apps/gateway` (stateful: sockets + jobs),
`apps/runner` (sandboxed code execution). See [01 — Architecture](docs/01-architecture.md) for
what changed from the original stack proposal and why.

---

## Status

**All 12 phases built and demoable locally.** Visual engine (23 algorithms, 8 renderers), the
8-stage lesson ladder, judged practice in four languages, the evidence-backed scoring engine with
`/explain` drill-down, a deterministic planner, career intelligence, mock interviews, social and
battles, and an admin CMS with analytics. See [10 — Build Log](docs/10-build-log.md) for what each
phase delivers and what still needs real accounts, and [11 — Demo Script](docs/11-demo-script.md)
for the presentation.

---

## Local setup (≈ 5 minutes)

Requires Node 22 and pnpm 11. Docker is optional: local development uses an embedded Postgres.
For real code verdicts locally you need the toolchains you want to judge (g++, javac, python, node).

```bash
pnpm install
```

```bash
cp .env.example apps/web/.env.local
```

```bash
pnpm db:setup
```

```bash
pnpm db:demo
```

```bash
pnpm dev
```

Open http://localhost:3000/sign-in and sign in with **demo@careerforge.test** (no password —
local dev sign-in). That account has 24 days of history, an interview, a battle, a resume and
applications, and is an admin. Any other email creates a fresh, empty account.

`pnpm db:setup` migrates and seeds; `pnpm db:demo` adds the demo learner and five peers. Run
both with the dev server stopped — the embedded database is single-process, and a hard-killed
server can corrupt it: `pnpm db:reset && pnpm db:demo` rebuilds everything in seconds. For long
sessions prefer Docker Postgres: `pnpm db:up` and set
`DATABASE_URL=postgres://careerforge:careerforge@localhost:5432/careerforge`.

| Command            | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `pnpm test`        | 333 unit, invariant, golden-trace, property and judge tests    |
| `pnpm typecheck`   | Strict TypeScript across every package                         |
| `pnpm lint`        | ESLint, including the pure-package import rules                |
| `pnpm codegen`     | Rebuild the anchor index after editing `packages/viz/sources`  |
| `pnpm db:generate` | Create a migration after editing `packages/db/src/schema-*.ts` |
| `pnpm db:reset`    | Move the embedded database aside and rebuild it                |

## Repository

```text
apps/web            Next.js 15 — every surface: learn, practice, explain, career, interview, community, admin
apps/gateway        Fastify service for stateful work (sockets, jobs) — health endpoint today
packages/viz        PURE trace engine: recorder, 23 algorithms, invariants, anchor codegen
packages/viz-react  Eight renderers by structure kind + the trace player
packages/core       PURE domain logic: mastery, decay, gating, readiness, planner, XP, badges, career scoring
packages/db         Drizzle schema, migrations (incl. append-only triggers), repositories, seeds, demo
packages/content    Curriculum: 29 judged problems, 19 topics, 40 questions, jobs, interview bank
packages/judge      Code judge: Judge0 in production, local toolchains for development
packages/ai         Claude-backed rubric judge with a deterministic fixture fallback (levels only)
packages/auth       Vendor facade: Clerk in production, signed-cookie dev provider locally
packages/contracts  Zod schemas shared by forms, server actions and content files
packages/ui         Design tokens + primitives
content/            Skills DAG, four roles, feature flags (YAML, versioned)
infra/vm            Oracle VM compose: Caddy + gateway + Redis
```
