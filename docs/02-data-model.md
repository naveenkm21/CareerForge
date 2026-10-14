# 02 — Domain & Data Model

## 1. The one decision that matters most

> **Evidence is an append-only event log. Every score is a derived projection.**

`evidence_events` and `xp_ledger` are immutable. `user_skill_state`, `readiness_snapshots`,
`streaks`, and leaderboards are *caches* that can be dropped and rebuilt from the log.

Why this is non-negotiable:

- The mastery formula **will** change. Without the log, every historical score silently becomes
  incomparable and users see their numbers jump with no explanation.
- "Every score has evidence behind it" (the core product promise) is only true if the evidence
  is stored as first-class rows, not implied by an aggregate.
- Rubric versions let you replay: *score this user under rubric v3* — required for honest
  trend lines and for the `/explain` endpoints.
- Nightly recompute becomes a safe, idempotent job rather than a migration.

Everything below follows from that.

## 2. Domain map

```text
   IDENTITY        TAXONOMY              CONTENT
   ────────        ────────              ───────
   users ─────┐    skills (DAG) ◄────────┬─ topics
   profiles   │    skill_edges           ├─ lessons ─ lesson_blocks
              │    roles                 ├─ algorithms (viz registry id)
              │    role_skill_reqs       ├─ problems ─ testcases ─ hints
              │                          └─ assessments ─ questions
              │         ▲                        │
              ▼         │                        ▼
        enrollments     │                 ┌─────────────┐
              │         └─────────────────┤  EVIDENCE   │ append-only
              ▼                           │   EVENTS    │
        ┌──────────────────┐              └──────┬──────┘
        │  PROJECTIONS     │ ◄───────────────────┘
        │  user_skill_state│
        │  readiness_snaps │────┐
        │  streaks, xp     │    │
        └──────────────────┘    ▼
              │            PLANNING            CAREER
              │            ────────            ──────
              └──────────► plans               resumes ─ parsed_profile
                           plan_items          jobs ─ job_skills
                           recommendations     applications
                                               interview_sessions ─ turns ─ scores
```

## 3. Tables

Drizzle-flavoured sketch. `id` = uuid v7 unless noted. All tables carry `created_at`;
mutable ones carry `updated_at`.

### 3.1 Identity

```ts
users            (id, clerk_id UNIQUE, email, handle UNIQUE, name, avatar_url,
                  role: 'user'|'admin'|'author', college, grad_year, timezone,
                  daily_minutes_target, onboarded_at, deleted_at)
user_settings    (user_id PK, theme, reduced_motion, editor_lang, email_prefs jsonb)
```

Clerk owns credentials. We mirror the minimum and key everything to our own `users.id`, so the
auth vendor stays swappable (`packages/auth` facade).

### 3.2 Taxonomy — the spine

```ts
skills        (id, slug UNIQUE, name, domain: 'dsa'|'cs'|'dev'|'soft',
               parent_id → skills, depth, sort, summary, icon)
skill_edges   (from_skill_id, to_skill_id, kind: 'prereq'|'reinforces', strength 0..1)
              PK (from, to, kind)

roles         (id, slug, title, family, description)
role_skill_reqs (role_id, skill_id, target_mastery 0..1, weight 0..1, tier: 'core'|'strong'|'nice')
              PK (role_id, skill_id)
```

`skills` is a tree for navigation (`parent_id`) **and** a DAG for prerequisites (`skill_edges`).
Those are different relationships and conflating them is a classic mistake: *Heaps* is a child
of *Data Structures* but a prerequisite of *Dijkstra*.

Seeded from versioned YAML in `content/`, never hand-edited in prod.

### 3.3 Content

