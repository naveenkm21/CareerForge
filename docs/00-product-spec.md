# 00 — Product Specification

## 1. One-line definition

CareerForge is a **job-readiness operating system**: the user declares a target role, the
platform measures where they actually are, and then drives a continuously-adapting loop of
*visual learning → active practice → measured evidence → interview proof → job application*.

## 2. What makes it defensible

Three things, in priority order. Everything else is table stakes.

| # | Differentiator | Why it is hard to copy |
|---|---|---|
| 1 | **Deterministic visual algorithm engine** — every algorithm is an instrumented reference implementation that emits a step trace; code highlighting, animation, scrubbing, and interactive "what happens next?" checkpoints are all *derived from the same trace*. | It is real engineering, not prompt output. Once built, each new algorithm costs hours, not weeks. |
| 2 | **Evidence-backed skill state** — every score in the product traces back to an append-only log of graded events. Nothing is an opaque AI number. | Requires a real domain model. Most competitors show a vibes-based percentage. |
| 3 | **Closed loop** — job description → skill gap → roadmap → lesson → practice → assessment → readiness → mock interview → application. Each feature writes evidence the others read. | The value is in the wiring, which only exists if the data model is right from day one. |

## 3. The identity of the product

> **Code → See → Understand → Solve**

Every DSA topic is delivered as an 8-stage ladder. The ladder is the product's spine and is
the same for every topic, which is what makes it buildable:

| Stage | Name | User does | Evidence emitted |
|---|---|---|---|
| 1 | Understand | Watches narrated visual execution | `lesson.viewed` (weak) |
| 2 | Visualize | Edits the input, re-runs the trace | `lesson.explored` |
| 3 | Trace | Steps through code + animation side-by-side | `trace.completed` |
| 4 | Predict | Answers "what is the state after this step?" | `checkpoint.answered` (graded) |
| 5 | Implement | Writes code in Monaco | `submission.judged` (strong) |
| 6 | Test | Hidden test cases, complexity check | `submission.judged` |
| 7 | Explain | Writes/speaks approach + complexity | `explanation.scored` (LLM rubric) |
| 8 | Interview | Follow-up pressure questions | `interview.scored` |

Stages 1–4 are produced *for free* from one trace. That is the leverage.

## 4. Scope by surface

### 4.1 Learning
- **DSA** (hero surface): ~14 topic clusters, ~45 algorithms, generic renderers for 8 structure kinds.
- **CS Fundamentals**: OS (scheduling, paging, deadlock, sync), DBMS (joins, indexes, B-tree, txn, normalization), CN (request lifecycle, TCP, TLS, DNS). Same trace engine, different structure renderers.
- **Dev skills**: curated checklists + project rubrics, not visual. Deliberately shallower.

### 4.2 Career
Resume intelligence, job intelligence, skill-gap mapping, readiness dashboard, applications tracker.

### 4.3 Proof
Assessments, timed challenges, AI mock interviews with rubric scoring.

### 4.4 Social
XP, streaks, badges, leaderboards, follows, study groups, head-to-head battles.

### 4.5 Admin
Content authoring (topics, lessons, trace configs, problems, assessments), analytics, LLM-assisted drafting with human approval.

## 5. Explicit non-goals

Writing these down now is what keeps the project finishable.

| Non-goal | Why | Revisit? |
|---|---|---|
| Visualizing the **user's own** C++/Java code | Requires instrumenting arbitrary compiled code. 10x the effort of everything else combined. | Python-only, post-v1 |
| Being a LeetCode-scale problem bank | Depth over breadth. ~300 curated problems mapped to skills beats 3000 unmapped. | No |
| Live video/voice mock interviews | Text + optional speech-to-text is 95% of the value at 10% of the cost. | v2 |
| Real-time collaborative editing | Battles need score sync, not CRDTs. | No |
| Scraping job boards | Legal + brittle. Use licensed APIs and user-pasted JDs. | No |
| Mobile apps | Responsive web only. | v2 |
| An LLM that computes scores | See ADR-006. LLMs emit rubric judgments; deterministic code computes every number. | Never |

## 6. Primary personas

1. **Final-year student, 6 months out.** Has a target (SDE). Knows arrays, is scared of DP and graphs. Needs structure and a number that tells them if they're ready. *This is the design target.*
2. **Career switcher, 12 months out.** Weak CS fundamentals, decent dev skills. Needs the fundamentals track and resume repositioning.
3. **Content author / TA (admin).** Needs to add a topic in under an hour without touching code.

## 7. The daily contract with the user

Opening the app must answer four questions in under three seconds:

1. How ready am I? (readiness %, trend)
2. What is my weakest link? (skill graph, flagged nodes)
3. What do I do *today*? (a time-boxed plan, 4–6 items, generated deterministically)
4. What is that unlocking? (jobs matched, gap closed)

If a feature doesn't feed one of those four, it is not in v1.

## 8. Success criteria for v1

- A user can go from signup → assessment → roadmap → a completed visual lesson → 3 judged submissions → a readiness score with drill-down evidence, in one session, with zero hardcoded content in the UI layer.
- 45 algorithms visualized by 8 renderers.
- Every number on the dashboard has a `/explain` endpoint returning its evidence tree.
- Full mastery + readiness recomputation from the event log is possible and tested.
