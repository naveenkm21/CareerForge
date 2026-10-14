# CareerForge

**Prove you're job-ready, with evidence, not vibes.**

CareerForge is a career-readiness platform for computer-science students. Pick a target role and
it measures where you actually stand, then takes you through visual lessons, judged practice,
mock interviews and job matching. **Every number it shows traces back to something you did.**

> Code → See → Understand → Solve

**[Live demo](https://career-forge-lime.vercel.app)** · **[Try the visualizer](https://career-forge-lime.vercel.app/viz/dijkstra)** · **[Demo script](docs/11-demo-script.md)** · **[Design docs](#documentation)**

![CareerForge landing page](docs/screenshots/landing-light.jpg)

---

## Contents

- [Try the demo](#try-the-demo)
- [Screenshots](#screenshots)
- [Features](#features)
- [How the numbers work](#how-the-numbers-work)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Deploy](#deploy)
- [Repository layout](#repository-layout)
- [Quality](#quality)
- [Status and limitations](#status-and-limitations)
- [Documentation](#documentation)

---

## Try the demo

|              |                                              |
| ------------ | -------------------------------------------- |
| **URL**      | https://career-forge-lime.vercel.app/sign-in |
| **Email**    | `demo@careerforge.test`                      |
| **Password** | none (demo sign-in)                          |
| **Role**     | Admin, so the Admin area is visible too      |

The demo account belongs to **Naveen**, a learner with 24 days of history: about 300 evidence
events, solved problems, a finished mock interview, a won battle, a resume and job applications,
plus five classmates on the leaderboard. Any other email creates a fresh, honestly empty account.

The site opens in light mode; the moon/sun button switches to dark and remembers your choice.

> The demo sign-in has no password, so treat the shared account as public. Production sign-in
> uses Clerk.

---

## Screenshots

### Landing page (light and dark)

| Light                                                 | Dark                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| ![Landing, light](docs/screenshots/landing-light.jpg) | ![Landing, dark](docs/screenshots/landing-dark.jpg) |

The hero shows evidence feeding the readiness number; below it is an interactive miniature of the
product (Dashboard, Visualizer, Practice, Interview tabs) with a mascot that watches your cursor.

### Dashboard and explainable readiness

| Dashboard                                    | Why is my readiness this number?                               |
| -------------------------------------------- | -------------------------------------------------------------- |
| ![Dashboard](docs/screenshots/dashboard.jpg) | ![Readiness explained](docs/screenshots/explain-readiness.jpg) |

### Learn and visualize

| 8-stage lesson ladder                  | Algorithm visualizer (Dijkstra, step 19 of 43) |
| -------------------------------------- | ---------------------------------------------- |
| ![Lesson](docs/screenshots/lesson.jpg) | ![Visualizer](docs/screenshots/visualizer.jpg) |

| Topics                               | Skill graph                                      |
| ------------------------------------ | ------------------------------------------------ |
| ![Learn](docs/screenshots/learn.jpg) | ![Skill graph](docs/screenshots/skill-graph.jpg) |

### Practice

| Problem list                               | Problem with code editor and judge       |
| ------------------------------------------ | ---------------------------------------- |
| ![Practice](docs/screenshots/practice.jpg) | ![Problem](docs/screenshots/problem.jpg) |

### Career and interviews

| Job fit from your evidence               | Resume, claims vs evidence             |
| ---------------------------------------- | -------------------------------------- |
| ![Job fit](docs/screenshots/job-fit.jpg) | ![Resume](docs/screenshots/resume.jpg) |

| Mock interview with rubric                           | Sign in                                  |
| ---------------------------------------------------- | ---------------------------------------- |
| ![Interview](docs/screenshots/interview-session.jpg) | ![Sign in](docs/screenshots/sign-in.jpg) |

### Community and admin

| Leaderboards                                 | 1v1 battles                              |
| -------------------------------------------- | ---------------------------------------- |
| ![Community](docs/screenshots/community.jpg) | ![Battles](docs/screenshots/battles.jpg) |

![Admin analytics](docs/screenshots/admin.jpg)

---

## Features

### See it: algorithm visualizer

- **23 algorithms** across arrays, searching, sorting, stacks and queues, trees, heaps, graphs,
  dynamic programming, operating systems and networks.
- **One trace, every view.** Each algorithm is written once; the animation, line-by-line code in
  **C++, Java, Python and TypeScript**, the variable panel and the practice questions all come
  from the same recorded trace, so they can never disagree.
- **Predict mode** pauses at each decision ("which node does Dijkstra settle next?") and answers
  a wrong guess with the invariant you broke.
- Edit the input, scrub, change speed, deep-link to any step (`/viz/dijkstra?step=18`).
  Public: no account needed.

### Learn it: the 8-stage ladder

- **19 topics**, each the same ladder: **Understand → Visualize → Trace → Predict → Implement →
  Test → Explain → Interview**.
- Lessons mix text, live visualizations, checkpoints, quizzes, judged problems and written
  explanations that a rubric grades. Every step writes evidence.

### Prove it: judged practice

- **29 problems** with hidden tests, a Monaco code editor and four languages.
- Verdicts: Accepted, Wrong Answer (with the failing case), Time Limit, Runtime Error, Compile
  Error. Hints and the editorial are available, and using them discounts the evidence.
- Three judge backends behind one interface:
  - **Judge0** in production (isolated, no network);
  - **local toolchains** for development (refuses to run in production);
  - **AI code review via OpenRouter** (free models) when no runner is available. It reads the code
    against the tests; code, not the model, counts passes, results are labelled
    _AI-reviewed · not executed_, and the evidence counts half.

### Measure it: explainable readiness

- **Mastery per skill** from a Bayesian (Beta) model: harder problems count more, hints and
  repeated attempts count less, and confidence decays when you stop practising.
- **Readiness** combines six pillars (DSA, CS fundamentals, development, projects, resume,
  interview) weighted by the target role, and is capped while core skills are weak.
- **Click any number** to see the arithmetic, then the skills, then the individual events.
- **Skill graph** of prerequisites, coloured by your status against the role target.
- **Daily plan** chosen deterministically from gaps, prerequisites and decay; each task says why.
- XP, streaks and 10 badges, all derived from the same evidence.

### Get hired: career intelligence

- **Resume analysis**: extracts skill claims and checks each one against your evidence.
- **Job fit**: paste any job description and get the skills it asks for, the sentence that
  mentions each, your fit percentage, and gaps that link straight into Learn or Practice.
- **Application tracker** from saved to offer.

### Practise talking: mock interviews

- Three-round sessions (coding, CS concepts, behavioural) with adaptive follow-up questions.
- A rubric per round. Graded by Claude when an API key is set, or by a deterministic rubric
  judge otherwise; either way the model only picks a level and the score is computed in code.

### Together: community

- Weekly, friends, college and all-time **leaderboards**, follows, and **1v1 battles**.

### Run it: admin

- Analytics from the product's own tables: hardest problems and questions, ladder drop-off,
  time per topic.
- **Problem CMS** with versioning, an audit log and "verify against the reference solution".

### Design

- An editorial look shared by the landing page and the app: warm stone neutrals, one cyan
  accent, Inter Tight headings, flat hairline cards, pill controls.
- Light by default, with a dark mode built from the same palette; respects reduced motion.

---

## How the numbers work

**1. Evidence is the source of truth.** Every action (a quiz answer, a checkpoint, a judged
submission, a graded explanation, an interview round) is appended to an `evidence_events` log.
The log is append-only, enforced by **database triggers** that reject `UPDATE` and `DELETE`.
Mastery, readiness, XP and streaks are projections that can be rebuilt from it at any time.

**2. One trace, every view.** Algorithms are authored once as instrumented reference
implementations. Animation, code highlighting, scrubbing, predict-mode checkpoints and assessment
questions are pure functions of that trace.

**3. AI never produces a number.** Models generate language and qualitative levels (weak,
developing, solid, strong). Code maps levels to scores. Every score, ordering and recommendation
is deterministic and reproducible.

---

## Tech stack

| Layer              | Choice                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Web app            | Next.js 15 (App Router, server actions), React 19, TypeScript (strict)                    |
| Styling and motion | Tailwind CSS 4, motion, lucide-react, Monaco editor, React Flow                           |
| Data               | PostgreSQL (Neon in production, embedded PGlite locally), Drizzle ORM                     |
| Auth               | Clerk in production; signed-cookie dev sign-in for local and demo                         |
| Code judge         | Judge0, local toolchains, or AI review via OpenRouter                                     |
| AI                 | Claude (`claude-opus-5-5`) for interviews and explanations, with a deterministic fallback |
| Monorepo and tests | pnpm, Turborepo, Vitest, ESLint, Prettier                                                 |
| Hosting and CI     | Vercel, Neon, GitHub Actions                                                              |

---

## Run it locally

Requires **Node 22** and **pnpm 11**. No Docker needed: local development uses an embedded
Postgres. For real local verdicts, install the toolchains you want to judge (g++, javac, python,
node).

```bash
pnpm install
```

```bash
cp .env.example apps/web/.env.local
```

```bash
pnpm db:setup
```

```bash
pnpm db:demo
```

```bash
pnpm dev
```

Open http://localhost:3000/sign-in and sign in as **demo@careerforge.test**.

`pnpm db:setup` creates the tables and the curriculum; `pnpm db:demo` adds the demo learner and
five classmates. Run them with the dev server stopped: the embedded database is single-process.
If it ever gets corrupted (for example after a hard-killed server), rebuild it with
`pnpm db:reset && pnpm db:demo`.

---

## Deploy

The production setup is **Vercel** (the web app, root directory `apps/web`) plus **Neon**
(Postgres, created from Vercel's Storage tab) plus **GitHub Actions**.

| Variable                                        | Where                                   | Purpose                                              |
| ----------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                                  | Vercel, GitHub `production` environment | Neon pooled connection string                        |
| `ENABLE_EXPERIMENTAL_COREPACK=1`                | Vercel                                  | Build with the repo's pnpm version                   |
| `NEXT_PUBLIC_APP_URL`                           | Vercel                                  | The site's public URL                                |
| `AUTH_SECRET`                                   | Vercel                                  | Signs session cookies (32+ random characters)        |
| `NEXT_PUBLIC_AUTH_PROVIDER`, `ALLOW_DEV_AUTH=1` | Vercel                                  | Demo sign-in (use Clerk keys for real users)         |
| `OPENROUTER_API_KEY`                            | Vercel                                  | Optional: AI code review when no judge runner exists |
| `ANTHROPIC_API_KEY`                             | Vercel                                  | Optional: Claude grades interviews and explanations  |

Every push to `main` runs CI (format, lint, type checks, tests against a real Postgres, build),
then migrates and seeds the production database and loads the demo account if it is missing.
Vercel deploys each push automatically.

There is also `pnpm package:beanstalk --demo-db`, which builds a self-contained zip for AWS
Elastic Beanstalk with the demo database inside (used for a cloud-computing case study).

---

## Repository layout

```text
apps/web            Next.js app: landing, learn, practice, explain, career, interview, community, admin
apps/gateway        Service for stateful work (sockets, jobs); health endpoint today
packages/viz        Pure trace engine: recorder, 23 algorithms, invariants, line-anchor codegen
packages/viz-react  Renderers (array, matrix, tree, graph, stack/queue, table, flow) and the player
packages/core       Pure domain logic: mastery, decay, gating, readiness, planner, XP, badges, career
packages/db         Drizzle schema, migrations (append-only triggers), repositories, seeds, demo data
packages/content    Curriculum: 29 problems, 19 topics, 40 questions, jobs, interview bank
packages/judge      Code judge: Judge0, local toolchains, OpenRouter AI review
packages/ai         Interview and explanation judge (Claude, or a deterministic fallback)
packages/auth       Auth facade: Clerk in production, signed-cookie dev provider
packages/contracts  Zod schemas shared by forms, server actions and content
packages/ui         Design tokens and UI primitives
content/            Skills graph, roles, feature flags (YAML)
docs/               Design documents, build log, demo script, screenshots
scripts/            Elastic Beanstalk packaging script
```

---

## Quality

| Command              | What it checks                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm test`          | 339 unit, property, golden-trace, invariant and judge tests (+ database integration tests in CI) |
| `pnpm typecheck`     | Strict TypeScript across every package                                                           |
| `pnpm lint`          | ESLint, including rules that keep the pure packages free of I/O                                  |
| `pnpm format:check`  | Prettier                                                                                         |
| `pnpm codegen:check` | The code-line anchor index matches the algorithm sources                                         |

Highlights: every algorithm is checked against an independent oracle, every C++ editorial is
compiled and judged against its own tests, and the scoring engine has property tests (mastery
stays within 0 and 1, wrong answers never raise it, decay is monotone, core blockers always cap).

---

## Status and limitations

All 12 build phases are complete and deployed. Deliberate simplifications for this version:

- Battles are asynchronous (both players solve, then the battle settles), not live sockets.
- Leaderboards aggregate in Postgres rather than Redis.
- On the hosted demo, code is AI-reviewed rather than executed unless a Judge0 server is
  configured.
- Content depth: 23 algorithms, 29 problems and 19 topics rather than the full planned library.

See [10 — Build Log](docs/10-build-log.md) for the full list.

---

## Documentation

| Doc                                                          | Contents                                                |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| [00 — Product Spec](docs/00-product-spec.md)                 | What it is, the 8-stage ladder, explicit non-goals      |
| [01 — Architecture](docs/01-architecture.md)                 | Deployables, monorepo layout, request paths, security   |
| [02 — Data Model](docs/02-data-model.md)                     | Every table and the append-only evidence log            |
| [03 — Visualization Engine](docs/03-visualization-engine.md) | Traces, authoring API, line anchors, renderers          |
| [04 — Scoring Engine](docs/04-scoring-engine.md)             | Mastery, decay, prerequisite gating, readiness, planner |
| [05 — AI Layer & Execution](docs/05-ai-layer.md)             | Sanctioned AI jobs, guardrails, the code judge          |
| [06 — Build Plan](docs/06-build-plan.md)                     | 12 phases as vertical slices with exit criteria         |
| [07 — Decisions (ADR)](docs/07-decisions.md)                 | Architecture decisions with rationale                   |
| [08 — Risks & Open Questions](docs/08-risks.md)              | What could go wrong                                     |
| [09 — v1 Schedule](docs/09-v1-schedule.md)                   | The 8-week plan and $0 infrastructure                   |
| [10 — Build Log](docs/10-build-log.md)                       | What each phase delivers and what is simplified         |
| [11 — Demo Script](docs/11-demo-script.md)                   | A 10-minute walkthrough and likely questions            |

---

Built by [naveenkm21](https://github.com/naveenkm21).
