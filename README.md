# Nexora HRMS

A complete HR Management System for Triline — a single Indian company with ~250 employees — covering Employees, Leave, Attendance, Payroll, Performance Reviews, Notifications, and Audit. Fiscal year is fixed April → March; **HR = Admin** everywhere in the system.

Built as a TypeScript monorepo: Express + Prisma + MySQL on the backend, Next.js (App Router) + Tailwind on the frontend, with shared zod contracts as the canonical API surface.

---

## Repository structure

```
HRMS_app/
├── apps/
│   ├── api/                     # Express + Prisma + MySQL REST API (@nexora/api)
│   └── web/                     # Next.js 14 App Router frontend (@nexora/web)
├── packages/
│   ├── contracts/               # Shared zod schemas + TS types (@nexora/contracts)
│   └── config/                  # Shared lint / tsconfig / prettier presets
├── prototype/                   # Static HTML/Tailwind reference pages (the visual target)
└── docs/
    ├── SRS_HRMS_Nexora.md       # Software Requirements Spec (BL rules, role permissions)
    ├── HRMS_API.md              # Endpoint catalogue
    ├── HRMS_Design_Document.md  # Architecture + data model
    ├── HRMS_Implementation_Plan.md
    ├── HRMS_Process_Flows.md
    ├── HRMS_Test_Cases.md
    └── PRE_PRODUCTION_CHECKLIST.md
```

---

## Prerequisites

- **Node.js ≥ 18.18**
- **pnpm 9.15** (set as `packageManager` — Corepack will pick the exact version)
- **MySQL ≥ 8.0** running locally on `:3306`
- (Optional) A Gmail App Password if you want real SMTP delivery in dev

---

## Quickstart

```bash
# 1. Install deps (workspace-wide)
pnpm install

# 2. Configure environment — two files, one per app
cp .env.example apps/api/.env                            # backend secrets (DB, SESSION_SECRET, SMTP)
cp apps/web/.env.local.example apps/web/.env.local       # web public vars (API base URL)
# Edit apps/api/.env — fill DATABASE_URL, SESSION_SECRET, SMTP_* if needed

# 3. Run database migrations + seed
pnpm db:migrate
pnpm db:seed

# 4. Start API and web together (parallel)
pnpm dev
```

- API serves on **http://localhost:4000** (`/api/v1`)
- Web serves on **http://localhost:3000**
- Default admin (from seed): `admin@triline.co.in` / `admin@123`

---

## Common scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Runs `dev` in every workspace in parallel (API + web together). |
| `pnpm build` | Builds every workspace. |
| `pnpm typecheck` | Runs `tsc --noEmit` across the monorepo. |
| `pnpm lint` | Runs ESLint across every workspace. |
| `pnpm test` | Runs each workspace's test suite (Vitest on the API). |
| `pnpm db:migrate` | Applies Prisma migrations (API workspace). |
| `pnpm db:seed` | Seeds baseline data — Admin user, departments, leave configs. |
| `pnpm db:reset` | Drops + re-creates the DB, then re-migrates (does NOT auto-seed). |
| `pnpm format` | Prettier-format all `.ts/.tsx/.js/.json/.md`. |

Workspace-targeted invocation:

```bash
pnpm --filter @nexora/api dev          # API only
pnpm --filter @nexora/web typecheck    # Web typecheck only
pnpm --filter @nexora/api test         # API tests only
```

---

## Environment

Two env files, one per app — both gitignored. The single source-of-truth template is `/.env.example` at the repo root.

- `apps/api/.env` — backend secrets, read by Express via `dotenv` at startup.
- `apps/web/.env.local` — Next.js convention; only `NEXT_PUBLIC_*` vars belong here.

Backend highlights:

- `DATABASE_URL` — MySQL connection string
- `SESSION_SECRET` — ≥ 32 chars; generate with `openssl rand -hex 32`
- `MAIL_TRANSPORT` — `filesystem` (writes `.eml` files to `/tmp/mail` — default for dev) or `smtp`
- `SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS` — required when `MAIL_TRANSPORT=smtp`
- `TZ=Asia/Kolkata`, `LOCALE=en-IN` — single-tenant Indian timezone + locale

The web app reads `NEXT_PUBLIC_API_BASE_URL` from `apps/web/.env.local` — set it to the **bare API host** (`http://localhost:4000`). The `/api/v1` prefix is already baked into every path in `apps/web/src/lib/api/*.ts`, so adding it to the env var will produce a doubled-prefix 404 on every request.

---

## Architecture in one paragraph

- **Frontend** (`apps/web`) — Next.js 14 App Router, React Server Components where possible, TanStack Query + React Hook Form + zod on the client. Pages live under `src/app/(role)/<role>/...`; reusable views under `src/features/<feature>/components/`; UI primitives under `src/components/ui/`. Tailwind theme is custom (`forest`, `mint`, `emerald`, `sage`, `softmint`, etc.) and matches the static prototype under `prototype/`.
- **Backend** (`apps/api`) — Express + Prisma against MySQL. Modules live under `src/modules/<domain>/` and follow `<domain>.routes.ts` + `<domain>.service.ts` (transactional logic) + a Vitest suite. Sessions use iron-session cookies. Cron jobs (`node-cron`) handle daily attendance finalisation, leave escalation, leave carry-forward, and performance-cycle nudges.
- **Contracts** (`packages/contracts`) — every request/response schema is a zod object exported from here. Both the API (`zod.parse` at the boundary) and the web client (TS types + RHF resolvers) import from `@nexora/contracts/<domain>`. **The contract is the source of truth.** If you change the wire format, change it here first.
- **Roles** — Admin, Manager, Employee, PayrollOfficer. HR = Admin. Every role is also an employee, subject to the same leave/attendance/payroll rules. All four roles are wired into the sidebar via `apps/web/src/components/layout/roleNavConfig.ts`.

---

## Branch model

- `main` — protected; production-ready. Updated only via PR merges.
- `app` — staging/deploy branch. Auto-followed by deployment.
- `phase-*` — phase-scoped development branches (Phase 0 → Phase 8, mirroring the implementation plan).
- `ui-fidelity-pass` — long-running branch reserved for prototype-fidelity work.
- `demo_signin` — variant with the demo-role chips on the sign-in page enabled. Useful for screen-casts and stakeholder demos.

---

## Where to read next

- **Business rules + role permissions** — `docs/SRS_HRMS_Nexora.md` (look for `BL-NNN` rule IDs cited throughout the codebase)
- **API endpoints** — `docs/HRMS_API.md`
- **Process flows** — `docs/HRMS_Process_Flows.md`
- **Test scenarios** — `docs/HRMS_Test_Cases.md`
- **Release checklist** — `docs/PRE_PRODUCTION_CHECKLIST.md`

---

## License

Released under the [MIT License](LICENSE).