```ts
topics        (id, skill_id, slug, title, blurb, est_minutes, sort, status, version)
lessons       (id, topic_id, slug, title, stage: 1..8, est_minutes, sort, status)
lesson_blocks (id, lesson_id, sort, kind: 'mdx'|'viz'|'quiz'|'callout'|'code',
               payload jsonb)     -- viz payload: { algorithmId, input, focusSteps[] }
algorithms    (id, registry_id UNIQUE, skill_id, title, structure_kinds[], complexity jsonb)

problems          (id, skill_id, slug, title, difficulty: 1..5, statement_mdx,
                   constraints, starter_code jsonb, reference_solution jsonb,
                   time_limit_ms, memory_kb, tags[], status)
problem_testcases (id, problem_id, input, expected, is_sample, weight, sort)
problem_hints     (id, problem_id, tier 1..3, body_mdx)

assessments       (id, scope: 'topic'|'skill'|'role'|'placement', ref_id,
                   question_count, time_limit_s, pass_threshold)
questions         (id, assessment_id NULL, skill_id, kind: 'mcq'|'multi'|'predict'|
                   'order'|'code'|'short', difficulty 1..5, prompt_mdx, payload jsonb,
                   answer jsonb, explanation_mdx, source: 'authored'|'harvested')
```

`questions.source = 'harvested'` is how trace checkpoints (see `03`) become assessment items
automatically.

`algorithms.registry_id` links a DB row to a `defineAlgorithm` module id. The DB stores
*metadata*; the code stores *behaviour*. Never store trace frames.

### 3.4 Learning state

```ts
enrollments   (id, user_id, role_id, started_at, target_date, status, is_primary)

evidence_events (                        -- APPEND ONLY. The heart of the system.
  id            uuid v7 (time-ordered),
  user_id,
  skill_id,                              -- which skill this speaks to
  kind          'lesson.viewed'|'lesson.explored'|'trace.completed'|
                'checkpoint.answered'|'question.answered'|'submission.judged'|
                'assessment.completed'|'explanation.scored'|'interview.scored'|
                'battle.result'|'project.reviewed',
  source_type   'lesson'|'problem'|'question'|'assessment'|'interview'|'battle',
  source_id,
  outcome       numeric(4,3),            -- 0..1 normalized correctness/quality
  difficulty    numeric(4,3),            -- 0..1, from the item
  weight        numeric(4,3),            -- evidence strength (see 04)
  duration_ms,
  meta          jsonb,                   -- attempt no., hints used, rubric detail
  occurred_at   timestamptz
)
INDEX (user_id, skill_id, occurred_at)
INDEX (user_id, occurred_at)

user_skill_state (                       -- PROJECTION. Rebuildable.
  user_id, skill_id,
  alpha numeric, beta numeric,           -- Beta posterior
  mastery numeric(4,3),                  -- alpha/(alpha+beta)
  confidence numeric(4,3),               -- from effective sample size
  status 'untouched'|'learning'|'practicing'|'strong'|'stale',
  last_evidence_at, next_review_at,
  rubric_version int,
  PRIMARY KEY (user_id, skill_id)
)

lesson_progress (user_id, lesson_id, stage_reached, completed_at, seconds_spent)
                PK (user_id, lesson_id)
submissions   (id, user_id, problem_id, lang, code, status: 'queued'|'ac'|'wa'|'tle'|
               'mle'|'ce'|'re', passed, total, runtime_ms, memory_kb,
               judge_token, failed_case_id, created_at)
assessment_attempts (id, user_id, assessment_id, started_at, submitted_at,
                     score, per_skill jsonb, answers jsonb)
```

### 3.5 Planning

```ts
plans       (id, user_id, enrollment_id, week_start, generated_at, rubric_version,
             rationale jsonb, status)
plan_items  (id, plan_id, day date, sort, kind: 'lesson'|'practice'|'review'|
             'assessment'|'interview'|'project', ref_type, ref_id,
             est_minutes, reason_code, completed_at, skipped_at)
recommendations (id, user_id, skill_id, reason_code, score, payload jsonb,
                 valid_until, acted_at)
```

`reason_code` is an enum (`WEAKEST_PREREQ`, `SPACED_REVIEW`, `ROLE_GAP`, `JOB_DEMAND`,
`STREAK_SAVE`, `DECAYED`), not free text. The UI renders copy from the code, so the *why* is
deterministic and translatable — the LLM never invents a reason.

### 3.6 Career

