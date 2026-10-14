# 09 — v1 Schedule (resolved constraints)

## 1. The constraints you chose

| Decision | Value |
|---|---|
| Timeline | 6–8 weeks, portfolio showcase |
| Curriculum language | C++ primary (TS is the trace source of truth) |
| Scope | All 12 phases — nothing cut |
| Infra budget | ~$0/month |

## 2. How those four coexist

They coexist on exactly one axis: **breadth of surfaces stays, depth of content shrinks.**

| Dimension | Full spec | v1 (8 weeks) |
|---|---|---|
| Surfaces / phases | 12 | **12 — all present and demoable** |
| Renderers | 8 | **8** |
| Algorithms visualized | 45 | **20** |
| Problems with testcases | ~300 | **40** |
| Fully authored topics | 14 | **3 deep + 6 shallow** |
| CS fundamentals visuals | ~15 | **3** (RR scheduling, B-tree index, HTTP lifecycle) |
| Roles | 4 | **2** (SDE full, Frontend as weight-vector proof) |
| Social | groups, feed, battles, 4 leaderboards | **follows + weekly leaderboard + 1v1 battle** |
| Mock interview rounds | 4 | **3** (DSA, fundamentals, behavioral — no system design) |
| Admin analytics | full | **3 charts** (hardest questions, drop-off, completion time) |

This is the honest trade. Every architectural claim in `01`–`07` is still proven end-to-end;
what is missing is volume, and volume is the one thing a reviewer does not check.

**This is a portfolio configuration, not a launchable product.** If it later needs real users,
the gap to close is content and the judge's capacity — not the architecture.

## 3. $0 infrastructure topology

The one non-obvious move: **put everything stateful on a single Oracle Cloud Always Free ARM
VM** (4 OCPU / 24 GB, genuinely free and always-on — unlike Render free tiers, which sleep).

```text
  Vercel Hobby                Neon Free                 Oracle Cloud Always Free
  ────────────                ─────────                 ────────────────────────
  apps/web                    PostgreSQL 0.5GB          Docker Compose:
  Next.js 15        ────────► + pgvector                  • Judge0 CE (no egress)
  RSC + actions               autosuspend on             • apps/gateway (Socket.IO+BullMQ)
        │                                                • Redis
        └──────── WebSocket / judge API ────────────────►
```

| Need | Choice | Why |
|---|---|---|
| Web | Vercel Hobby | Free, RSC-native, preview deploys |
| DB | Neon free | 0.5 GB is ample at demo scale; branch-per-PR |
| Judge | Judge0 CE on the free VM | Self-hosted avoids public-API rate limits; keeps ADR-010 intact |
| Gateway | Same VM | Render/Fly free tiers sleep; sockets can't sleep |
| Redis | Same VM | Avoids Upstash's free command cap |
| Object store | Cloudflare R2 free tier | 10 GB, zero egress fees |
| LLM | Metered with hard per-user Redis caps | Plus `AI_MODE=fixtures` for all dev, CI, and the recorded demo |

**Demo-day safety:** record fixture responses for every AI call so the showcase never depends
on a live API key, a rate limit, or a cold Neon instance.

## 4. Week-by-week

Each week ends deployed to production. Non-negotiable.

### Week 1 — Skeleton + foundation *(Phases 0–1)*
Turborepo, strict TS, CI/CD, Neon, Clerk behind `packages/auth`, Oracle VM provisioned with
Docker Compose. Skills DAG + roles seeded from YAML. Onboarding wizard. App shell with real
empty states.
**Ends:** stranger signs up on the production URL, picks SDE, sees their zeroed skill tree.

### Week 2 — Visual engine *(Phase 2)* ← **the week that matters most**
`packages/viz` types, recorder, registry, golden-trace harness, anchor build step. `ArrayView`
+ the full player. Six algorithms. Public `/viz/:id` route.
**Ends:** `/viz/binary-search?step=4` animates, highlights C++ line-by-line, accepts a custom array.

> If Week 2 slips, cut Week 6's scope — never Week 2's. This is the differentiator.

### Week 3 — All remaining renderers *(Phase 3)*
`TreeView`, `GraphView` (hardest — budget the whole midweek), `StackQueueView`, `MatrixView`,
`TableView`. Reach 20 algorithms. Registry-wide invariant suite.
**Ends:** Dijkstra animates with a synchronized distance table and priority-queue panel.

### Week 4 — Lessons + practice + judge *(Phases 4–5)*
Lesson blocks (MDX/viz/quiz), the 8-stage ladder, checkpoints emitting the **first real
evidence**. Monaco split-view, Judge0 wired, verdicts, failing-case display. 40 problems, 3 deep
topics.
**Ends:** submit C++ → verdict in <5s → `submission.judged` row written.

### Week 5 — Scoring + planner + dashboard *(Phases 6–7)*
`packages/core` with property tests: mastery, decay, rollup, prereq gating, readiness, XP,
streaks. Projector + `recomputeUser`. Skill graph in React Flow. `/explain/*` drill-down.
Deterministic weekly planner. The real dashboard.
**Ends:** wipe `user_skill_state`, replay the log, get identical scores. `74%` drills to a
single failed submission.

### Week 6 — Fundamentals + career *(Phases 8–9)*
`FlowView` + 3 CS-fundamentals visuals. Frontend role as a second weight vector. Resume upload
→ parse → verify-skills. Paste-a-JD → skill gap with deep links into the roadmap. Applications
tracker.
**Ends:** a pasted real JD produces a gap whose rows navigate into lessons.

### Week 7 — Interviews + social *(Phases 10–11)*
Streaming 3-round mock interview with rubric scoring → evidence. Gateway sockets: presence,
Redis ZSET leaderboard, follows, 1v1 battle with live scoreboard.
**Ends:** a full interview moves the readiness number; two browsers complete a battle with
correct XP settlement.

### Week 8 — Admin + hardening + demo *(Phase 12)*
Admin CMS with live viz preview, publish/version. Three analytics charts. Playwright on five
flows. a11y pass, perf pass, seed a realistic demo account with 24 days of history.
**Ends:** a non-engineer adds a topic through the UI with no deploy. Demo script rehearsed.

## 5. Buffer policy

Weeks 1–5 are load-bearing; weeks 6–8 are compressible. If you are behind entering Week 6:

1. Cut CS fundamentals to **one** visualization.
2. Cut the battle to async (submit-and-compare) instead of live-socket.
3. Cut the admin CMS to problems-only.
4. Cut the second role.

Cut in that order. Never cut the evidence log, `/explain`, prerequisite gating, or trace
determinism — those four *are* the product (`08 §4`).

## 6. The demo script this schedule is optimized for

Eight minutes, in this order:

1. **Cold start** — sign up, pick SDE, take a 5-question placement, land on a zeroed dashboard.
2. **The differentiator** — open Binary Search, scrub the animation, watch C++ highlight in
   lockstep, edit the array, re-run instantly. Then answer a checkpoint wrong and get the
   violated *invariant* back, not a red X.
3. **Proof of work** — solve the problem in Monaco, get a real verdict from a sandboxed judge.
4. **The payoff** — dashboard updates live. Click `74%`, drill all the way down to the
   individual submission that moved it. *This is the moment that separates the project from a
   ChatGPT wrapper.*
5. **The loop closes** — paste a real job description, see the gap, click a missing skill, land
   back in the roadmap.

Everything in the 8 weeks exists to make those five beats work.
