# 04 — Mastery, Readiness & the Planner

All of this lives in `packages/core`. Pure functions, zero IO, versioned rubrics, hundreds of
unit tests. **No LLM touches any number in this document.**

## 1. Mastery: Beta posterior with decay

Each `(user, skill)` holds a Beta distribution over "probability this user gets a
representative item right".

```
state = { alpha, beta }        prior: alpha0 = 1.2, beta0 = 2.8   (prior mastery ≈ 0.30)

mastery    = alpha / (alpha + beta)
n_eff      = alpha + beta - (alpha0 + beta0)        effective evidence count
confidence = 1 - exp(-n_eff / 6)                    0 at no evidence, ~0.80 at n_eff = 10
```

### 1.1 Applying evidence

An evidence event carries `outcome ∈ [0,1]`, `difficulty ∈ [0,1]`, and an evidence-kind weight.

```
w = kindWeight × difficultyGain(difficulty, outcome) × recencyFresh × integrity

alpha += w × outcome
beta  += w × (1 - outcome)
```

`kindWeight` — how much an activity actually proves:

| Evidence kind | weight | Rationale |
|---|---|---|
| `lesson.viewed` | 0.15 | Watching proves almost nothing |
| `lesson.explored` | 0.3 | Changed the input, re-ran it |
| `trace.completed` | 0.4 | Stepped through to the end |
| `checkpoint.answered` | 0.8 | A real graded prediction |
| `question.answered` | 1.0 | Standard item |
| `submission.judged` | 2.5 | Strongest signal available |
| `assessment.completed` | 2.0 | Timed, no hints |
| `explanation.scored` | 1.2 | Depth of understanding |
| `interview.scored` | 1.8 | Under pressure |
| `battle.result` | 1.0 | Timed but noisy |

`difficultyGain` — asymmetric, so the update is informative rather than flattering:

```
correct on a HARD item   → gain 1.6    (strong positive)
correct on an EASY item  → gain 0.5    (proves little)
wrong on an EASY item    → gain 1.6    (strong negative)
wrong on a HARD item     → gain 0.5    (forgivable)

difficultyGain(d, o) = o >= 0.5 ? (0.4 + 1.2·d) : (1.6 - 1.2·d)
```

`integrity` penalties: hints used ×0.7, second attempt ×0.8, third+ ×0.6, solution
viewed ×0.25 (still positive — reading a solution has *some* value, just not much).

### 1.2 Decay — spaced repetition for free

Skills go stale. On read (lazily, not by cron), pull the posterior back toward the prior:

```
gap  = days since last evidence
k    = exp(-gap / TAU)              TAU = 45 days, per-skill override allowed
alpha = alpha0 + (alpha - alpha0) × k
beta  = beta0  + (beta  - beta0)  × k
```

Mastery drifts toward the prior and — more importantly — **confidence collapses**. A user with
mastery 0.9 and confidence 0.3 is flagged `stale` and a review item appears in the plan. That
is spaced repetition emerging from the model, not a bolted-on SRS.

`next_review_at` = the date at which projected confidence drops below 0.5.

### 1.3 Rolling up the tree

A parent skill's mastery is the importance-weighted mean of its children's, but capped by
coverage so that mastering one child does not light up the parent:

```
raw      = Σ(w_i · mastery_i) / Σ(w_i)
coverage = (# children with confidence ≥ 0.4) / (# children)
parent   = raw × (0.55 + 0.45 × coverage)
```

### 1.4 Prerequisite gating

A skill's *effective* mastery cannot outrun its prerequisites:

```
prereqCap = min over prereq p of ( 0.55 + 0.45 · mastery_p )
effective = min(mastery, prereqCap)
```

This is what produces the product's signature recommendation:

> *Graphs 25% — but the real blocker is Heaps (0.18), which gates Dijkstra.
> Recommended next: Heaps → Priority Queue.*

The recommendation engine always routes to the **weakest unmet prerequisite**, not to the
weakest leaf. Attacking DP while recursion is broken is the single most common way students
waste months.

## 2. Readiness: transparent composite

```
readiness(user, role) = Σ pillarScore_p × pillarWeight_p(role)
```

