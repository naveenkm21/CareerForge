# 08 — Risks & Open Questions

## 1. The risks that actually matter

Ranked by expected damage, not by likelihood.

### R1 — Content volume, not code, is the bottleneck *(near certain)*
45 algorithms + ~300 problems + 8 lessons per topic + testcases + hints + assessment items is
plausibly more person-hours than the entire engineering effort.

**Mitigation:** renderers are generic (ADR-007) so algorithms are cheap; checkpoints harvest
into assessment items automatically; `authorAssist` drafts prose for human review; content
work starts at Phase 4 and runs *in parallel* with engineering, not after it. Ship 2 deep
topics before 14 shallow ones.

### R2 — Scope collapse from trying to build all 12 phases at once *(high)*
This is the failure mode of ambitious solo projects.

**Mitigation:** vertical slices with hard exit criteria (`06`); every phase deployed to
production before the next starts; feature flags so unfinished work ships dark. If a phase
slips, cut the *next* phase's scope, never the current phase's exit criteria.

### R3 — `GraphView` is harder than it looks *(high)*
Graph animation with a synchronized distance table, priority queue panel, edge relaxation
states, and readable layout is the single most complex UI component in the product.

**Mitigation:** it is deliberately the *third* renderer, not the first. Author-supplied fixed
node coordinates rather than force layout. Budget 2× whatever the estimate is.

### R4 — The judge's operational edges *(medium-high)*
Self-hosted Judge0 brings queue backpressure, zombie containers, compile-cache invalidation,
and a host that is not Vercel. These bite during demos.

**Mitigation:** hosted judge in Phase 5 to unblock UI, self-host before launch behind an
identical interface; submission cache by code hash; explicit queue-depth alarm and a graceful
"judge busy" state.

### R5 — LLM cost and latency at scale *(medium)*
Mock interviews are multi-turn and use the capable model.

**Mitigation:** per-user Redis budget with honest degradation; small model for
extraction/classification; prompt caching on static blocks; pre-generated hints; every call
metered in `ai_usage`; `AI_MODE=fixtures` for all dev and CI.

### R6 — Scoring model feels wrong to users *(medium)*
"I solved 40 problems and my score went down."

**Mitigation:** decay is visible and explained, not silent; `/explain` drill-down everywhere;
property tests on monotonicity; show *evidence count* next to every score so low-confidence
numbers read as provisional. A wrong-feeling score is a communication failure more often than
a math failure.

### R7 — Cold start *(medium)*
A brand-new user has no evidence, so the dashboard is empty and the roadmap is a guess.

**Mitigation:** a 20-minute adaptive placement assessment at onboarding, plus optional
self-report as a weak prior, plus resume-claimed skills as unverified prior. Never show a fake
number — show "not measured yet" and a clear path to measuring it.

### R8 — Legal/ToS exposure from job data *(low likelihood, high damage)*
Scraping job boards violates ToS and can get the project killed.

**Mitigation:** licensed job APIs and user-pasted JDs only. Written as a non-goal in `00`.

### R9 — Vendor lock-in *(low)*
Clerk, Neon, Vercel, and the LLM provider are all replaceable, but only if isolated.

**Mitigation:** `packages/auth` facade, standard Postgres (no Neon-specific features on the
critical path), `packages/ai` provider interface.

---

## 2. Open questions — RESOLVED 2026-09-21

| # | Question | Decision |
|---|---|---|
| Q1 | Timeline and intensity | **6–8 weeks, portfolio showcase** |
| Q2 | Portfolio or product | **Portfolio, with product-grade architecture** |
| Q3 | Primary curriculum language | **C++ primary**; TS remains the trace source of truth; Python/Java later |
| Q4 | CS fundamentals in v1 | **Yes**, but reduced to 3 visualizations |
| Q5 | Infra budget | **~$0** — single Oracle Always Free VM + Neon free + Vercel Hobby |
| Q6 | Social layer in v1 | **Yes**, reduced to follows + weekly leaderboard + 1v1 battle |

### The tension these answers create, and how it is resolved

6–8 weeks *and* all 12 phases *and* $0 infra only coexist if **content depth absorbs the
pressure while architectural breadth stays intact**: 20 algorithms not 45, 40 problems not 300,
3 CS visuals not 15. Every claim in `01`–`07` is still proven end to end; only volume shrinks.

Full detail, the $0 topology, the week-by-week plan, and the buffer-cut order live in
[`09-v1-schedule.md`](./09-v1-schedule.md).

**Standing caveat:** this configuration is a showcase, not a launchable product. The gap to
real users is content volume and judge capacity — deliberately *not* architecture.

---

## 3. What I would cut first if time runs short

In order:

1. Battles and realtime (Phase 11) — highest effort-to-value ratio.
2. System design round in mock interviews — hardest to grade well.
3. Frontend/Backend/Data role tracks — ship SDE only; the weight-vector design means adding
   them later is a data change.
4. Admin CMS (Phase 12) — author content through seed files a while longer.
5. CS fundamentals (Phase 8).

## 4. What I would never cut

The evidence log, the `/explain` drill-down, prerequisite gating, and the trace engine's
determinism. Those four are the product. Everything else is features around them.
