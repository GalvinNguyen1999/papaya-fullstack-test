# Kế hoạch xây dựng — Papaya Claims Platform

App full-stack, dùng được thật, deploy được. Gom 6 challenge thành **một cổng xử lý
bồi thường (claims portal) 2 phía**: phía khách nộp claim, phía nhân viên xử lý.

> Tài liệu này là PLAN — đọc và duyệt trước, rồi mới bắt đầu code.

---

## 1. Phân tích yêu cầu

### 6 challenge → một sản phẩm

| # | Challenge | Vai trò trong app | Phía |
|---|-----------|-------------------|------|
| 01 | Plan Comparison | Trang chọn gói bảo hiểm (màn vào) | Khách |
| 07 | Claims Intake Wizard | Form nhiều bước nộp claim (lưu DB thật) | Khách |
| 06 | Benefits Calculator | Engine tính số tiền được chi trả | Hệ thống |
| 11 | Claim Assessment AI Agent | AI thẩm định → APPROVE/REJECT/REQUEST_INFO | Nhân viên |
| 14 | Workflow Orchestrator | Vòng đời trạng thái claim + audit log + phân quyền | Nhân viên |
| 09 | Analytics Dashboard | Thống kê claim cho team vận hành | Nhân viên |

### Hai luồng người dùng thật

**Khách hàng (member):**
`Chọn gói (#01)` → `Nộp claim qua wizard (#07)` → nhận mã claim → `Theo dõi trạng thái`.

**Nhân viên (assessor/ops):**
`Xem hàng đợi claim` → `Bấm "AI thẩm định" (#11, gọi #06 tính tiền)` → `Duyệt/từ chối, đẩy trạng thái theo workflow (#14)` → `Xem dashboard tổng quan (#09)`.

### Yêu cầu phi chức năng
- Dữ liệu **lưu thật** (Postgres) — nộp claim xong, refresh vẫn còn.
- Deploy free, có **live URL** dùng được.
- AI agent **không bịa điều khoản** — verdict tính deterministic, LLM chỉ diễn giải.
- Có test (unit cho engine/agent/workflow), có seed data để demo ngay.

---

## 2. Kiến trúc tổng thể

```
        ┌─────────────────────────┐         ┌──────────────────────────────┐
        │  frontend/  (Next.js)    │  HTTPS  │  backend/  (NestJS)          │
        │  - App Router, TS        │ ──────▶ │  - REST + Swagger            │
        │  - Tailwind              │  JSON   │  - Prisma ORM                │
        │  - TanStack Query        │         │  - modules theo domain       │
        │  - react-hook-form + zod │ ◀────── │  - LLM: OpenAI→Jina→template  │
        └─────────────────────────┘         └───────────────┬──────────────┘
              deploy: Vercel                                 │ Prisma
                                                  ┌──────────▼───────────┐
                                                  │  PostgreSQL (Render) │
                                                  └──────────────────────┘
                                                   deploy: Render (Docker)
```

**Hai source ĐỘC LẬP, KHÔNG monorepo, KHÔNG pnpm** — mỗi bên là một project npm riêng,
cài/chạy/đọc độc lập (không có workspace linking, không có package shared):
```
papaya-claims-platform/
├── backend/          # NestJS — npm install & npm run ở đây
│   ├── src/
│   │   ├── utils/    # ★ LOGIC NGHIỆP VỤ THUẦN + TYPES + TEST (.spec.ts)
│   │   └── <modules>/…
│   └── package.json
└── frontend/         # Next.js — npm install & npm run ở đây
    ├── src/
    │   ├── utils/    # ★ helper thuần (vd so sánh gói) + TEST
    │   └── …
    └── package.json
```
> Không dùng package `shared`. Mỗi source tự khai báo type nó cần (trùng lặp nhỏ,
> đổi lại 2 codebase đọc độc lập, rõ ràng, không phụ thuộc nhau).

### Stack chi tiết
- **Frontend:** Next.js (App Router) · TypeScript · TailwindCSS · TanStack Query
  (gọi API + cache) · react-hook-form + zod (wizard #07) · Recharts (dashboard #09).
  Quản lý gói bằng **npm**.
- **Backend:** NestJS · TypeScript · Prisma (ORM) · PostgreSQL · class-validator (DTO) ·
  Swagger (`/api/docs`) · Jest (test). Quản lý gói bằng **npm**.
- **LLM (#11):** client OpenAI-compatible với **chuỗi fallback nhiều nhà cung cấp**:
  1) **OpenAI** nếu có `OPENAI_API_KEY` → 2) **Jina (free)** nếu có `JINA_API_KEY`
  (không cần OpenAI vẫn chạy được) → 3) **template** nếu không có key nào (vẫn chạy,
  deploy free thoải mái). Verdict luôn do `utils` tính, **không phụ thuộc LLM** —
  LLM chỉ viết narrative cho người đọc.

