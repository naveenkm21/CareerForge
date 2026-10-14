# 01 — System Architecture

## 1. Shape of the system

Three deployables, one repo, one language.

```text
                         ┌──────────────────────────────┐
                         │          BROWSER             │
                         │  Next.js RSC + client islands│
                         └───────┬──────────────┬───────┘
                        HTTP/RSC │              │ WebSocket
                                 ▼              ▼
              ┌───────────────────────┐   ┌──────────────────────┐
              │  apps/web             │   │  apps/gateway        │
              │  Next.js 15 (Vercel)  │   │  Fastify + Socket.IO │
              │                       │   │  + BullMQ workers    │
              │  • route handlers     │   │  (Render / Fly)      │
              │  • server actions     │   │                      │
              │  • RSC data loading   │   │  • battles, presence │
              │  • auth middleware    │   │  • live leaderboard  │
              │                       │   │  • background jobs   │
              └───────┬───────────────┘   └──────┬───────────────┘
                      │                          │
                      └───────────┬──────────────┘
                                  ▼
        ┌──────────────┬──────────────┬──────────────┬─────────────┐
        │  PostgreSQL  │    Redis     │  Object      │ apps/runner │
        │  + pgvector  │  (Upstash)   │  store (R2)  │  Judge0     │
        │  (Neon)      │              │              │  isolated,  │
        │  Drizzle ORM │  cache,      │  resumes,    │  no network │
        │  source of   │  ZSET boards,│  avatars,    │             │
        │  truth       │  rate limit, │  exports     │             │
        │              │  job queue   │              │             │
        └──────────────┴──────────────┴──────────────┴─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────────┐
                    │ External: LLM API, embeddings │
                    │ Clerk, job data API, email    │
                    └───────────────────────────────┘
```

### Why not a separate NestJS backend

The proposed stack had Next.js *and* NestJS. I'm recommending against it for this build:

- Next.js route handlers + server actions already give typed, colocated, auth-aware endpoints.
- Two backends means two deploys, two auth integrations, two validation layers, and a network hop on every read.
- NestJS earns its keep when multiple teams own separate modules. That is not this project.
- **Every genuine reason to run a second process is stateful**: websockets, background jobs, long-running AI streams. Vercel is bad at exactly those. So the second process is `apps/gateway`, scoped to only those — roughly 5% of the code.

If the project ever needs a public API for third parties, `apps/gateway` grows into it. That is the escape hatch.

## 2. Monorepo layout

```text
careerforge/
├─ apps/
│  ├─ web/                 Next.js 15 App Router — all UI + HTTP API
│  ├─ gateway/             Fastify + Socket.IO + BullMQ (stateful only)
│  └─ runner/              Judge0 docker-compose + thin auth proxy
├─ packages/
│  ├─ db/                  Drizzle schema, migrations, typed client, seeds
│  ├─ core/                PURE domain logic. Zero IO. Heavily unit-tested.
│  │                       mastery - readiness - planner - xp - streaks - gating
│  ├─ viz/                 PURE algorithm trace engine. No React, no DOM.
│  ├─ viz-react/           SVG/Canvas renderers that consume a Trace
│  ├─ contracts/           Zod schemas shared by client, server, and LLM output
│  ├─ ai/                  LLM client, prompt modules, validation, cost ledger
│  ├─ auth/                Clerk facade — keeps the vendor swappable
│  ├─ ui/                  shadcn/ui components + design tokens
│  └─ config/              eslint, tsconfig, tailwind presets
├─ content/                Versioned curriculum seed data (YAML/MDX)
├─ docs/                   These documents
└─ turbo.json, pnpm-workspace.yaml
```

### The two rules that keep this clean

1. **`packages/core` and `packages/viz` may not import anything that does IO.** No db, no fetch, no React. They are pure functions over plain data. This is what makes the scoring engine and the visual engine testable in milliseconds and recomputable offline.
2. **`packages/db` is the only place that knows SQL.** Apps call repository functions; raw Drizzle queries never get scattered through route handlers.

## 3. Request paths

