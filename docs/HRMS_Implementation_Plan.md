# Nexora HRMS — Implementation Plan

**Version:** 1.0
**Status:** Approved (2026-05-10)
**Owner:** Team Lead / Solution Architect (Claude Opus 4.7)
**Audience:** frontend-developer, backend-developer, qa-tester, security-analyzer, project owner

This document is the canonical plan for building the Nexora HRMS production system from the existing prototype + specs. Every implementation decision below is binding unless explicitly amended in a follow-up version of this file.

---

## Table of Contents

1. [Goal & Source-of-Truth Hierarchy](#1-goal--source-of-truth-hierarchy)
2. [Architecture](#2-architecture)
3. [Tech Decisions](#3-tech-decisions)
4. [Database Schema (high-level)](#4-database-schema-high-level)
5. [Phasing & Delivery Order](#5-phasing--delivery-order)
6. [Quality Gate](#6-quality-gate)
7. [Coordination Model](#7-coordination-model)
8. [Standards (non-negotiable)](#8-standards-non-negotiable)
9. [Confirmed Configuration](#9-confirmed-configuration)
10. [Branching Strategy](#10-branching-strategy)
11. [Open Questions Resolved](#11-open-questions-resolved)

---

## 1. Goal & Source-of-Truth Hierarchy

Build the v1 production HRMS for Nexora Technologies — a single-entity Indian HR system covering Auth, Employees, Leave, Attendance, Payroll, Performance, Notifications, Audit, and Configuration — faithful to the existing static prototype and the documented specifications.

When sources disagree, the order of authority is:

1. `docs/SRS_HRMS_Nexora.md` — canonical functional + non-functional spec, BL-001 to BL-048
2. `docs/HRMS_API.md` — canonical API contract (63 endpoints, error catalog)
3. `docs/HRMS_Process_Flows.md` — canonical sequence/edge-case behaviour
4. `docs/HRMS_Test_Cases.md` — canonical acceptance criteria (TC-* IDs)
5. `docs/hrms_design_document.md` — canonical UI/UX system
6. `prototype/` — visual reference; behaviour reference where the docs are silent
7. `docs/hrmsContext.md` — Q&A clarifications, supplementary context

Every decision below cites the rule (BL-XXX) or use case (UC-XXX) it satisfies.

---

## 2. Architecture

**Monorepo** using pnpm workspaces at the project root.

```
HRMS_app/
├── apps/
│   ├── web/            # Next.js 14 App Router · TypeScript · Tailwind
│   └── api/            # Node.js · Express · TypeScript
├── packages/
│   ├── contracts/      # Shared zod schemas + TS types — the API contract single source
│   └── config/         # ESLint, tsconfig, tailwind preset, prettier
├── docs/               # SRS, API, process flows, test cases, this plan
├── prototype/          # static reference — kept for visual diff
└── .claude/agents/     # team-lead, frontend-developer, backend-developer, qa-tester, security-analyzer
```

**Why monorepo:** the API-contract drift problem disappears. Frontend and backend both import the same zod schemas from `packages/contracts/`. Adding a new endpoint = adding a schema in one place; both sides import it. Forms (RHF resolver) and Express middleware validate against the same schema.

**Repository layout principle:** thin apps, thick packages. Cross-cutting concerns (validation, types, design tokens, error codes) live in packages so neither app duplicates them.

---

## 3. Tech Decisions

| Concern | Choice | Why |
|---|---|---|
| ORM | **Prisma** | First-class MySQL, migrations, generated types, transaction support |
| Validation | **zod** | Shared between RHF resolver and Express middleware via `packages/contracts` |
| Auth | **iron-session** (HttpOnly + Secure + SameSite=Lax cookie) | SRS specifies cookie-based sessions, 12h sliding / 30d remember-me. NextAuth is overkill given lockout + audit requirements |
| Password hashing | **argon2id** | Modern default; beats bcrypt on memory-hard cost |
| Data fetching (web) | **TanStack Query** | Industry-standard cache, retry, optimistic updates |
| Forms (web) | **React Hook Form + zod resolver** | Field-level errors, character counters, async validation |
| Logging | **pino** | Fast, structured, child-loggers per request with traceId |
| Rate limiting | **express-rate-limit** + Redis store (memory in dev) | Required for login, forgot-password, expensive search/export |
| Scheduled jobs | **node-cron** (v1) | Three jobs: midnight attendance, hourly escalation sweep, Jan 1 carry-forward. Upgrade to BullMQ if scope grows |
| PDF generation | **@react-pdf/renderer** server-side | Payslip immutability lives at DB layer; PDF is rendered on demand |
| Email | **nodemailer** with SMTP from env (dev: stub to filesystem `/tmp/mail/*.eml`) | Real SMTP only when env supplies it |
| Testing | **Vitest** (unit/component) + **Playwright** (E2E) + **supertest** (API) | One runner family across packages |
| Linting | **ESLint** strict + **Prettier** + **TypeScript strict mode** | No `any` without justification comment |

**Out of scope for v1 (per SRS § 10):** tax slab engine, multi-country support, half-day leave, mobile app, third-party integrations, AI/analytics, email/SMS/push notification delivery, prototype-only demo docks (`#nx-tod-demo`, `#nx-state-demo`), self-registration, user-authored notifications.

---

## 4. Database Schema (high-level)

15 tables. All FKs constrained, all timestamps in UTC, all monetary values stored as integers in paise.

```
employees              (id, code UNIQUE, email UNIQUE, password_hash, role, status, department,
                        designation, reporting_manager_id FK, join_date, exit_date,
                        must_reset_password, version, created_at, updated_at)
salary_structures      (id, employee_id FK, basic_paise, allowances_paise, effective_from)
leave_types            (id, name, carry_forward_cap, is_event_based, requires_admin_approval)
leave_quotas           (id, leave_type_id FK, employment_type, days_per_year)
leave_balances         (id, employee_id FK, leave_type_id FK, year, balance, version)
leave_requests         (id, code UNIQUE, employee_id FK, type_id FK, from_date, to_date, days,
                        reason, status, approver_id, decided_at, decided_by, decision_note,
                        escalated_at, routed_to, version, created_at)
attendance_records     (id, employee_id FK, date, status, check_in_time, check_out_time,
                        hours_worked, late, late_month_count, lop_applied, source,
                        regularisation_id FK, version, created_at)
                        UNIQUE (employee_id, date, source)
regularisations        (id, code UNIQUE, employee_id FK, date, proposed_check_in,
                        proposed_check_out, reason, status, routed_to, age_days_at_submit,
                        approver_id, decided_at, decision_note, version, created_at)
payroll_runs           (id, code UNIQUE, month, year, status, initiated_by, finalised_by,
                        finalised_at, total_gross_paise, total_net_paise, version, created_at)
                        UNIQUE (month, year) WHERE status != 'Reversed'
payslips               (id, code UNIQUE, run_id FK, employee_id FK, month, year, status,
                        working_days, lop_days, gross_paise, lop_deduction_paise,
                        reference_tax_paise, final_tax_paise, net_pay_paise, finalised_at,
                        reversal_of_id FK, version, created_at)
performance_cycles     (id, code UNIQUE, fy_start, fy_end, status, self_review_deadline,
                        manager_review_deadline, closed_at, created_by, version, created_at)
performance_reviews    (id, cycle_id FK, employee_id FK, manager_id, previous_manager_id,
                        self_rating, self_note, manager_rating, manager_note,
                        manager_overrode_self, final_rating, locked_at, version, created_at)
goals                  (id, review_id FK, text, outcome, proposed_by_employee, version)
notifications          (id, recipient_id FK, category, title, body, link, unread, created_at)
audit_log              (id ULID, actor_id, actor_role, actor_ip, action, target_type, target_id,
                        module, before JSON, after JSON, created_at)
                        -- DB user has REVOKE UPDATE, DELETE on this table (BL-047)
configuration          (key UNIQUE, value JSON, updated_by, updated_at)
holidays               (id, year, date, name)
sessions               (id, employee_id FK, ip, user_agent, expires_at, created_at)
```

**Migration discipline:** one migration per phase deliverable. Forward + backward verified. No manual SQL on prod.

**Seed script:** creates `admin@triline.co.in` (Active, password `admin@123`, `must_reset_password = false`), 6 leave types with default caps, default holiday calendar for the current FY, default configuration values from SRS § 11.

---

## 5. Phasing & Delivery Order

Each phase is a **vertical slice**: contract → DB migration → backend → frontend → QA → security → Team Lead approval. No phase begins until the prior phase passes the four-gate review.

| Phase | Branch | Scope | Key BL rules | Complexity |
|---|---|---|---|---|
| **0 — Foundations** | `phase-0-foundations` | Monorepo scaffold, Tailwind theme port from `prototype/assets/theme.js`, layout shell (sidebar, top bar, mobile drawer), `iron-session` auth, audit-log helper, default admin seed, CI lint+typecheck | BL-001, BL-004, BL-008, BL-047, BL-048 | Medium |
| **1 — Users & Hierarchy** | `phase-1-users` | Employee CRUD, EMP code generator (`EMP-YYYY-NNNN`, never reused), status transitions (Active / On-Notice / Exited / On-Leave), reassign-manager (with handover routing), profile page, directory | Module 1 fully | Medium |
| **2 — Leave** | `phase-2-leave` | 6 leave types, balances, application, approval queue, escalation cron (5 working days), cancellation (before-start / after-start), carry-forward cron (Jan 1), conflict detection (BL-009 / BL-010) with named error block | Module 2 fully | High |
| **3 — Attendance & Regularisation** | `phase-3-attendance` | Midnight cron generating Absent rows, check-in / check-out with status derivation, late-mark logic + auto-deduct on 3rd late, regularisation routing (≤7d Manager / >7d Admin), conflict detection (the other side of BL-010) | Module 3 fully | High |
| **4 — Payroll** | `phase-4-payroll` | Run lifecycle (Draft → Review → Finalised → Reversed), LOP formula, mid-month proration, manual tax entry (BL-036a), two-step finalise modal with concurrent-finalise guard (BL-034 — `SELECT FOR UPDATE` + status check in tx), reversal flow (Admin-only), payslip PDF, salary structure changes (next-run only) | Module 4 fully | Highest |
| **5 — Performance** | `phase-5-performance` | Half-yearly cycles, goal-setting (Manager creates 3–5; Employee may propose during self-review), self-rating editable until deadline, manager rating with override flag, manager-change audit (both managers retained), close-cycle locking, distribution + missing-review reports. **Admin self-review: Option B** (peer Admin rates, selected per cycle) | Module 5 fully | High |
| **6 — Notifications** | `phase-6-notifications` | System-generated triggers wired during phases 1–5; this phase delivers the unified `notifications.html` UI, retention cron (90 days), bell unread count, role-scoped feeds (BL-044) | Module 6 | Medium (cross-cutting; partially built earlier) |
| **7 — Audit Log UI & Configuration** | `phase-7-audit-config` | A-26 audit log filterable read-only view, A-19 attendance config (late threshold, standard daily hours), A-08 leave config (carry-forward caps, escalation period, maternity/paternity duration), A-17 tax reference rate, holiday calendar | Configuration + Audit views | Medium |
| **8 — Hardening** | `phase-8-hardening` | Full VAPT pass (security-analyzer), Lighthouse a11y on every page, perf with seeded 250 employees, regression smoke pack (HRMS_Test_Cases.md § 13), browser/device matrix, prod-build smoke | (cross) | Medium |

**Definition of Done (per phase):** every BL/UC in scope cited, all four gates passed, contract package version bumped, migration applied + reverted clean, demo-able to project owner, merged to `app`.

---

## 6. Quality Gate

Every module within every phase passes through:

```
Contract Agreement (FE + BE + TL aligned in packages/contracts)
    ↓
Backend Implementation
    ↓
Frontend Implementation (in parallel once contract is locked)
    ↓
Code Review (Team Lead)
    ↓
QA Validation (qa-tester runs TC-* matrix + smoke pack)
    ↓
Security Review (security-analyzer runs OWASP checklist)
    ↓
Team Lead Approval → merge → next module
```

**Block-the-merge criteria** (any one of these fails → not merged):
- any open Crit/High defect from QA
- any failing TC tied to a BL rule
- any open security finding ≥ High
- any `any` in TypeScript without a justification comment
- any DB write without an audit entry
- any protected route without a server-side role + ownership check
- any error response that isn't a named code from `HRMS_API.md` § 13
- any missing loading / empty / error variant on a UI surface

---

## 7. Coordination Model

- **All comms through team-lead.** Frontend and backend never coordinate directly — they go through the canonical contract maintained by team-lead in `packages/contracts/`.
- **API contract first.** A new endpoint starts as a zod schema in `packages/contracts/`. Team-lead reviews and locks the schema. Frontend writes against the type, backend writes the implementation. Drift is impossible because the schema is the single source.
- **Daily handoff format** (when an agent finishes a unit): files changed · BL/UC covered · contract delta · open questions · ready for which gate.
- **Review cycles run as soon as a unit is "implementation-complete"** — not at end-of-phase. The phase ends only when every unit has cleared all four gates.
- **Status communication:** each agent reports back to team-lead with structured handoff notes; team-lead is the single voice to the project owner.

---

## 8. Standards (non-negotiable)

- **TypeScript strict mode** everywhere. `any` requires a justification comment.
- **Server-side role enforcement** on every protected route. Never trust the frontend.
- **Every state-changing endpoint** writes an audit entry through the wrapper helper (BL-047 / BL-048).
- **Every error response** uses a named code from `HRMS_API.md` § 13.
- **Every DB query** uses prepared statements (Prisma does this; raw SQL is forbidden outside migrations).
- **No secrets in source.** `.env.example` only. `.env` is gitignored.
- **Prototype-only demo docks** (`#nx-tod-demo`, `#nx-state-demo`) are stripped (per SRS § 10).
- **Indian fiscal calendar** (April–March) is fixed in code, not configurable (BL-003).
- **WCAG AA minimum** on every page; AAA where reachable.
- **Idempotency-Key header** accepted on mutation endpoints; duplicates within 24 h return the original response.
- **Audit log table is append-only at DB level** — application user has `REVOKE UPDATE, DELETE` on it.

---

## 9. Confirmed Configuration

| Setting | Value |
|---|---|
| Default admin email | `admin@triline.co.in` |
| Default admin password | `admin@123` (known, dev-only; `must_reset_password = false`) |
| Workspace name | `nexora-hrms` |
| Web port | `3000` |
| API port | `4000` |
| Timezone | `Asia/Kolkata` |
| Locale | `en-IN` |
| Email (dev) | filesystem stub (`/tmp/mail/*.eml`) |
| Email (prod) | `nodemailer` with SMTP from env |
| Payslip PDF | server-rendered on demand via `@react-pdf/renderer` |
| Admin self-review | **Option B** — peer Admin rates, selected per cycle by the Admin team |
| DB host | `localhost` |
| DB user | `root` |
| DB password | `Password@123` |
| DB name | `nexora_hrms` (created by migration if absent) |

---

## 10. Branching Strategy

- `main` — production-ready, protected, releases tagged here
- `app` — integration branch; phases merge here as they pass all four gates
- `phase-0-foundations` … `phase-8-hardening` — one branch per phase, branched off `app`

**Workflow per phase:**
1. Check out the phase branch.
2. Develop vertical slices (contract → backend → frontend).
3. Open internal review with team-lead.
4. QA runs (qa-tester) on the branch.
5. Security review (security-analyzer) on the branch.
6. Team lead approves.
7. Merge into `app`.
8. Move to the next phase branch.

Bug-fix and tweak branches off `app` follow `fix/<short-name>` or `chore/<short-name>` naming and merge back into `app`.

---

## 11. Open Questions Resolved

All clarifying questions raised during planning have been answered by the project owner:

| # | Question | Resolution |
|---|---|---|
| 1 | Email domain spelling | `admin@triline.co.in` (single 'l', "Triline") |
| 2 | Default admin password | Known: `admin@123` |
| 3 | Workspace name | `nexora-hrms` |
| 4 | Email delivery in v1 | dev: filesystem stub, prod: SMTP via env |
| 5 | Ports | web 3000, api 4000 |
| 6 | Timezone / locale | Asia/Kolkata, en-IN |
| 7 | Admin self-review when no manager | Option B (peer Admin rates) |
| 8 | Payslip PDF strategy | server-rendered on demand |
| 9 | Branching | `app` integration branch + nine `phase-*` feature branches (created) |

---

*End of plan.*
*Amendments require Team Lead sign-off and a version bump on this document.*