### Quy ước "logic nghiệp vụ → utils + test"
Mọi logic nghiệp vụ thuần (không dính HTTP/DB/framework) đặt trong `src/utils/` và
**bắt buộc có file test cạnh bên** (`*.spec.ts`):
- Backend `src/utils/`: `benefits.engine.ts`, `assessment.report.ts`, `workflow.machine.ts`,
  `policy.mapper.ts` (+ `types.ts`, `enums.ts`) — mỗi file logic có `*.spec.ts`.
- Frontend `src/utils/`: `plan-compare.ts` (tính gói "Best" từng dòng + Recommended),
  `format.ts` — kèm `*.spec.ts`.
Service/Controller (backend) và View/Hook (frontend) chỉ *gọi* utils, không chứa logic.

---

## 2b. Kiến trúc phân lớp & trách nhiệm từng layer

App theo **Layered Architecture mang tinh thần Clean Architecture**: domain (nghiệp vụ
thuần) nằm ở trung tâm, các layer ngoài phụ thuộc vào trong. Tổng cộng **4 layer ở
backend + 3 layer ở frontend**, nối nhau qua HTTP/JSON.

```
 FRONTEND — Next.js (MVVM)            BACKEND — NestJS (Clean / Layered)
 ┌──────────────────────────┐        ┌────────────────────────────────────────┐
 │ 1 View       pages/comp  │        │ 1 Presentation   Controller + DTO        │
 │ 2 ViewModel  hooks+Query │ ─HTTP▶ │ 2 Application     Service / use-case      │
 │ 3 Model      api client  │ ◀JSON─ │ 3 utils ★        engine #06 · #11 · #14  │
 │ + utils ★ (compare,test) │        │ 4 Infrastructure Repo · Prisma · LLM     │
 └──────────────────────────┘        └───────────────────┬────────────────────┘
   (2 codebase độc lập, npm riêng)            │ Prisma
                                     ┌────────▼─────────┐
                                     │ PostgreSQL       │
                                     └──────────────────┘
   Dependency Rule: mọi mũi tên hướng VÀO utils. utils không biết HTTP/Prisma/LLM.
```

### Backend — 4 layer (NestJS)

1. **Presentation (Controller + DTO).** Cửa vào HTTP: nhận request, validate đầu vào
   bằng DTO/class-validator, gọi đúng Service, trả JSON + mã lỗi, sinh Swagger.
   **Không chứa business logic.** VD: `ClaimsController`, `AssessmentController`.
2. **Application (Service / use-case).** "Nhạc trưởng" cho mỗi tình huống nghiệp vụ
   (thẩm định claim, đẩy trạng thái). **Điều phối**: lấy dữ liệu qua Repo → gọi Domain
   xử lý → gọi LLM/Infra → lưu qua Repo. Không tự tính nghiệp vụ. VD: `AssessmentService`.
3. **utils (nghiệp vụ thuần) ★ — trung tâm.** Đặt trong `src/utils/`. Toàn bộ luật bảo
   hiểm: engine tính tiền #06, bộ dựng verdict + citation #11, state-machine #14.
   **Không import NestJS, Prisma hay HTTP** → test cực dễ (mỗi file có `*.spec.ts`),
   không vỡ khi đổi framework/DB. Phần đáng giá nhất.
4. **Infrastructure (Repository + Prisma + LLM client).** Tiếp xúc thế giới ngoài:
   đọc/ghi Postgres qua Prisma, gọi API LLM. Application chỉ gọi qua *interface* nên
   thay Postgres→SQLite hay Jina→Groq mà Domain không hề biết.

### Frontend — 3 layer (Next.js, MVVM)

1. **View** — page/component, chỉ hiển thị + bắt sự kiện. Không gọi API, không logic.
2. **ViewModel** — hooks + TanStack Query: state, gọi API, cache, loading/error.
   VD: `useClaim(id)`, `useAssess()`.
3. **Model** — `lib/api.ts` (client HTTP duy nhất, nơi duy nhất biết URL backend) +
   type khai báo cục bộ trong frontend. Helper thuần (so sánh gói…) nằm ở `src/utils/`
   kèm test, View chỉ gọi.

### Quy tắc phụ thuộc (Dependency Rule)

Presentation → Application → Domain; Infrastructure cũng phụ thuộc Domain (qua interface).
**Domain không phụ thuộc ai** — không biết có HTTP, Postgres hay LLM. Nhờ vậy cùng một
engine #06 chạy được trong API, trong unit test, hay bê sang dự án khác đều được.

