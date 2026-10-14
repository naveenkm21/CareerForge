# 06 — Build Plan

Twelve phases, each a **vertical slice** that ends in something demonstrable in production.
No phase is "just backend" or "just UI". Every phase has an exit criterion that can be
checked, not argued about.

One reordering from the original plan, and it matters:

> **The visual engine moves ahead of the lesson CMS.**
> The engine's `Trace` shape *defines* the lesson block schema. Building the CMS first means
> designing `lesson_blocks.payload` blind and then migrating it. Build the engine standalone,
> let it prove the data shape, then wrap content around it.

---

## Phase 0 — Walking skeleton (before any feature)

Ship an almost-empty app to production on day one.

- Turborepo + pnpm, strict TS, eslint/prettier, all packages stubbed.
- `packages/db` with `users` + drizzle-kit migrations; Neon dev branch.
- Clerk auth behind `packages/auth`; protected `/dashboard` that renders the user's name.
- CI: typecheck → lint → unit → build → migrate → deploy. Preview deploys on PRs.
- Sentry, health endpoint, DB-backed feature flags.

**Exit:** a stranger can sign up on the production URL and see their name. CI is green and
deploys automatically.

---

## Phase 1 — Foundation: identity, taxonomy, shell

- Full `users`/`profiles`/`settings`; onboarding wizard (target role, hours/week, timezone).
- `skills`, `skill_edges`, `roles`, `role_skill_reqs` seeded from `content/*.yaml` via an
  idempotent seed command.
- App shell: nav, command palette, theme, responsive layout, loading/empty/error states as
  first-class components.
- Dashboard **scaffold** with real placeholders (no fake data — empty states say "no evidence yet").

**Exit:** signup → onboarding → dashboard showing the real skill tree for the chosen role, all
zeroed. Seed is re-runnable without duplication.

---

## Phase 2 — Visual algorithm engine (the differentiator)

- `packages/viz`: types, recorder, registry, `MAX_STEPS` guard, golden-trace test harness.
- Anchor extraction build step for C++/Java/Python/TS sources.
- `ArrayView` renderer + the player (play/pause/step/scrub/speed/keyboard/deep-link).
- Six algorithms: linear search, binary search, two pointers, sliding window, prefix sum,
  bubble/insertion sort.
- Public demo route `/viz/:algorithmId` with editable input.

**Exit:** `/viz/binary-search?input=...&step=4` loads, animates, highlights the matching line in
all four languages, and works with a user-supplied array. Golden tests cover all six.

---

## Phase 3 — The rest of the renderers

- `TreeView` (BST insert/delete/traversals/heap), `GraphView` (BFS, DFS, Dijkstra,
  topological sort), `StackQueueView`, `MatrixView`, `TableView`.
- Reduced-motion support, shared tone legend, mobile layout for the player.
- ~25 algorithms registered.

**Exit:** all five renderers pass the registry-wide invariant suite; Dijkstra animates
correctly with the distance table and priority queue side-panels synchronized.

---

## Phase 4 — Lesson system & the 8-stage ladder

- `topics`, `lessons`, `lesson_blocks` with MDX + `viz` + `quiz` block kinds.
- Lesson player implementing stages 1–4 (Understand / Visualize / Trace / Predict).
- Trace checkpoints wired to emit `evidence_events` — **first real evidence in the system**.
- `lesson_progress`, resume-where-you-left-off.
- Content for two full topics (Arrays, Binary Search): 8 lessons each.

**Exit:** a user completes a topic end-to-end; `evidence_events` fills; the lesson renders
entirely from the database with zero hardcoded content in the UI.

---

## Phase 5 — Practice: Monaco, judge, problems

- `problems`, testcases, hints; problem browser filtered by skill.
- Monaco split view with the visualization pane; language switching; local draft persistence.
- `apps/runner` (Judge0 in Docker), submission queue, verdicts, failing-case display.
- Stages 5–6 of the ladder; empirical complexity estimate.
- ~60 problems mapped to skills.