| Path type | Mechanism | Example |
|---|---|---|
| Page data | RSC — direct repository call, no HTTP | Dashboard loads readiness snapshot |
| Mutation from UI | Server Action + Zod + auth guard | Mark lesson complete |
| Client-polled / third-party | Route handler `/api/v1/*` | Judge callback, job sync |
| Realtime | Socket.IO rooms via gateway | Battle scoreboard, presence |
| Long-running | BullMQ job on gateway | Resume parse, job re-match, nightly recompute |
| Streaming AI | Route handler returning `ReadableStream` (Node runtime) | Mock interview turn |

## 4. Rendering strategy

- **Server Components by default** — dashboard, roadmap, lesson shell, job lists.
- **Client islands only where interaction demands it** — the trace player, Monaco, the React Flow roadmap, the battle screen.
- Monaco and the renderers are **dynamically imported**. They must never land in the initial bundle.
- The trace for a lesson is **computed in the browser** from `packages/viz` — a pure function, sub-millisecond at pedagogical input sizes. No DB round-trip, no stored frames, and instant re-run when the user edits the input. See `03-visualization-engine.md`.

## 5. Tech stack — confirmed, changed, added

### Confirmed
Next.js 15 · TypeScript (strict) · Tailwind · shadcn/ui · PostgreSQL · Drizzle · Clerk · Redis · Socket.IO · Monaco · Vercel · Docker · GitHub Actions

### Changed from the original proposal

| Original | Decision | Reason |
|---|---|---|
| NestJS/Express backend | **Dropped.** Next route handlers + small Fastify gateway | One deploy, one auth layer, no extra hop. See §1. |
| React Flow for algorithm animation | **Re-scoped.** React Flow only for the roadmap / skill-tree UI | React Flow is a node *editor*. Algorithm animation needs precise, frame-driven SVG. Use `motion` for transitions. |
| D3 for rendering | **Re-scoped.** d3 for *layout math only* (`d3-hierarchy`, `d3-scale`, `d3-force`) | React owns the DOM; d3 owning it too causes reconciliation bugs. d3 computes coordinates, React draws them. |
| "LLM API" as a generic layer | **Constrained.** LLM confined to six named jobs, all Zod-validated, all metered | See `05-ai-layer.md`. Prevents the product from becoming a thin wrapper. |

### Added (missing from the original, but required)

| Addition | Why |
|---|---|
| **Judge0 / Piston in isolated Docker** | Code execution can never touch the app process. Network off, rlimits, seccomp. |
| **pgvector** | Embeddings for JD→skill mapping and resume matching. No separate vector DB needed at this scale. |
| **BullMQ** | Resume parsing, nightly recompute, job sync, email — all must be off the request path. |
| **Zod contracts package** | One schema shared by form validation, API validation, and LLM structured output. |
| **Vitest + Playwright** | `core` and `viz` are pure — they should carry hundreds of fast unit tests. Playwright for the five critical flows. |
| **Sentry + PostHog** | Drop-off analytics is a *product requirement* (the admin analytics screen), not an afterthought. |
| **DB-backed feature flags** | Twelve phases shipping into one production app requires dark launches. |

## 6. Environments

| Env | Web | DB | Runner | Purpose |
|---|---|---|---|---|
| local | `pnpm dev` | Docker Postgres | Docker Judge0 | Development |
| preview | Vercel preview | Neon branch per PR | shared staging runner | PR review |
| production | Vercel | Neon primary | dedicated runner | Live |

Neon database branching per PR is what makes the migration-heavy phases safe.

## 7. Security posture

- **Code execution** — separate host, no egress, 2s CPU / 256MB / 64 proc limits, capped output, per-user rate limits in Redis.
- **Authorization** — every repository function takes an actor; row-level checks live in `core`, not in the UI. Admin routes sit behind a role claim that is re-checked server-side.
- **LLM injection** — resume and job-description text is *data*. It never goes into an instruction position; it goes into a delimited block with a required output schema, and the parsed output is validated before it reaches the DB.
- **PII** — resumes in private object storage behind signed URLs, deletable, never sent to the LLM without an explicit user action.
- **Rate limits** — per-user token buckets in Redis on judge, AI, and auth-adjacent routes.

## 8. Observability

- Structured logs carrying request id + user id, shipped to one place.
- `ai_usage` table: tokens, cost, latency, model, purpose, and outcome for every LLM call.
- Product funnel events to PostHog: lesson start/complete, stage drop-off, submission outcome, plan adherence. The admin analytics screen reads our own tables, not PostHog.
- `/api/health` checks db, redis, and runner; the gateway exposes the same.