### Ví dụ một request đi qua đủ các layer — `POST /claims/:id/assess`

1. **Controller** nhận request, validate `id`.
2. **AssessmentService (Application)** điều phối toàn bộ.
3. **Repository (Infra)** đọc claim + policy + documents từ Postgres.
4. **Domain** chạy 4 tool → tính tiền (#06) → dựng verdict + citation (#11).
5. **LLM client (Infra)** viết narrative cho người đọc (fallback template nếu không key).
6. **Repository (Infra)** lưu bản ghi `Assessment`.
7. **Controller** trả JSON → **ViewModel** (TanStack Query) → **View** hiển thị.

---

## 3. Mô hình dữ liệu (Prisma / Postgres)

```
Plan         (gói bán: Bronze/Silver/Gold) ── seed
  id, name, monthlyPremium, annualLimit, copayPct, waitingDays,
  benefits(jsonb), highlights(string[])

Member       (người mua)
  id, name, email, dateOfBirth

Policy       (hợp đồng = Plan đã phát hành cho Member)
  id, policyNumber, memberId→Member, planId→Plan,
  coverageStart, coverageEnd, active

Claim        (trung tâm)
  id, claimNumber, policyId→Policy, claimType(enum),
  diagnosis, icd10, procedures(string[]), amount,
  treatmentStart, treatmentEnd,
  status(enum: SUBMITTED…CLOSED), createdAt

Document     (giấy tờ của claim)
  id, claimId→Claim, type, expectedType, status(enum), issues(string[])

Assessment   (kết quả AI #11)
  id, claimId→Claim, recommendation(enum), reasoning,
  coveredAmount, copayAmount, memberPays, narrative,
  citations(jsonb), toolLogs(jsonb), createdAt

ClaimEvent   (audit log #14 — immutable)
  id, claimId→Claim, fromState, toState,
  actorRole, actorId, reason, createdAt
```

`benefits` lưu jsonb để engine #06 đọc trực tiếp (limit/visit, events/year, sub-limit…).

---

## 4. Backend — `backend/` (NestJS, npm)

```
backend/src/
├── utils/         # ★ logic nghiệp vụ THUẦN + types + TEST
│   ├── benefits.engine.ts      (+ benefits.engine.spec.ts)   # #06
│   ├── assessment.report.ts    (+ assessment.report.spec.ts) # #11 verdict
│   ├── workflow.machine.ts     (+ workflow.machine.spec.ts)  # #14
│   ├── policy.mapper.ts        (+ policy.mapper.spec.ts)
│   ├── types.ts · enums.ts                                   # type cục bộ của BE
├── claims/        # CRUD claim, intake (#07), list/detail
├── assessment/    # #11 — 4 tool + gọi utils + LLM (Application)
├── workflow/      # #14 — service gọi utils, ghi audit (Application)
├── analytics/     # #09 — query tổng hợp cho dashboard
├── plans/         # #01 — trả về plans + recommended
├── calculator/    # #06 — endpoint chạy engine
├── llm/           # provider chain: OpenAI → Jina (free) → template
└── prisma/        # PrismaService
```

### API surface (REST, có Swagger)
| Method | Path | Bài | Mô tả |
|--------|------|-----|-------|
| GET | `/plans` | 01 | Danh sách gói + recommended |
| POST | `/claims` | 07 | Tạo claim (kèm documents) |
| GET | `/claims` | 14/09 | List claim (filter status, phân trang) |
| GET | `/claims/:id` | – | Chi tiết claim + documents + events |
| POST | `/claims/:id/assess` | 11/06 | Chạy AI thẩm định, lưu Assessment |
| POST | `/claims/:id/transition` | 14 | Đẩy trạng thái (kèm role, reason) → ghi audit |
| GET | `/claims/:id/events` | 14 | Audit trail |
| POST | `/calculator/run` | 06 | Tính thử (policy + expenses) |
| GET | `/analytics/summary` | 09 | KPI + dữ liệu chart |

### Logic lõi cần đúng (dễ mất điểm)
- **#06:** xử lý expense **theo thứ tự thời gian**; pure function; có ≥12 unit test.
- **#11:** gọi đủ 4 tool; thiếu giấy tờ → REQUEST_INFO (không reject); mọi citation lấy
  từ policy thật; log tool calls.
- **#14:** state machine từ **config**; chặn transition sai + sai role; audit immutable;
  giới hạn 3 vòng PENDING_INFO.

---

## 5. Frontend — `frontend/` (Next.js App Router, npm)

```
frontend/src/
├── app/
│   ├── plans/page.tsx              # #01 chọn gói
│   ├── claims/new/page.tsx         # #07 wizard 5 bước
│   ├── claims/[id]/page.tsx        # theo dõi trạng thái claim (member)
│   ├── ops/queue/page.tsx          # hàng đợi claim (nhân viên)
│   ├── ops/claims/[id]/page.tsx    # #11 AI thẩm định + #14 đẩy trạng thái
│   └── ops/dashboard/page.tsx      # #09 KPI + charts
├── lib/api.ts                      # Model — client gọi API (nơi duy nhất biết URL)
├── utils/          # ★ helper THUẦN + TEST
│   ├── plan-compare.ts (+ plan-compare.spec.ts)  # tính "Best"/Recommended
│   └── format.ts
├── hooks/                          # ViewModel — TanStack Query
├── components/                     # UI primitives (Tailwind)
└── types.ts                        # type cục bộ của FE
```

MVVM: `lib/api.ts` + hooks (`useClaims`, `useAssess`…) = ViewModel · page/component = View ·
type cục bộ = Model. Logic so sánh gói tách ra `utils/plan-compare.ts` + test.

Wizard #07: 5 bước (loại claim → thông tin member → chẩn đoán/điều trị → giấy tờ →
review & submit), state giữ qua các bước bằng react-hook-form, validate bằng zod.