| Pillar | Derived from | SDE weight |
|---|---|---|
| DSA | role-required DSA skills, weighted by `role_skill_reqs` | 0.30 |
| CS Fundamentals | OS / DBMS / CN / OOP skill states | 0.18 |
| Development | stack skills + project rubric scores | 0.15 |
| Projects | count × depth × verification (repo, deploy, tests) | 0.12 |
| Resume | ATS structure, quantified impact, role keyword coverage | 0.10 |
| Interview | rolling mean of last 3 mock-interview rubrics, decayed | 0.15 |

Weights live in a `rubric` record with a version. Frontend/Backend/Data roles ship different
weight vectors; that is a data change, not a code change.

### Pillar score from skills

```
pillarScore = Σ over required skills:  w_s × min(1, effective_s / target_s)
              ─────────────────────────────────────────────────────────────
                                    Σ w_s
```

Clamping at the target matters: exceeding the required bar on arrays must not compensate for a
zero on graphs. Additionally, **any `tier: 'core'` skill below 0.35 caps overall readiness at
0.70** and surfaces as a blocker. A user cannot be "85% ready" with zero graph ability.

### Explainability

Every score computes alongside an evidence tree:

```ts
type ScoreExplanation = {
  value: number; label: string; weight: number;
  contributors: ScoreExplanation[];
  evidence?: { eventId: string; kind: string; at: string; delta: number }[];
  caps?: { reason: 'PREREQ'|'CORE_BLOCKER'|'COVERAGE'; by: string; amount: number }[];
};
```

`GET /api/v1/explain/readiness` and `/explain/skill/:id` return this. The UI drills from
`74%` all the way down to *"submission #8412 on 2026-09-14 failed 3/10 cases on
Dijkstra, −0.06"*. This endpoint is a product feature, not a debug tool.

## 3. The planner — deterministic, not generative

Input: user skill states, role requirements, daily minutes, calendar, streak, review queue.
Output: `plan_items` for the week.

```text
1. GAP        gap_s = max(0, target_s − effective_s) × weight_s × tierMultiplier
2. UNBLOCK    re-route gap to the weakest unmet prerequisite of each gapped skill
3. REVIEW     pull every skill whose next_review_at <= today (decay-driven)
4. ORDER      topological sort over skill_edges; ties broken by gap descending
5. MIX        each day gets: 1 new-learning + 2–3 practice + 1 review
               + 1 assessment/interview on days 6–7. Never 100% new material.
6. FIT        greedy knapsack to daily_minutes_target, ±15% tolerance
7. ADAPT      nightly: unfinished high-priority items roll forward;
               3 consecutive skips on a skill → drop difficulty one level and
               re-insert a prerequisite lesson
```

Every item carries a `reason_code`, so the UI can always answer "why is this here?".

The LLM's only role is **writing the sentence**, optionally, over an already-chosen plan. Item
selection is deterministic, which makes it fast, free, reproducible, testable, and debuggable.

## 4. XP, streaks, badges

Rules live in `core/xp.ts` as data, evaluated in one place:

```
lesson complete        +20      assessment passed       +100
problem solved         +50×d    mock interview          +150
first solve of the day +25      battle win              +200 (loser +50)
daily streak           +10      badge earned            +75
```

Anti-farming: XP per skill per day is capped; re-solving a solved problem gives 20%; hints
reduce the multiplier; XP is derived from the same evidence rows, so it can never disagree with
mastery.

Streak: "active" = ≥1 graded evidence event *and* ≥10 minutes. Two freezes per month, granted
not purchased. Timezone from the user profile, day boundary at 04:00 local — nobody should
lose a streak for studying past midnight.

Badges are declarative criteria evaluated by the same projector:

```ts
{ slug: 'graph-navigator', criteria: { skill: 'dsa.graphs', mastery: 0.8, confidence: 0.6 } }
{ slug: 'century',         criteria: { distinctProblemsSolved: 100 } }
```

## 5. Recomputation

`recomputeUser(userId, rubricVersion)` replays `evidence_events` in order and rewrites the
projections. It is idempotent and runs:

- nightly for active users (decay + snapshot),
- on demand from admin,
- automatically for everyone after a rubric-version bump.

`packages/core` is pure, so this is also the *test harness*: synthesize an event stream for a
fictional user, assert the resulting curve behaves sensibly. Those property tests
("mastery never exceeds 1", "wrong answers never raise mastery", "decay is monotone",
"a core blocker always caps readiness") are what stop the scoring engine from quietly rotting.
