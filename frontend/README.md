# Frontend — Papaya Claims (Next.js + shadcn/ui, MVVM)

Independent npm project, built with **shadcn/ui** (Radix + Tailwind). MVVM:
**View** (pages/components) → **ViewModel** (`hooks/` + TanStack Query) →
**Model** (`lib/api.ts`). Pure helpers live in `src/utils/` and are unit-tested.

**Two separate flows** with their own layout + navigation:

```
src/
├── app/
│   ├── page.tsx                       # landing — pick Member or Admin
│   ├── (member)/                      # ── MEMBER flow (root URLs) ──
│   │   ├── layout.tsx                 #   member nav
│   │   ├── plans/                     #   #01 compare + choose
│   │   ├── claims/                    #   my claims list
│   │   ├── claims/new/                #   #07 intake wizard
│   │   └── claims/[id]/               #   claim status + progress tracker
│   └── admin/                         # ── ADMIN flow (/admin/*) ──
│       ├── layout.tsx                 #   admin nav (dark)
│       ├── dashboard/                 #   #09 KPIs + charts
│       ├── claims/                    #   claims queue
│       └── claims/[id]/               #   #11 assess · #14 workflow · audit
├── components/
│   ├── ui/                            # shadcn primitives (button, card, table…)
│   └── app/                           # composites (status-badge, progress-tracker…)
├── hooks/useApi.ts                    # ViewModels
├── lib/{api.ts,utils.ts}              # Model + cn()
├── utils/
│   ├── plan-compare.ts (.spec.ts)     # ★ best-in-row + recommended
│   ├── lifecycle.ts    (.spec.ts)     # ★ progress tracker steps
│   ├── validation.ts                  # zod schema + required docs
│   └── format.ts
└── types.ts
```

## Run

```bash
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                     # http://localhost:3000
```

## Test

```bash
npm test        # Vitest — 12 tests (plan-compare + lifecycle utils)
```

## Build / deploy

```bash
npm run build
```

Deploy on **Vercel**: import the repo, set **Root Directory = `frontend`**, and add
`NEXT_PUBLIC_API_URL` = your backend URL including `/api`.