---

## 6. Thứ tự build (milestones)

1. **Scaffold 2 source** — `backend/` (NestJS, npm) + `frontend/` (Next.js, npm), độc lập.
2. **utils backend (#06/#11/#14/mapper)** + unit test — làm trước vì nghiệp vụ là lõi.
3. **DB & Prisma** — schema, migrate, seed Plans + Member/Policy + sample claims.
4. **Claims module (#07 BE)** — tạo/list/detail claim + documents.
5. **Workflow (#14)** — service gọi utils, transition + audit + guard.
6. **Assessment (#11)** — 4 tool, gọi utils, LLM provider, lưu Assessment.
7. **Analytics (#09) + Calculator (#06) + Plans (#01)** — endpoints.
8. **Frontend** — utils + test → plans → wizard → claim detail → ops queue/review → dashboard.
9. **LLM thật (OpenAI/Jina)** — cắm key, kiểm tra fallback template.
10. **Deploy** — Postgres + backend lên Render, frontend lên Vercel, nối env.
11. **Docs** — README mỗi source (run + deploy), APPROACH (nghiệp vụ + kiến trúc).

---

## 7. Testing & chất lượng
- **Unit (Jest):** benefits rules, assessment outcomes (3 case), workflow transitions
  (happy/invalid/unauthorized/cycle).
- **E2E API (Jest + supertest):** nộp claim → assess → transition → đọc lại.
- **Seed data** để demo có sẵn vài claim ở các trạng thái khác nhau.
- Mục tiêu: mọi luồng chính có test xanh trước khi deploy.

---

## 8. Deploy (free)
- **Postgres:** Render free Postgres → lấy `DATABASE_URL`.
- **Backend (NestJS):** Render Web Service (Docker, root = `backend/`), chạy
  `prisma migrate deploy` khi start, set `DATABASE_URL`, `CORS_ORIGIN`, và (tùy chọn)
  `OPENAI_API_KEY` / `JINA_API_KEY` — để trống cả hai thì LLM chạy template, app vẫn chạy.
- **Frontend (Next.js):** Vercel (root = `frontend/`), set `NEXT_PUBLIC_API_URL` = URL backend.
- Kết quả: 1 live URL khách dùng được + 1 API có Swagger. Hai source deploy độc lập.

---

## 9. Ước lượng thời gian
Scaffold + DB ~2h · #06 ~2h · #07 BE ~1.5h · #14 ~2.5h · #11 ~3h · #09 BE ~1h ·
Frontend toàn bộ ~5h · LLM + deploy ~2h · test + docs ~2h → **~21h**.

> Có thể cắt giảm: làm 4 bài lõi trước (bỏ #14/#09) để có bản deploy được sớm (~13h),
> rồi bổ sung workflow + dashboard sau.

---

## 10. Rủi ro & cách xử lý
- **2 source trùng lặp type** → chấp nhận (nhỏ); đổi lại 2 codebase đọc độc lập, không
  ràng buộc nhau, không cần build package shared trước.
- **Deploy 2 dịch vụ (Vercel + Render)** → tài liệu hoá env rõ; CORS mở đúng origin.
- **LLM tốn key/giới hạn** → chuỗi fallback OpenAI → Jina (free) → template; verdict
  không phụ thuộc LLM nên thiếu key vẫn chạy đủ.
- **Phạm vi lớn (~21h)** → build theo milestone, mỗi mốc chạy được & test xanh rồi đi tiếp.
```