**Exit:** submit C++ → verdict in under 5 seconds → `submission.judged` evidence written.
Runner has no network egress; rate limits verified.

---

## Phase 6 — Scoring engine & skill graph

- `packages/core`: mastery, decay, rollup, prereq gating, readiness, XP, streaks — with the
  property-test suite.
- Projector + `recomputeUser`; nightly BullMQ job; `readiness_snapshots`.
- Skill graph UI (React Flow) with status colouring and drill-down.
- `/explain/*` endpoints and the evidence-drilldown UI.
- Placement assessment for cold-start.

**Exit:** wiping `user_skill_state` and replaying the event log reproduces identical scores.
Clicking `74%` drills to individual evidence rows.

---

## Phase 7 — Planner, recommendations, real dashboard

- Deterministic weekly planner, `plan_items`, adaptation rules, review queue from decay.
- The dashboard from the brief: readiness, today's plan, skills, recommendations.
- Streak, XP, badges surfaced. Email/push nudges via gateway jobs.

**Exit:** the dashboard is fully live, every plan item carries a visible `reason_code`, and
skipping items for three days visibly changes next week's plan.

---

## Phase 8 — Career tracks & CS fundamentals

- Frontend / Backend / Data-ML role definitions with their own weight vectors.
- `FlowView` renderer; OS (FCFS, SJF, RR, paging, page replacement, deadlock, semaphores),
  DBMS (joins, indexes, B-tree, transactions, normalization), CN (request lifecycle).
- Interactive SQL playground (read-only sandbox DB) for the DBMS track.

**Exit:** a non-SDE role produces a materially different roadmap and readiness weighting from
the same codebase.

---

## Phase 9 — Resume & job intelligence

- Upload → extract → `parseResume` → verify-your-skills UI.
- Job ingestion (licensed API + paste-a-JD), `extractJobSkills`, embeddings, `job_matches`.
- Gap view with deep links into the roadmap; applications tracker with a status pipeline.
- Resume pillar scoring.

**Exit:** pasting a real JD yields a skill gap whose rows navigate straight into lessons.

---

## Phase 10 — Mock interviews

- Session builder (role, company profile, rounds), streaming turns, optional speech-to-text.
- Rubric scoring → `interview_scores` → `evidence_events`.
- Transcript review with inline feedback; interview pillar wired into readiness.

**Exit:** a full four-round interview completes, is scored, and visibly moves the readiness
number through the evidence pipeline.

---

## Phase 11 — Social, realtime, gamification

- `apps/gateway`: Socket.IO rooms, presence, Redis ZSET leaderboards.
- Follows, study groups, activity feed, shareable achievement cards.
- Battles: matchmaking, synchronized timer, live scoreboard, results → XP + evidence.

**Exit:** two browsers run a 1v1 battle with a live scoreboard and correct XP settlement,
including on disconnect/reconnect.

---

## Phase 12 — Admin platform, hardening, launch

- Admin CMS: topics, lessons, viz block config with live preview, problems + testcase runner,
  assessments, publish/version/rollback.
- Analytics: hardest questions, drop-off points, completion times, most-failed skills.
- `authorAssist` drafting with human approval.
- Hardening: Playwright on five critical flows, load test the judge, a11y pass, SEO on public
  pages, backup/restore drill, runbook.

**Exit:** a non-engineer adds a complete topic (lesson + viz + 5 problems + assessment)
through the UI in under an hour, with no deploy.

---

## Cross-cutting notes

**Content is the real bottleneck, not code.** 45 algorithms + ~300 problems + lesson prose is
the largest line item in the whole project. Budget it explicitly, start it during Phase 4, run
it in parallel with engineering, and use `authorAssist` aggressively — with review.

**Definition of done for every phase:** migrations are reversible, the feature is behind a
flag, `core`/`viz` changes carry unit tests, the dashboard still loads under 1.5s, and the
phase is deployed to production (possibly dark) before the next one starts.

**Where the schedule will slip:** `GraphView` (Phase 3), the judge's operational edges
(Phase 5), and content volume (Phase 4 onward). Everything else is ordinary work.
