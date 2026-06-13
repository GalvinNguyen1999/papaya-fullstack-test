# Backend — Papaya Claims API (NestJS + Prisma)

Independent npm project. **Layered, with each layer in its own file** so it is
easy to read:

- **Presentation** — `*.controller.ts` (HTTP only, no logic)
- **Application** — `*.service.ts` (orchestration, no DB, no math)
- **Domain / business logic** — `src/domain/*.ts` (pure, fully unit-tested)
- **Infrastructure** — `*.repository.ts` (the only place that touches Prisma) + `llm/`

```
src/
├── domain/         # ★ pure business logic + types + tests
│   ├── benefits.engine.ts      (.spec.ts)   # #06 coverage engine
│   ├── assessment.report.ts    (.spec.ts)   # #11 verdict + grounded citations
│   ├── workflow.machine.ts     (.spec.ts)   # #14 state machine
│   ├── policy.mapper.ts        (.spec.ts)   # plan → engine policy
│   ├── analytics.ts            (.spec.ts)   # #09 dashboard aggregation
│   └── types.ts
├── plans/      plans.controller · plans.service · plans.repository
├── claims/     claims.controller · claims.service · claims.repository
├── assessment/ assessment.controller · assessment.service · assessment.repository
├── workflow/   workflow.controller · workflow.service · workflow.repository
├── analytics/  analytics.controller · analytics.service · analytics.repository
├── calculator/ calculator.controller · calculator.service
├── llm/        # OpenAI → Jina → template narrator
└── prisma/     # PrismaService (injected only into repositories)
```

> Every module follows the same shape: **controller → service → repository → domain**.
> Services never import Prisma; controllers never contain logic; business rules
> live only in `domain/`.

## Run

```bash
docker compose up -d            # from repo root: local Postgres
cp .env.example .env
npm install
npx prisma generate
npm run db:push                 # create/sync tables (this project uses db push)
npm run seed                    # demo data
# stuck on P3005 or want a clean slate? → npm run db:reset && npm run seed
npm run start:dev               # http://localhost:4000  ·  Swagger /api/docs
```

## Test

```bash
npm test        # Jest — 27 tests across the 4 utils modules
```

## Environment

| Var | Default | Notes |
|-----|---------|-------|
| `DATABASE_URL` | — | Postgres connection string |
| `CORS_ORIGIN` | `*` | frontend origin(s), comma-separated |
| `OPENAI_API_KEY` | — | optional; first in the LLM chain |
| `JINA_API_KEY` | — | optional; free fallback |
| `PORT` | 4000 | |

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | status + active LLM provider |
| GET | `/api/plans` | plans + recommended |
| GET | `/api/policies` | policies for the wizard |
| POST | `/api/claims` | create a claim (#07) |
| GET | `/api/claims` · `/api/claims/:id` | list / detail |
| POST | `/api/claims/:id/assess` | run AI assessment (#11/#06) |
| GET | `/api/claims/:id/transitions` | allowed next states |
| POST | `/api/claims/:id/transition` | advance state (#14) + audit |
| GET | `/api/claims/:id/events` | audit trail |
| POST | `/api/calculator/run` · GET `/api/calculator/defaults` | engine (#06) |
| GET | `/api/analytics/summary` | dashboard KPIs (#09) |

## Deploy
Docker (`Dockerfile`) on Render via the root `render.yaml`. Container runs
`prisma db push` then starts the API.
