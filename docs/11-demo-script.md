# 11 — Demo Script (≈ 10 minutes)

## Before you present

```bash
pnpm db:reset && pnpm db:demo
```

```bash
pnpm dev
```

Wait until the terminal says *Ready*, then open each page once (dev mode compiles a route on its
first visit — warming them avoids a pause mid-demo): `/dashboard`, `/viz/binary-search`,
`/learn/binary-search/predict`, `/practice/lower-bound`, `/explain/readiness`, `/career/jobs`,
`/interview`, `/community`, `/admin`. Sign in at `/sign-in` as **demo@careerforge.test**.

Everything works offline: the judge runs locally, Monaco is served by the app, and the
interviewer uses the deterministic rubric unless you set `ANTHROPIC_API_KEY`.

## The story

**1. The problem (30 s).** Students grind problems with no idea whether they are *ready*. Every
platform shows a percentage nobody can explain. CareerForge's rule: *every number traces back to
something you did.*

**2. The differentiator — see the algorithm (2 min).** Open `/viz/dijkstra`.
- Press play. Graph, distance table and priority queue move together; the C++ line highlights.
- Switch to Python mid-run: the highlight follows (one trace, four languages — ADR-005).
- Turn on **Practice**: it asks *"Which node should be processed next?"* Answer wrong — it
  returns the invariant you broke, not a red X.
- Press **e**, change the graph, run again. Instant: the trace is computed in the browser.

**3. Learning is a ladder (1 min).** `/learn/binary-search` — eight stages, Understand →
Interview. Show stage 4 (Predict with checkpoints) and stage 7 (Explain: write an answer, it is
graded by the rubric and becomes evidence).

**4. Proof of work — a real judge (1.5 min).** `/practice/lower-bound`. Submit the empty starter:
**Wrong answer** with the failing input. View the editorial (note: it discounts the evidence to
×0.25), load it, submit: **Accepted, 11/11**, compiled with g++.

**5. The payoff — explainable readiness (2 min).** `/dashboard`.
- Readiness, the six pillars, and the 30-day trend line (real daily snapshots).
- *"4 core skills are below the bar"* — the core-blocker rule.
- Today's plan: every item says *why* (reason codes) — deterministic, same inputs → same plan.
- Click the **%** → `/explain/readiness`: the arithmetic, pillar by pillar → click a skill → the
  evidence log with each event's effect on mastery → click a submission. *This is the moment that
  separates it from a ChatGPT wrapper.*
- Mention: evidence is append-only — database triggers reject UPDATE/DELETE (covered by
  `append-only.integration.test.ts`).

**6. The loop closes — jobs (1.5 min).** `/career/jobs/new`: paste any real job description →
skills extracted with the sentence that mentions each → fit % → each gap links straight into
Learn or Practice. Show `/career/applications` (pipeline) and `/career/resume` (claims vs evidence).

**7. Interview and community (1 min).** `/interview` — open the completed session: rubric per
round, levels from the interviewer, numbers from code. `/community` — leaderboards;
`/community/battles` — a finished 1v1.

**8. Admin (30 s).** `/admin` — analytics from our own tables; `/admin/problems/new` — add a
problem and verify it against a reference solution, no deploy.

## Likely questions

- *Is the AI scoring me?* No. The model (or the fixture judge) emits **levels**; code maps them
  to numbers (ADR-006). Readiness is pure arithmetic over the evidence log.
- *What if the formula changes?* Projections are rebuilt from the log (`recomputeUser`); every
  score stores its rubric version.
- *How is it tested?* 333 tests: property tests on scoring (mastery never exceeds 1, wrong answers
  never raise it, decay is monotone, core blockers always cap), golden traces for every
  algorithm, every algorithm checked against an independent oracle, every C++ editorial compiled
  and judged against its own tests.
- *Why not deployed?* Deployment needs Neon/Clerk/Vercel accounts; the CI pipeline and infra
  files are ready (docs/10 §3).
