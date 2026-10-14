# 10 — Build Log: all 12 phases

Status as of 2026-10-12. Everything below runs locally and is verified by `pnpm codegen:check`,
`format:check`, `lint`, `typecheck`, `test` (333 tests, plus Postgres integration tests for seeding and the append-only triggers) and `build`,
plus a browser walkthrough of every surface with the demo account.

## 1. Phase by phase

| Phase | Delivered | Verified by |
|---|---|---|
| 0 · Walking skeleton | Turborepo + pnpm, strict TS, ESLint rules that enforce the pure-package boundary, CI workflow, health endpoint, DB-backed feature flags | CI pipeline runs green locally |
| 1 · Foundation | Users, settings, enrollments; skills tree + prerequisite DAG; four roles as weight vectors; onboarding; app shell, ⌘K palette, themes, mobile nav | Seed idempotency integration test |
| 2 · Visual engine | Recorder, registry, MAX_STEPS guard, anchor codegen (4 languages), golden traces, player with deep links | 223 viz tests |
| 3 · Renderers | Array, Matrix, Tree, Graph, Stack/Queue, Table — and Flow (Phase 8). **23 algorithms** | Registry-wide invariant suite |
| 4 · Lessons & ladder | 19 topics, 8-stage ladder (4 topics have all 8 stages), lessons rendered from DB blocks (markdown, viz, quiz, problem, explain, interview); checkpoints, quizzes, lesson completion and explanations all write evidence | Browser: explain graded and recorded |
| 5 · Practice & judge | 29 problems with hidden tests whose expected outputs are computed from a reference; Monaco (served locally); C++/Java/Python/JS; verdicts AC/WA/TLE/RE/CE with the failing case; hints and editorial discount the evidence | Every C++ editorial compiled and passes its own tests; browser WA→AC |
| 6 · Scoring & skill graph | Beta-posterior mastery, difficulty-asymmetric updates, integrity penalties, decay, roll-up, prerequisite gating, readiness composite with the core-blocker cap; projector + `recomputeUser`; **append-only enforced by DB triggers**; React Flow skill graph; `/explain/readiness` → pillar → skill → individual events | 49 core property tests |
| 7 · Planner & dashboard | Deterministic daily plan (gap × weight, weakest-prerequisite routing, decay-driven review, weekend interview, budget fit) with reason codes; live dashboard with 30-day readiness trend from real snapshots | Determinism + budget tests |
| 8 · Tracks & fundamentals | Backend and Data/ML roles; FlowView; Round Robin scheduling, LRU page replacement, HTTP request lifecycle | Same invariant suite |
| 9 · Resume & jobs | Resume parsing with evidence snippets, verify-your-claims, resume score with visible checks; job skill extraction; fit + gap view linking into Learn/Practice; paste-a-JD; application pipeline with timeline | Browser: pasted JD → 71% fit, 11 gaps |
| 10 · Mock interviews | 3-round sessions, adaptive follow-up, rubric per round; Claude (`claude-opus-5-5`, Zod-validated structured output) when a key is set, deterministic fixture judge otherwise; levels → scores in code; `interview.scored` evidence; usage logged to `ai_usage` | Browser: full 3-round session scored |
| 11 · Social & gamification | XP ledger derived from evidence (capped, idempotent), streaks with a 04:00 boundary, 10 badges, weekly/friends/college/all-time leaderboards, follows, 1v1 battles | Browser: battle created and settled |
| 12 · Admin & hardening | Analytics (hardest problems/questions, ladder drop-off, time per topic) on our own tables; problem CMS with versioning, audit log and "verify with reference"; demo dataset | Browser: admin charts render |

## 2. What is simplified for v1 (honest list)

| Design said | v1 does | Why |
|---|---|---|
| Socket.IO live battles via the gateway | Async battles: both play, then settle; demo opponents play from their measured mastery | Buffer policy in docs/09 §5 explicitly allows async battles |
| Redis ZSET leaderboards | Postgres aggregation over `xp_ledger` | Fine at demo scale; the gateway + Redis compose file is ready |
| Judge0 on an isolated VM | Judge0 adapter implemented; local toolchain judge for dev/demo (refuses production) | No VM/Docker available here |
| Weekly `plans` table with adaptation | Daily plan computed on request (deterministic, so identical every load) | Same inputs, same plan — no storage needed yet |
| LLM interviewer | Claude when `ANTHROPIC_API_KEY` is set; deterministic fixture judge otherwise | Demo must not depend on a key (docs/09 §3) |
| Content volume (45 algorithms, 300 problems) | 23 algorithms, 29 problems, 40 questions, 19 topics | Depth absorbs schedule pressure (docs/09 §2) |
| `users.clerk_id` | `auth_provider` + `auth_subject` | Vendor stays swappable |
| Docker Postgres locally | Embedded Postgres (PGlite) by default; Docker supported | Zero-dependency setup |

Not built: speech-to-text interviews, study groups and activity feed, email nudges, Sentry/PostHog,
Playwright suites, `ListView` (linked lists are taught through array reversal).

## 3. What still needs you (accounts)

1. **Deploy:** Neon (database), Clerk (sign-in), Vercel (`apps/web`, root `apps/web`). Set
   `DATABASE_URL`, Clerk keys, `NEXT_PUBLIC_APP_URL`, and either `JUDGE0_URL` or leave practice
   in "no judge configured" mode. GitHub `production` environment secret `DATABASE_URL` lets CI
   migrate and seed on every push to `main`.
2. **Judge0** on the Oracle VM (`infra/vm`) for real verdicts in production.
3. **Claude** (optional): `ANTHROPIC_API_KEY` switches the interviewer and explanation grader from
   the fixture rubric to Claude.
4. **Git:** nothing is committed yet.