```ts
resumes         (id, user_id, storage_key, filename, bytes, parsed_at, parse_status)
parsed_profiles (id, resume_id, user_id, raw_text, skills jsonb, projects jsonb,
                 experience jsonb, education jsonb, embedding vector(1536),
                 model, prompt_version)
jobs            (id, source, external_id, title, company, location, remote,
                 min_exp, max_exp, posted_at, url, description, embedding vector(1536),
                 UNIQUE(source, external_id))
job_skills      (job_id, skill_id, importance 0..1, evidence_snippet)  PK (job_id, skill_id)
job_matches     (user_id, job_id, score, gap jsonb, computed_at)       PK (user_id, job_id)
applications    (id, user_id, job_id, status: 'saved'|'applied'|'oa'|'interview'|
                 'offer'|'rejected', applied_at, notes, timeline jsonb)

readiness_snapshots (id, user_id, role_id, taken_at, overall numeric(4,3),
                     pillars jsonb,        -- {dsa, fundamentals, dev, projects, resume, interview}
                     breakdown jsonb,      -- evidence tree for /explain
                     rubric_version)
```

Snapshots are written daily (and on significant events) so the trend line is real history, not
a recomputation of today's formula over old data.

### 3.7 Interview

```ts
interview_sessions (id, user_id, role_id, company_profile, rounds jsonb,
                    status, started_at, ended_at, overall jsonb)
interview_turns    (id, session_id, round, idx, actor: 'ai'|'user',
                    content, audio_key, tokens, latency_ms)
interview_scores   (id, session_id, round, dimension: 'understanding'|'approach'|
                    'complexity'|'communication'|'edge_cases'|'code_quality',
                    score 0..10, justification, skill_id)
```

`interview_scores` rows fan out into `evidence_events` — that is how an interview moves the
DSA number.

### 3.8 Gamification & social

```ts
xp_ledger    (id, user_id, amount, reason_code, source_type, source_id, occurred_at)  -- append only
streaks      (user_id PK, current, longest, last_active_date, freezes_left)
badges       (id, slug, name, description, icon, criteria jsonb, tier)
user_badges  (user_id, badge_id, earned_at, progress jsonb)  PK (user_id, badge_id)

follows      (follower_id, followee_id, created_at)  PK (follower_id, followee_id)
groups       (id, name, slug, owner_id, visibility, college)
group_members(group_id, user_id, role, joined_at)  PK (group_id, user_id)

battles      (id, mode: '1v1'|'group', skill_id, problem_ids[], duration_s,
              status, started_at, ended_at, created_by)
battle_participants (battle_id, user_id, score, solved, finished_at, rank)
```

Leaderboards live in Redis ZSETs (`lb:global:weekly:{isoweek}`) with a nightly Postgres
snapshot for history. Postgres is never the read path for a leaderboard.

### 3.9 Platform

```ts
ai_usage       (id, user_id, purpose, model, prompt_tokens, completion_tokens,
                cost_usd, latency_ms, ok, error, prompt_version, created_at)
feature_flags  (key PK, enabled, rollout_pct, allowlist jsonb)
audit_log      (id, actor_id, action, entity_type, entity_id, diff jsonb, created_at)
content_versions (id, entity_type, entity_id, version, payload jsonb, author_id, published_at)
```

## 4. Key invariants

1. Nothing writes `user_skill_state` except the projector, which reads `evidence_events`.
2. Nothing writes `xp_ledger` except `core/xp.ts` rule evaluation — no ad-hoc `+50` in a route.
3. Every `evidence_events` row names a `skill_id`. If an activity spans skills, write one row
   per skill with split weights. No multi-skill blobs.
4. Every score-bearing row stores `rubric_version`. A score without its rubric is meaningless.
5. Content rows are versioned and soft-deleted. A user's history must never break because an
   author edited a problem.

## 5. Sizing sanity check

Heaviest table is `evidence_events`. An active user generates roughly 60 events/day →
~22k/year. 10,000 active users ≈ 220M rows/year — beyond hobby scale but handled by the
`(user_id, skill_id, occurred_at)` index plus monthly partitioning, which can be added later
without schema redesign since the table is append-only. At realistic project scale (hundreds
to low thousands of users) a single Neon instance is comfortable.
