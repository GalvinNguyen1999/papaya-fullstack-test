# Papaya Claims Platform

Full-stack insurance claims portal built for the Papaya Full-Stack Engineer test.
It combines **6 AI Engineering Challenges** (#01, #06, #07, #09, #11, #14) into one
usable product: choose a plan → submit a claim → AI assesses it → ops drives it
through the claim lifecycle.

**Two independent sources** (no monorepo, no pnpm — each is its own npm project):

```
papaya-claims-platform/
├── backend/    # NestJS + Prisma + PostgreSQL   (REST API + Swagger)
├── frontend/   # Next.js (App Router) + Tailwind (member + ops UI)
├── render.yaml         # deploy: Postgres + backend on Render
├── docker-compose.yml  # local Postgres
├── DOMAIN.md           # business context — what insurance claims are & the lifecycle
├── PLAN.md             # full design/architecture doc
└── Logical_Questions/  # the written part of the test
```

## Architecture in one line

Layered / Clean: **business logic lives in the backend `src/domain/` (pure, fully
unit-tested)**, wrapped by thin Application services, Repositories, and Presentation
controllers; the frontend is MVVM (View → ViewModel hooks → Model api client), with
its own tested presentation helpers in `utils/`.
See `PLAN.md` for the layer breakdown and a request trace.

## Run locally

```bash
# 1) Postgres
docker compose up -d

# 2) Backend  (http://localhost:4000, Swagger at /api/docs)
cd backend
cp .env.example .env          # DATABASE_URL points at the docker Postgres
npm install
npm run prisma:generate
npm run db:push               # sync schema to the database (idempotent)
npm run seed                  # demo plans + sample claims
npm run start:dev

# 3) Frontend (http://localhost:3000)
cd ../frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev
```

## Run end-to-end & verify

The quickest way to confirm the whole flow works on your machine:

```bash
# 0) Postgres
docker compose up -d

# 1) Backend (terminal 1)
cd backend && cp .env.example .env && npm install
npx prisma generate && npx prisma db push && npm run seed
npm run start:dev                     # http://localhost:4000/api/docs (Swagger)

# 2) Frontend (terminal 2)
cd frontend && cp .env.example .env.local && npm install
npm run dev                           # http://localhost:3000
```

Then walk the real flow: **Member** → `/plans` → *Choose a plan* → submit a claim →
see it in `/claims`. **Admin** → `/admin/claims` → *Review* → *Run AI assessment* →
advance the workflow → watch `/admin/dashboard` update.

## Tests

```bash
cd backend  && npm test     # 42 Jest tests
cd frontend && npm test     # 12 Vitest tests
```

| Suite | What it covers |
|-------|----------------|
| Backend **unit** (`src/domain/*.spec.ts`) | coverage engine, assessment verdict, workflow machine, policy mapper, analytics — pure business logic |
| Backend **integration** (`*.service.spec.ts`) | full use-cases via a fake repository (no DB): create claim, the 3 assessment outcomes, workflow transitions + guards |
| Frontend (`src/utils/*.spec.ts`) | plan comparison + claim progress-tracker helpers |

> The automated suites run without a database (the integration tests use a fake
> repository). The **DB-backed path** (Prisma + Postgres) is exercised by the
> manual run above and the seed script — verify it once with `docker compose up`.

## Deploy (free)

- **Backend + Postgres → Render:** push to GitHub, "New → Blueprint", pick the repo
  (`render.yaml` provisions Postgres + the Docker web service from `backend/`; it
  creates tables and seeds demo data on first boot).
- **Frontend → Vercel:** import the repo, set **Root Directory = `frontend`**, add
  `NEXT_PUBLIC_API_URL` = your Render backend URL (with `/api`).

LLM is optional: set `OPENAI_API_KEY` or `JINA_API_KEY` (free) for AI-written
narratives; with neither, a deterministic template is used and everything still works.

## The 6 challenges → where they live

| # | Challenge | Backend | Frontend |
|---|-----------|---------|----------|
| 01 | Plan comparison | `plans/` | `app/(member)/plans` + `utils/plan-compare.ts` |
| 07 | Claims intake wizard | `claims/` | `app/(member)/claims/new` |
| 06 | Benefits calculator | `domain/benefits.engine.ts` | used via API |
| 11 | Claim assessment AI agent | `assessment/` + `domain/assessment.report.ts` | `app/admin/claims/[id]` |
| 14 | Workflow orchestrator | `workflow/` + `domain/workflow.machine.ts` | admin review + timeline |
| 09 | Analytics dashboard | `analytics/` + `domain/analytics.ts` | `app/admin/dashboard` |

## Known limitations & trade-offs

Honest scope notes (deliberate, given this is a take-home):

- **Authn/authz is simulated.** The actor role is passed per request (`actorRole`)
  rather than from a real auth session. The workflow *does* enforce role-per-transition;
  wiring it to real auth (JWT + guards) is the natural next step.
- **Two independent sources, not a monorepo.** Chosen for readability — each side is a
  plain npm project with no shared-package build step. The small type duplication is the
  trade-off.
- **LLM is optional and used only as a narrator.** The verdict and clause citations are
  computed deterministically in `domain/`, so the agent can't hallucinate policy terms and
  the app runs with no API key.
- **Schema is synced with `prisma db push`** (no committed migration history). This keeps
  the demo simple; production would use `prisma migrate` with versioned migrations. Use
  `npm run db:push` (not `migrate deploy`).
- **No pagination / heavy indexes yet.** Fine for the demo dataset; `/claims` would need
  pagination and DB indexes at scale.
- **Currency is data, not code** (`THB` per the brief). A real multi-country setup would
  add an FX/locale layer — the engine already reads currency from the policy.
- **Frontend tests cover pure utils**, not full component/e2e flows (Playwright would be
  the next addition).
