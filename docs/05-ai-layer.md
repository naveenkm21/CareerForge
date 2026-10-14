# 05 — AI Layer & Code Execution

## 1. The boundary

> **The LLM produces language and qualitative judgments. Deterministic code produces every
> number, every ordering, and every piece of curriculum structure.**

Crossing that line is what turns a real product into a chatbot wrapper. Concretely:

| Job | Owner |
|---|---|
| Mastery, readiness, pillar scores, XP | `packages/core` — deterministic |
| Plan item selection and ordering | `packages/core` — deterministic |
| Which skill to recommend next | `packages/core` — deterministic |
| Algorithm traces / animations | `packages/viz` — deterministic |
| Code correctness | Judge (test cases) — deterministic |
| Interview conversation | LLM |
| Rubric judgments (0–10 on communication) | LLM → becomes *evidence*, not a score |
| Resume → structured profile | LLM + embeddings |
| Job description → required skills | LLM + embeddings |
| Explanation feedback, tiered hints | LLM |
| Draft lesson/problem copy in admin | LLM, human-approved |

An LLM rubric judgment enters the system as an `evidence_events` row with weight 1.2–1.8 and
is then processed by the same deterministic pipeline as everything else. So an LLM can *nudge*
a score through evidence; it can never *state* one.

## 2. The six sanctioned AI jobs

Each is a module in `packages/ai/jobs/`, each with a pinned `prompt_version`, a Zod output
schema, a fixture set, and a cost budget.

### 2.1 `mockInterview`
Streaming, multi-turn, role- and company-profile-conditioned. Rounds: DSA → CS fundamentals →
behavioral → system design (seniority-gated). The AI is given the *problem and its reference
solution* from our DB — it does not invent problems, so difficulty stays calibrated and the
grading has ground truth. Output per round is a structured rubric (`understanding`, `approach`,
`complexity`, `communication`, `edge_cases`), each with a justification quoting the transcript.

### 2.2 `scoreExplanation`
User explains their approach at stage 7. Graded against the reference solution's key insights,
with the complexity claim checked against the known answer. Cheap model, high volume.

### 2.3 `tieredHints`
Three tiers: nudge → strategy → near-solution. Pre-generated per problem at authoring time and
cached in `problem_hints`, so runtime cost is usually zero. Live generation only for novel
stuck-states, and always tier-gated so a hint can't leak the answer on the first ask.

### 2.4 `parseResume`
PDF/DOCX → text (deterministic extraction, *not* the LLM) → structured JSON: skills, projects,
experience, education, with confidence per field. Then embed and match extracted skill strings
onto our `skills` taxonomy via pgvector cosine + a curated alias table. Never auto-writes
mastery — it produces *claimed* skills, which the product then asks the user to verify.

### 2.5 `extractJobSkills`
JD text → required skills + importance, mapped to our taxonomy. Cached by `sha256(description)`
because the same JD reappears across boards. This feeds the gap view:

```
C++            ✓ 0.86   you meet this
DSA            ✓ 0.81   you meet this
SQL            ✓ 0.72   you meet this
AWS            ⚠ 0.34   below the bar → 4 lessons, 2 projects
System Design  ✗ 0.08   blocker → start here
```

Each row deep-links into the roadmap. That link is the whole point of the career surface.

### 2.6 `authorAssist` (admin only)
Drafts lesson prose, problem statements, distractors for MCQs, and narration text from a
structured brief. **Output always lands in `status: 'draft'`** and requires human publication.
Traces are never LLM-generated.

## 3. Guardrails

- **Structured output only.** Every call declares a Zod schema; parse failures retry once with
  the validation error, then fail closed to a deterministic fallback. No free-form parsing.
- **Injection containment.** Resume and JD text is untrusted data, wrapped in delimiters and
  never placed in an instruction position. Extracted values are validated against our
  taxonomy before any write.
- **Cost control.** Small/fast model for classification and extraction; the capable model only
  for interview and explanation grading. Prompt caching on the static system blocks. Every call
  writes to `ai_usage`. Per-user daily budget enforced in Redis; on exhaustion the feature
  degrades to a deterministic fallback with an honest message.
- **Reproducibility.** `prompt_version` is stored on every produced artifact, so an output can
  always be traced to the prompt that made it.
- **Latency.** Anything over ~2s goes to a BullMQ job with a progress channel, not a blocked
  request. Interview turns stream.
- **Offline dev.** `AI_MODE=fixtures` replays recorded responses so the whole app is
  developable and testable without an API key or spend.

## 4. Code execution

### 4.1 Hard rule
Submitted code never executes in the app process, on the app host, or with network access.

### 4.2 Design

```text
  Monaco ──► POST /api/v1/submissions ──► validate, rate-limit, enqueue
                                               │
                                               ▼
                                     apps/runner (separate host)
                                     Judge0 CE in Docker
                                     • no egress (network_mode: none)
                                     • 2s CPU, 256MB, 64 procs
                                     • 64KB stdout cap
                                               │
                                     callback / poll
                                               ▼
              submissions row ──► evidence_events ──► xp_ledger ──► projections
```

- **Judge0 CE self-hosted** is the choice: multi-language, battle-tested sandboxing, known
  resource-limit semantics. Piston is the fallback if Judge0 operations prove annoying.
- **Phase 4 shortcut:** start against a hosted Judge0 to unblock UI work, self-host before
  launch. The interface (`packages/contracts/judge.ts`) is identical either way.
- **Two modes:** *Run* (sample cases, output shown) and *Submit* (all cases, only the first
  failing case revealed, with input truncated).
- Per-user concurrency 1, 20 submissions/hour, enforced in Redis.
- Compile once, run N cases in a batch; cache by `sha256(code + problem + lang)` so
  resubmitting identical code is free.

### 4.3 What the judge returns to the learner

Not just a verdict. On failure: the failing case, expected vs actual, the *class* of failure
(off-by-one, empty input, overflow, TLE on large n), and a link back to the relevant
visualization step. Feeding a TLE straight into "here's the complexity lesson for this pattern"
is a genuinely better teaching loop than a red X.

### 4.4 Complexity checking
Empirical, not static: run the accepted solution across growing input sizes and fit the runtime
curve to O(n), O(n log n), O(n²). Cheap, roughly right, and enough to tell a user their O(n²)
solution passed only because the constraints were small. Flagged as an estimate, never as proof.
