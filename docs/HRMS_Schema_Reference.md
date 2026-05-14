# Nexora HRMS — Database Schema Reference

**Schema version:** v2 (post-refactor, GREEN as of 2026-05-13)
**Database:** MySQL 8.0+
**ORM:** Prisma 5 with `relationMode = "prisma"`
**Source of truth:** `apps/api/prisma/schema.prisma`
**Companion docs:** `HRMS_Schema_v2_Plan.md` (refactor plan, §3 holds the frozen INT-code mappings) · `HRMS_v2_QA_Report.md` (end-to-end QA findings)

> This document is a reference: every table, every column, every index — with the **justification** for why each piece exists. If you're trying to understand "what is this column for?" or "why is this indexed?", this is the document.

---

## Contents

1. [Conventions in force across all tables](#1-conventions-in-force-across-all-tables)
2. [Master / lookup tables (7)](#2-master--lookup-tables-7)
3. [Identity, auth, and session (4)](#3-identity-auth-and-session-4)
4. [Employee history (2)](#4-employee-history-2)
5. [Leave management (5)](#5-leave-management-5)
6. [Leave encashment (2)](#6-leave-encashment-2)
7. [Attendance and regularisation (5)](#7-attendance-and-regularisation-5)
8. [Payroll (3)](#8-payroll-3)
9. [Performance (3)](#9-performance-3)
10. [Notifications, audit, configuration, idempotency (4)](#10-notifications-audit-configuration-idempotency-4)
11. [Prisma's own table](#11-prismas-own-table)
12. [Appendix A — INT-code mappings (frozen)](#appendix-a--int-code-mappings-frozen)
13. [Appendix B — Index inventory](#appendix-b--index-inventory)
14. [Appendix C — Business-rule index](#appendix-c--business-rule-index)

---

## 1. Conventions in force across all tables

These rules apply uniformly to every table in the schema. Each per-table section below assumes them and only calls them out when something deviates.

### 1.1 Primary keys

Every PK is `INT UNSIGNED AUTO_INCREMENT` (Prisma `Int @id @default(autoincrement())`), with two exceptions:
- `configurations.key` — `VARCHAR` PK (the key string itself is the semantic lookup; integer surrogate would be useless).
- `leave_code_counters` / `reg_code_counters` / `encashment_code_counters` — PK is `year` (the per-year counter row IS the year).
- `payroll_code_counters` — composite PK `(year, month)` (one counter per month).

**Why INT not UUID/cuid?** Compact, sortable, fast-joining. URLs read naturally (`/employees/42`). Storage cost is ~4 bytes vs 16+ for UUIDs. No human-meaningful business code is built from the surrogate PK; user-facing codes (`EMP-2024-0001`, `L-2026-0001`) live in dedicated `code` columns.

### 1.2 No DB-level foreign keys

`relationMode = "prisma"` means **no `FOREIGN KEY` constraints are emitted to MySQL**. Every `*_id` column is just a plain `INT`. Referential integrity is enforced at the application layer through Prisma's `@relation` directives at query time.

**Why?** Three reasons:
1. Faster bulk operations — no constraint check overhead on insert/delete.
2. Easier maintenance — schema changes don't require dropping/recreating FK constraints.
3. Sharding-ready — when (if) the DB is split across shards later, cross-shard FKs would have broken anyway.

The trade-off is that orphan rows are possible if application code is buggy. The audit log + the dummy-seed verification make this manageable.

### 1.3 Column naming

- **DB columns:** `snake_case` always (`status_id`, `reporting_manager_id`).
- **Prisma fields:** `camelCase` (`statusId`, `reportingManagerId`), bridged via `@map("snake_case_name")` where the names differ.
- Field name and column name are identical (no `@map`) when both naturally match — e.g., `status`, `code`, `name`, `email`.

### 1.4 INT status codes

Every status / role / type / category / outcome / routing / source / purpose / reason column on a business-data table is a plain `INT`. The application owns the INT→label mapping (frontend: `apps/web/src/lib/status/maps.ts`; backend: `apps/api/src/lib/statusInt.ts`). Codes are FROZEN — once shipped, a code's meaning never changes; only new codes are appended.

Each INT-coded column carries a MySQL `COLUMN_COMMENT` listing its codes (see [Appendix A](#appendix-a--int-code-mappings-frozen)). Inspecting the DB directly is enough to know what `status=4` means.

### 1.5 Timestamps

Most tables carry:
- `created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` — set on insert.
- `updated_at DATETIME(3) NOT NULL` (Prisma `@updatedAt`) — set on every update.

Where only `created_at` matters (append-only logs), `updated_at` is omitted.

### 1.6 Optimistic concurrency

Mutable business records carry a `version INT NOT NULL DEFAULT 0` column. Clients submit the version they read; the server compares and bumps. Mismatch → 409 `VERSION_MISMATCH`. This is BL-mandated for leave, payroll, performance, regularisation, employee profile, salary, leave encashment, and reviews. Append-only tables (audit_log, leave_balance_ledger, attendance_late_ledger, login_attempts, password_reset_tokens, sessions, notifications, idempotency_keys, history tables, code counters) do not carry `version`.

### 1.7 Master row `status`

The 7 master tables share a uniform `status INT NOT NULL DEFAULT 1` column where `1 = Active`, `2 = Deprecated`. Deprecated rows are hidden from dropdowns but kept for historical FK references — no row is ever physically deleted from a master.

### 1.8 Money is paise

Every monetary column is named `*_paise` (Indian paise: ₹1 = 100 paise) and stored as `INT` to avoid floating-point drift. UI formats with `Intl.NumberFormat('en-IN')`; users never see paise.

### 1.9 No `DELETE` on history-bearing tables

Audit log, leave balance ledger, reporting manager history, login attempts, password reset tokens, attendance records — never deleted. `audit_log` is enforced append-only by `REVOKE UPDATE, DELETE` after migration (BL-048).

---

## 2. Master / lookup tables (7)

### 2.1 `roles`

> Frozen master. Seeds the four canonical roles. Referenced by `employees.role_id` and (extended-superset) `audit_log.role_id`.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate key referenced by `employees.role_id`. Frozen seed IDs (1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin) — never re-numbered. |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Human-readable label used in UI tooltips, audit log decoding, and admin views. UNIQUE prevents duplicate role definitions. |
| `status` | INT | NOT NULL | 1 | 1=Active, 2=Deprecated. Allows the org to retire a role conceptually without breaking historical `employees.role_id` references. |
| `created_at` | DATETIME(3) | NOT NULL | now() | Audit completeness — when was this row added. |
| `updated_at` | DATETIME(3) | NOT NULL | now()/auto | When was it last touched (most likely a deprecation flip). |

**Indexes:** PK only. ~4 rows, no scan benefit.

### 2.2 `employment_types`

> Frozen master. Seeds Permanent (1), Contract (2), Probation (3), Intern (4). Drives leave quotas (different yearly entitlements per type) and payroll proration.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate key for `employees.employment_type_id` and `leave_quotas.employment_type_id`. |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Display label. UNIQUE prevents duplicates. |
| `status` | INT | NOT NULL | 1 | Active/Deprecated soft-delete flag. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance + change tracking. |

**Indexes:** PK only.

### 2.3 `departments`

> Admin-managed master. Seeded with 7 starter departments; Admin adds more at runtime via `POST /masters/departments`.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate key referenced by `employees.department_id`. Grows over time. |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Display label (used in employee directory, payslips, audit reports). UNIQUE on `name` makes the `POST /masters/departments` endpoint idempotent: same-named creates return the existing row instead of 409. |
| `status` | INT | NOT NULL | 1 | Active/Deprecated. Lets an org retire a defunct department while keeping historical employee FKs intact. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK + UNIQUE(name).

### 2.4 `designations`

> Admin-managed master. Same shape as `departments`. Stores job titles ("Software Engineer", "Head of People", …).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate key for `employees.designation_id`. |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Display label. UNIQUE supports idempotent admin creates. |
| `status` | INT | NOT NULL | 1 | Active/Deprecated. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK + UNIQUE(name).

### 2.5 `genders`

> Frozen master. Seeds Male (1), Female (2), Other (3), PreferNotToSay (4).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Referenced by `employees.gender_id` (nullable — gender is optional). |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Display label. |
| `status` | INT | NOT NULL | 1 | Inherited shape; PreferNotToSay carries a Deprecated-leaning badge in the frontend to de-emphasise it. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK only.

### 2.6 `audit_modules`

> Frozen master. Each top-level module of the application has one row here (auth, employees, leave, payroll, attendance, performance, notifications, audit, configuration). Referenced by `audit_log.module_id`. **Why a master?** So an admin viewing audit rows in MySQL Workbench gets a join-resolvable name without grepping code.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate key for `audit_log.module_id`. Frozen seed (1=auth, …, 9=configuration). |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Module key used in code (`module: 'leave'` in `audit()` helper). UNIQUE prevents duplicates. |
| `status` | INT | NOT NULL | 1 | Active/Deprecated — would only flip if a module were retired entirely. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK only.

### 2.7 `leave_types`

> Frozen master with type-specific policy attributes. Six rows: Annual, Sick, Casual, Unpaid (accrual-based) and Maternity, Paternity (event-based). Referenced by `leave_quotas`, `leave_balances`, `leave_balance_ledger`, and `leave_requests`.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Frozen seed (1=Annual, 2=Sick, 3=Casual, 4=Unpaid, 5=Maternity, 6=Paternity). |
| `name` | VARCHAR UNIQUE | NOT NULL | — | Display label (and the join target for resolved `leaveTypeName` on API responses). |
| `is_event_based` | BOOL | NOT NULL | — | True for Maternity/Paternity — no annual quota, eligibility tied to a specific event (BL-014). Drives whether the balance row carries days at all. |
| `requires_admin_approval` | BOOL | NOT NULL | — | True for Maternity/Paternity — request routes directly to Admin, bypassing the manager queue (BL-015/016). Stored here so policy changes don't require code edits. |
| `carry_forward_cap` | INT NULL | YES | — | Max days that roll over on Jan 1 (BL-013). NULL for event-based types (carry-forward doesn't apply). |
| `max_days_per_event` | INT NULL | YES | — | Cap per single event (Maternity = 182 / 26 weeks, Paternity = 10). NULL for accrual types. |
| `status` | INT | NOT NULL | 1 | Active/Deprecated. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK + UNIQUE(name).

---

## 3. Identity, auth, and session (4)

### 3.1 `employees`

> The central table. Every human in the system has exactly one row. Self-referencing for the reporting hierarchy. BL-007: rows are NEVER deleted — they transition through statuses including Exited.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate key. Referenced by ~25 other tables. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public employee code in `EMP-YYYY-NNNN` format (BL-008). **Never reused** — a re-joiner gets a new code. The year segment is the join year; the sequence is per-year monotonic. This is the identifier shown on payslips, audit logs, and HR reports. |
| `email` | VARCHAR UNIQUE | NOT NULL | — | Login identifier. UNIQUE so duplicate accounts can't exist. Used in `login_attempts.email` and `password_reset_tokens` for the recovery flow. |
| `name` | VARCHAR | NOT NULL | — | Display name. Free-form (no length cap below schema default) — SEC-002-P1 regex strips control characters on input. |
| `password_hash` | VARCHAR | NOT NULL | — | argon2id hash of the user's password. Never exposed via any API. Refreshed on `POST /auth/reset-password`. |
| `role_id` | INT | NOT NULL | — | FK→`roles.id`. Drives every authorisation check (`requireRole` middleware). |
| `employment_type_id` | INT | NOT NULL | 1 | FK→`employment_types.id`. Used by the leave-quota join (`leave_quotas.employment_type_id` × `leave_types.id` → daysPerYear) and by payroll proration. Default 1=Permanent. |
| `department_id` | INT NULL | YES | — | FK→`departments.id`. Nullable because the org may not assign a department to a new starter or an exec. |
| `designation_id` | INT NULL | YES | — | FK→`designations.id`. Same nullability reason as department. |
| `gender_id` | INT NULL | YES | — | FK→`genders.id`. Nullable — gender is optional during onboarding. |
| `status` | INT | NOT NULL | 4 | §3.1 code (1=Active, 2=OnNotice, 3=OnLeave, 4=Inactive, 5=Exited). Default 4=Inactive — set on creation; first successful login flips to 1=Active. BL-006 governs transitions: Admin sets OnNotice/Exited/Active manually; OnLeave is system-managed while an approved leave is in progress. |
| `phone` | VARCHAR NULL | YES | — | Optional contact. |
| `date_of_birth` | DATE NULL | YES | — | Optional DOB. Currently informational only; future age-based eligibility logic could use it. |
| `reporting_manager_id` | INT NULL | YES | — | Self-FK→`employees.id`. NULL for top-of-tree employees (typically Admin). Drives the leave-approval queue and the team views (BL-017). |
| `previous_reporting_manager_id` | INT NULL | YES | — | Self-FK→`employees.id`. Set during reassignment so the *old* manager retains visibility on past-team views and pending approvals route correctly (BL-022 / BL-022a). |
| `join_date` | DATE | NOT NULL | — | The employee's start date. Drives leave proration for mid-year joiners and payroll proration for mid-month joiners. |
| `exit_date` | DATE NULL | YES | — | Set when status flips to 5=Exited. Used by payroll to stop generating payslips beyond the exit date. |
| `must_reset_password` | BOOL | NOT NULL | false | True on creation (first-login flow) and after admin-triggered password resets. Forces a redirect to `/first-login` on next login. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency — clients must submit the version they read on PATCH /employees/:id. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance + change tracking. |

**Indexes:** PK; UNIQUE(`email`), UNIQUE(`code`); single-column indexes on `email`, `reporting_manager_id`, `previous_reporting_manager_id`, `role_id`, `employment_type_id`, `department_id`, `designation_id`, `gender_id`, `status`.

**Why so many indexes?** Every column listed is either a routing key (manager hierarchy, role-based queues) or a dropdown filter on the admin employees list. Inserts are rare (a few per week at most); reads dominate, so the index spend pays back. `email` is doubled (UNIQUE + secondary) so partial-string LIKE searches don't fall back to a full scan.

### 3.2 `sessions`

> Live HTTP session for an authenticated user. Created on login, deleted on logout, expired by the iron-session cookie + the scheduled cleanup of stale rows.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `token` | VARCHAR UNIQUE | NOT NULL | — | The public session token returned in the `HttpOnly` cookie. Random hex (~64 chars). Looked up on every authenticated request — UNIQUE supports the equality lookup. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. The session's owner. |
| `ip` | VARCHAR NULL | YES | — | Source IP captured at login. Used by audit-log forensics and by future "log out other sessions" UI. |
| `user_agent` | TEXT NULL | YES | — | Browser/device fingerprint at login. Same forensic use as `ip`. TEXT (not VARCHAR) because UA strings can exceed 191 chars. |
| `expires_at` | DATETIME(3) | NOT NULL | — | Hard expiry timestamp. Cleanup cron deletes rows where `expires_at < now()`. |
| `created_at` | DATETIME(3) | NOT NULL | now() | Login moment. |

**Indexes:** PK; UNIQUE(`token`); single-column on `employee_id` (for "log out all my sessions"); single-column on `expires_at` (for the cleanup cron's `WHERE expires_at < now()` scan).

### 3.3 `login_attempts`

> Append-only log feeding the 5-strikes lockout check (`POST /auth/login`). Every attempt — success or failure — writes a row. The lockout middleware counts rows in the last 15 minutes for a given `email`/`ip`.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `email` | VARCHAR | NOT NULL | — | The email the caller claimed. **Not** an FK to `employees.email` — the claim might be for a non-existent account, and we still log it. |
| `ip` | VARCHAR | NOT NULL | — | Source IP. Used in the lockout check + brute-force detection. |
| `success` | BOOL | NOT NULL | — | True if the password matched and a session was issued. False otherwise. |
| `employee_id` | INT NULL | YES | — | FK→`employees.id`. Populated only on `success = true`. NULL when the claimed email didn't resolve (lockout still counts these). |
| `created_at` | DATETIME(3) | NOT NULL | now() | The attempt time — the lockout window is `now() - 15 min`. |

**Indexes:** PK; composite `(email, created_at)` and `(ip, created_at)` — match the two lockout queries (by-account and by-ip).

### 3.4 `password_reset_tokens`

> One-shot tokens for the first-login and password-reset flows. Hash-stored — raw token only exists in the email link.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `token_hash` | VARCHAR UNIQUE | NOT NULL | — | SHA-256 of the raw token. UNIQUE — collisions would let one token validate another. The raw token never touches the DB. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. The account this token is for. |
| `purpose_id` | INT | NOT NULL | — | §3.8: 1=FirstLogin, 2=ResetPassword. The first-login flow requires `must_reset_password` to be true on consumption; the reset flow doesn't. |
| `expires_at` | DATETIME(3) | NOT NULL | — | Token TTL. After this, the token is dead even if unused. First-login = 7 days; reset-password = 1 hour. |
| `used_at` | DATETIME(3) NULL | YES | — | Set when the token is consumed. A non-null `used_at` invalidates re-use. |
| `created_at` | DATETIME(3) | NOT NULL | now() | Issue time. |

**Indexes:** PK; UNIQUE(`token_hash`); single-column on `employee_id` (admin can list outstanding tokens for an account); single-column on `expires_at` (cleanup cron).

---

## 4. Employee history (2)

### 4.1 `salary_structures`

> Salary history: one row per change. The *active* salary is the latest `effective_from <= today`. BL-030: salary edits apply to the *next* payroll run; finalised payslips are immutable snapshots, not derived live from this table.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `basic_paise` | INT | NOT NULL | — | Basic component (paise). |
| `allowances_paise` | INT | NOT NULL | — | Aggregate allowances (paise). When the breakdown columns are populated, `hra_paise + transport_paise + other_paise` MUST equal `allowances_paise` (enforced server-side). |
| `effective_from` | DATE | NOT NULL | — | The first date this salary takes effect. Older rows remain valid for back-dated payroll runs. |
| `created_at` | DATETIME(3) | NOT NULL | now() | When the change was recorded. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency on the latest row. |
| `hra_paise` | INT NULL | YES | — | Optional breakdown: House Rent Allowance. |
| `transport_paise` | INT NULL | YES | — | Optional: transport allowance. |
| `other_paise` | INT NULL | YES | — | Optional: catch-all allowances. |
| `da_paise` | INT NULL | YES | — | Optional: Dearness Allowance — reserved for future use, not currently shown in payslips. |

**Indexes:** PK; composite `(employee_id, effective_from DESC)` — matches the "latest salary for this employee" query, which is the hot read path on every payroll run.

### 4.2 `reporting_manager_history`

> Audit trail for reporting-manager assignments. BL-007: never deleted. Every change (initial assignment, reassignment, manager exit) appends one row.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. The subordinate whose manager assignment this row describes. |
| `manager_id` | INT NULL | YES | — | FK→`employees.id`. The manager. NULL when there is none (top-of-tree employee or post-Exit). |
| `from_date` | DATE | NOT NULL | — | Effective start date of this assignment. |
| `to_date` | DATE NULL | YES | — | Effective end date. NULL means the assignment is current. Setting this stamps the historical row. |
| `reason_id` | INT | NOT NULL | — | §3.8 history: 1=Initial (created on employee onboarding), 2=Reassigned (manager change), 3=Exited (manager left, employee promoted to Admin's tree). |
| `created_at` | DATETIME(3) | NOT NULL | now() | When the history row was written. |

**Indexes:** PK; composite `(employee_id, from_date DESC)` — supports the "show this employee's manager history newest-first" query; composite `(manager_id, to_date)` — supports the "list all past-team members for this manager" query (BL-022a).

---

## 5. Leave management (5)

### 5.1 `leave_quotas`

> The yearly entitlement matrix: how many days of each leave type an employee with a given employment type gets per year. Read on leave-balance initialisation (Jan 1) and on the `?include=quota` view.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `leave_type_id` | INT | NOT NULL | — | FK→`leave_types.id`. |
| `employment_type_id` | INT | NOT NULL | — | FK→`employment_types.id`. |
| `days_per_year` | INT | NOT NULL | — | The entitlement. Zero is valid (e.g., Unpaid leave has `days_per_year = 0`). |

**Indexes:** PK + UNIQUE(`leave_type_id`, `employment_type_id`) — the natural compound key; the lookup pattern is "what's a Permanent employee's Annual quota?" and the unique index serves both that read AND prevents duplicate quota rows.

### 5.2 `leave_balances`

> The running balance per (employee, leave type, year). Mutated by approval (deduct), cancellation (restore), encashment (reduce remaining), and the Jan 1 carry-forward cron (reset/cap).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `leave_type_id` | INT | NOT NULL | — | FK→`leave_types.id`. |
| `year` | INT | NOT NULL | — | Calendar year this balance represents. Year-bucketed so prior-year balances stay queryable for reports. |
| `days_remaining` | INT | NOT NULL | 0 | The live counter. Decremented on approval, incremented on cancellation, decremented on encashment payout. |
| `days_used` | INT | NOT NULL | 0 | Cumulative days deducted via approval (not restored). Used in reports — answers "how much leave has this employee actually taken?". Independent of `days_remaining` so cancellations don't confuse the read. |
| `days_encashed` | INT | NOT NULL | 0 | Cumulative days converted to cash this year (BL-LE-06). Separate from `days_used` because encashment isn't a leave consumption. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency — two simultaneous approvals against the same balance row are serialised by version mismatch. |

**Indexes:** PK + UNIQUE(`employee_id`, `leave_type_id`, `year`) — the natural compound key, also serves the hot lookup; single-column-prefix `(employee_id, year)` for the "show me my balance dashboard" query.

### 5.3 `leave_balance_ledger`

> Append-only ledger of every balance mutation. BL-047 immutable. Mirrors a double-entry bookkeeping trail: every change to `leave_balances` writes one row here recording the delta and the reason.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `leave_type_id` | INT | NOT NULL | — | FK→`leave_types.id`. |
| `year` | INT | NOT NULL | — | Which year's balance was affected. |
| `delta` | INT | NOT NULL | — | Signed change. Positive = grant (Initial allocation, Cancellation restore, CarryForward). Negative = consume (Approval, LateMarkPenalty). |
| `reason_id` | INT | NOT NULL | — | §3.2: 1=Initial, 2=Approval, 3=Cancellation, 4=CarryForward, 5=Adjustment, 6=LateMarkPenalty. |
| `related_request_id` | INT NULL | YES | — | When reason is Approval/Cancellation, points at the `leave_requests.id`. NULL for Initial, CarryForward, Adjustment, LateMarkPenalty. |
| `created_by` | INT NULL | YES | — | FK→`employees.id`. Who triggered this mutation. NULL for system-initiated entries (carry-forward cron). |
| `created_at` | DATETIME(3) | NOT NULL | now() | When the mutation happened. Ledger is ordered by this. |

**Indexes:** PK; composite `(employee_id, year, created_at)` — supports the "show me the year's mutation history for this employee" query in newest-first order (the only realistic read of this table).

### 5.4 `leave_code_counters`

> Per-year counter for generating `L-YYYY-NNNN` leave codes. One row per year. Locked with `SELECT … FOR UPDATE` during code generation to serialise concurrent inserts.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `year` | INT PK | — | — | The natural key — one row per year. |
| `number` | INT | NOT NULL | 0 | The last sequence number used. Next leave code uses `number + 1`. |

**No indexes beyond PK.** ~few rows ever.

### 5.5 `leave_requests`

> The headline leave entity. One row per submitted request. Mutated by approve/reject/cancel/escalate.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public code `L-YYYY-NNNN` (generated via `leave_code_counters`). Shown in audit reports, manager queues, email subjects. UNIQUE — never reused. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. The requester. |
| `leave_type_id` | INT | NOT NULL | — | FK→`leave_types.id`. |
| `from_date` | DATE | NOT NULL | — | Inclusive start. |
| `to_date` | DATE | NOT NULL | — | Inclusive end. |
| `days` | INT | NOT NULL | — | Server-computed count of working days between `from_date` and `to_date`, excluding weekends/holidays (BL-011: full-day only, never fractional). Stored (not derived on-read) because the value is also written to `leave_balances` and must not drift. |
| `reason` | TEXT | NOT NULL | — | Free-text justification provided by the employee. TEXT to allow longer narrative when warranted. |
| `status` | INT | NOT NULL | 1 | §3.2: 1=Pending, 2=Approved, 3=Rejected, 4=Cancelled, 5=Escalated. Default 1 on insert. |
| `routed_to_id` | INT | NOT NULL | — | §3.2: 1=Manager, 2=Admin. Captured at submit time (BL-017: manager-with-no-manager → Admin; event-based types → Admin; everyone else → Manager). |
| `approver_id` | INT NULL | YES | — | FK→`employees.id`. The employee whose queue currently owns the request. Manager initially; flips to Admin on BL-018 escalation or BL-022 manager-exit reroute. |
| `decided_at` | DATETIME(3) NULL | YES | — | Timestamp of the approval/rejection action. NULL while Pending. |
| `decided_by` | INT NULL | YES | — | FK→`employees.id`. The actor who decided (usually = approver, but tracked separately to handle delegation scenarios cleanly). |
| `decision_note` | TEXT NULL | YES | — | Approval comment (optional) or rejection note (required by TC-LEAVE-011). Free-text. |
| `escalated_at` | DATETIME(3) NULL | YES | — | Stamped by the escalation cron (BL-018) when the request crosses 5 working days in Pending without a decision. |
| `cancelled_at` | DATETIME(3) NULL | YES | — | Set when status flips to 4=Cancelled. |
| `cancelled_by` | INT NULL | YES | — | FK→`employees.id`. Who cancelled. Self-cancellations have `cancelled_by = employee_id`. |
| `cancelled_after_start` | BOOL | NOT NULL | false | True iff `cancelled_at > from_date`. Drives BL-020: full-restore for pre-start cancellations, partial-restore (remaining-only) for after-start cancellations. Stored explicitly so the restore logic doesn't depend on clock-skew comparisons at read time. |
| `deducted_days` | INT | NOT NULL | 0 | Days actually removed from the balance on approval. Stored so cancellation can restore the exact same number (handles edge cases where balance was adjusted between approval and cancellation). |
| `restored_days` | INT | NOT NULL | 0 | Days returned to the balance on cancellation. Mirrors `deducted_days` for the cancel side — full restore = same value; partial restore = the remaining-only subset. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency — approval, rejection, cancellation each require the caller's version. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; UNIQUE(`code`); composite `(employee_id, status)` — the "my requests" query; composite `(approver_id, status)` — the manager/admin queue; composite `(status, escalated_at)` — the escalation cron's "find Pending where age > 5 working days".

---

## 6. Leave encashment (2)

### 6.1 `encashment_code_counters`

> Same shape as `leave_code_counters`. Generates `LE-YYYY-NNNN` codes.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `year` | INT PK | — | — | Year bucket. |
| `number` | INT | NOT NULL | 0 | Last sequence number. |

### 6.2 `leave_encashments`

> Conversion of unused leave to cash. Six-stage lifecycle: Pending → ManagerApproved → AdminFinalised → Paid. Or short-circuit Rejected / Cancelled. Allowed only within the configured window (default Dec 1 – Jan 15, BL-LE-04). Capped at 50% of remaining balance (BL-LE-05).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public code `LE-YYYY-NNNN`. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `year` | INT | NOT NULL | — | The calendar year whose balance is being encashed. |
| `days_requested` | INT | NOT NULL | — | Employee's requested days. |
| `days_approved` | INT NULL | YES | — | Manager- or Admin-approved count. NULL until at least manager-approval. May be ≤ requested if Admin caps it at the 50% policy. |
| `rate_per_day_paise` | INT NULL | YES | — | Snapshot of the daily rate at finalisation time. Derived from `(basic + allowances) / standardWorkingDays` (BL-LE-08). NULL until AdminFinalised. Snapshot, not live-derived — protects against later salary changes affecting an already-finalised amount. |
| `amount_paise` | INT NULL | YES | — | `days_approved × rate_per_day_paise`. NULL until AdminFinalised. |
| `status` | INT | NOT NULL | 1 | §3.3: 1=Pending, 2=ManagerApproved, 3=AdminFinalised, 4=Paid, 5=Rejected, 6=Cancelled. |
| `routed_to_id` | INT | NOT NULL | — | §3.3: 1=Manager, 2=Admin. Same routing semantics as leave requests. |
| `approver_id` | INT NULL | YES | — | FK→`employees.id`. Current owner of the queue. |
| `decided_at` | DATETIME(3) NULL | YES | — | Latest decision timestamp (manager-approval OR admin-finalisation OR rejection). |
| `decided_by` | INT NULL | YES | — | FK→`employees.id`. Latest decision actor. |
| `decision_note` | TEXT NULL | YES | — | Approval/rejection comment. |
| `escalated_at` | DATETIME(3) NULL | YES | — | Set by the encashment-escalation cron when a Pending request crosses 5 working days (BL-LE-05, mirrors BL-018). |
| `paid_at` | DATETIME(3) NULL | YES | — | Set when the next payroll run picks this up and the associated payslip is finalised (BL-LE-09). |
| `cancelled_at` | DATETIME(3) NULL | YES | — | Cancellation timestamp. |
| `cancelled_by` | INT NULL | YES | — | FK→`employees.id`. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; UNIQUE(`code`); composite `(employee_id, year, status)` — the "show my encashments for this year" view + the in-window check query.

**Why is `paidInPayslip` a back-reference (1:N) instead of a single FK?** A single encashment is typically paid in one payslip but the schema models it as `payslips[]` to keep the relation type-safe even though `payslips.encashment_id` is UNIQUE. The UNIQUE constraint enforces the at-most-one-payslip-per-encashment invariant; the array shape is a Prisma client convenience.

---

## 7. Attendance and regularisation (5)

### 7.1 `attendance_records`

> The atomic unit of attendance. BL-023: one row per Active employee per calendar day (created at midnight IST by `attendance.midnight-generate` cron). BL-026 sets the initial `status` per priority: OnLeave > WeeklyOff/Holiday > Present > Absent (default).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `date` | DATE | NOT NULL | — | The attendance date. |
| `status` | INT | NOT NULL | — | §3.4: 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday. |
| `check_in_time` | DATETIME(3) NULL | YES | — | Set on `POST /attendance/check-in`. NULL for non-Present days. |
| `check_out_time` | DATETIME(3) NULL | YES | — | Set on `POST /attendance/check-out`. NULL while still checked-in. |
| `hours_worked_minutes` | INT NULL | YES | — | Server-computed from `(check_out_time - check_in_time)` in minutes. NULL while the worker is still checked in or hasn't checked in. |
| `target_hours` | INT | NOT NULL | 8 | Daily-hours target snapshotted from `configurations.ATTENDANCE_STANDARD_DAILY_HOURS` at row creation. Frozen for historical correctness — when admin changes the global config, past rows keep the target that applied on the day they were recorded. A regularisation row (`source_id = 2`) inherits its `target_hours` from the corresponding system row of the same date so a corrected day is still measured against the policy that applied then. Read by the My Attendance "below target" chart classification so historical bars stay correctly coloured after a policy change. |
| `late` | BOOL | NOT NULL | false | True iff `check_in_time > configured threshold` (default 10:30 IST, BL-027). |
| `late_month_count` | INT | NOT NULL | 0 | Cumulative late count in the calendar month at the moment this row was last touched. Stored (not derived on-read) so the BL-028 penalty deduction can be triggered atomically at check-in time. |
| `lop_applied` | BOOL | NOT NULL | false | True iff this row's Absent status triggers Loss-of-Pay at the next payroll run. Drives payroll's LOP calculation. |
| `source_id` | INT | NOT NULL | — | §3.4: 1=system (midnight cron / check-in), 2=regularisation (correction row). Allows querying "actual rows" vs "corrected rows" without joining. |
| `regularisation_id` | INT NULL | YES | — | FK→`regularisation_requests.id`. Set on rows where `source_id = 2` to track which approval produced this correction. NULL for system rows. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency on check-out and undo-check-out paths. |
| `created_at` | DATETIME(3) | NOT NULL | now() | When the row was created (midnight cron OR regularisation approval). |

**Indexes:** PK; UNIQUE(`employee_id`, `date`, `source_id`) — enforces "one system row + at most one regularisation row per employee per day"; composite `(employee_id, date)` — the calendar view; composite `(date, status)` — the org-wide daily attendance report.

### 7.2 `attendance_late_ledger`

> Per-month late-mark counter per employee. BL-028: every 3rd late mark in a calendar month deducts one full day from Annual leave.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `year` | INT | NOT NULL | — | Year bucket — `(year, month)` together identify a calendar month. |
| `month` | INT | NOT NULL | — | 1-12. |
| `count` | INT | NOT NULL | 0 | Number of late marks accumulated in this month so far. |
| `updated_at` | DATETIME(3) | NOT NULL | now()/auto | When this counter was last bumped. |

**Indexes:** PK + UNIQUE(`employee_id`, `year`, `month`) — natural compound key + the lookup query for "what's this employee's late count this month?".

### 7.3 `reg_code_counters`

> Per-year counter for generating `R-YYYY-NNNN` regularisation codes.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `year` | INT PK | — | — | Year bucket. |
| `number` | INT | NOT NULL | 0 | Last sequence number. |

### 7.4 `regularisation_requests`

> Correction request for a past attendance record. Routing by age (BL-029): ≤7 days → Manager; >7 days → Admin. On approval, creates a new `attendance_records` row with `source_id = 2`.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public code `R-YYYY-NNNN`. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. The requester. |
| `date` | DATE | NOT NULL | — | The date being corrected. Always in the past. |
| `proposed_check_in` | DATETIME(3) NULL | YES | — | What the employee says their check-in time should have been. NULL if only correcting checkout. |
| `proposed_check_out` | DATETIME(3) NULL | YES | — | Same for checkout. At least one of in/out must be non-null (refined by contract). |
| `reason` | TEXT | NOT NULL | — | Free-text justification. |
| `status` | INT | NOT NULL | 1 | §3.4: 1=Pending, 2=Approved, 3=Rejected. |
| `routed_to_id` | INT | NOT NULL | — | §3.4: 1=Manager (age ≤ 7d), 2=Admin (age > 7d). |
| `age_days_at_submit` | INT | NOT NULL | — | The age in days at submission time. Captured so a request that ages past 7 days while pending doesn't suddenly re-route — the routing decision is fixed at submit. |
| `approver_id` | INT NULL | YES | — | FK→`employees.id`. Current queue owner. |
| `decided_at` | DATETIME(3) NULL | YES | — | Decision timestamp. |
| `decided_by` | INT NULL | YES | — | FK→`employees.id`. Decision actor. |
| `decision_note` | TEXT NULL | YES | — | Approval/rejection comment. |
| `corrected_record_id` | INT UNIQUE NULL | YES | — | FK→`attendance_records.id`. Set on approval — points at the correction row that was created. UNIQUE — each correction row is the product of exactly one approved request. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; UNIQUE(`code`); UNIQUE(`corrected_record_id`); composite `(employee_id, status)` and `(approver_id, status)` — same query patterns as leave_requests.

### 7.5 `holidays`

> Public holiday calendar. One row per holiday date per year. Driven by BL-026 attendance-status derivation and BL-025-related working-day calculations.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `date` | DATE UNIQUE | NOT NULL | — | The holiday date. UNIQUE — only one holiday per calendar date (multiple festivals on the same date collapse into one row with a combined `name`). |
| `name` | VARCHAR | NOT NULL | — | Display name. |
| `year` | INT | NOT NULL | — | Denormalised from `date` for the year-range query. Avoids `WHERE YEAR(date) = ?` which can't use the date index efficiently. |
| `source` | VARCHAR NULL | YES | — | Free-text label ('manual', 'gazette', 'custom') — provenance. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; UNIQUE(`date`); single-column on `year` — the "show me this year's holidays" admin view.

---

## 8. Payroll (3)

### 8.1 `payroll_code_counters`

> Composite-keyed counter for `P-YYYY-MM-NNNN` payslip codes. One row per `(year, month)`. Run codes (`RUN-YYYY-MM`) don't use this counter since they're 1-per-month — the UNIQUE constraint on `payroll_runs(month, year, reversal_of_run_id)` enforces that.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `year` | INT | NOT NULL | — | First half of composite PK. |
| `month` | INT | NOT NULL | — | Second half. |
| `number` | INT | NOT NULL | 0 | Last payslip sequence used for this month. |

**Indexes:** Composite PK (`year`, `month`).

### 8.2 `payroll_runs`

> A monthly batch operation that produces one payslip per active employee. BL-031: finalised runs are immutable. BL-032: reversals create a *new* row (rather than mutate the original) — `reversal_of_run_id` points back at the original.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public code `RUN-YYYY-MM` for originals, `RUN-YYYY-MM-R<n>` for reversals. UNIQUE — never reused. |
| `month` | INT | NOT NULL | — | 1-12. |
| `year` | INT | NOT NULL | — | The payroll year. Combined with `month`, identifies the period. |
| `status` | INT | NOT NULL | 2 | §3.5: 1=Draft, 2=Review, 3=Finalised, 4=Reversed. Default 2 — runs are created in Review, then finalised. |
| `working_days` | INT | NOT NULL | — | Server-computed working days in the period (excludes weekends + holidays). Stored so LOP and proration math is stable even if holidays are edited later. |
| `period_start` | DATE | NOT NULL | — | Inclusive first day of the period. Usually the 1st of the month. |
| `period_end` | DATE | NOT NULL | — | Inclusive last day. |
| `initiated_by` | INT | NOT NULL | — | FK→`employees.id`. The Admin/PO who created the run. |
| `initiated_at` | DATETIME(3) | NOT NULL | now() | When the run was created. |
| `finalised_by` | INT NULL | YES | — | FK→`employees.id`. The Admin/PO who finalised. NULL until status=3. |
| `finalised_at` | DATETIME(3) NULL | YES | — | Finalisation timestamp. |
| `reversed_by` | INT NULL | YES | — | FK→`employees.id`. The Admin who triggered reversal (BL-033 Admin-only). NULL on unreversed originals. |
| `reversed_at` | DATETIME(3) NULL | YES | — | Reversal timestamp. |
| `reversal_reason` | TEXT NULL | YES | — | Required text explaining why this run was reversed. Audit-logged. |
| `reversal_of_run_id` | INT NULL | YES | — | FK→`payroll_runs.id`. Set on a reversal row to point at the original. NULL on originals. |
| `version` | INT | NOT NULL | 0 | Optimistic concurrency on finalise/reverse (BL-034 two-step + concurrent-finalise guard). |

**Indexes:** PK; UNIQUE(`code`); UNIQUE(`month`, `year`, `reversal_of_run_id`) — enforces at most one original AND at most one reversal per month/year (the constraint is correct because two distinct `reversal_of_run_id` values produce distinct tuples); composite `(status, year, month)` — supports the runs-list filtered by status across the active fiscal year.

### 8.3 `payslips`

> One per (run, employee). Snapshot of pay components and deductions at finalisation. Immutable post-finalise (BL-031).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public code `P-YYYY-MM-NNNN`. Shown on the PDF and on the employee's payslips list. |
| `run_id` | INT | NOT NULL | — | FK→`payroll_runs.id`. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. |
| `month` | INT | NOT NULL | — | Denormalised from run for query convenience. |
| `year` | INT | NOT NULL | — | Denormalised from run. |
| `status` | INT | NOT NULL | 2 | §3.5 (mirrors run status). |
| `period_start` | DATE | NOT NULL | — | Usually = run's period_start; may differ for reversal records. |
| `period_end` | DATE | NOT NULL | — | Same. |
| `working_days` | INT | NOT NULL | — | Period working-days (denormalised from run). |
| `days_worked` | INT | NOT NULL | — | Actual working days the employee was Present/OnLeave (not LOP). Used for proration on mid-month joiners/exits (BL-036). |
| `lop_days` | INT | NOT NULL | 0 | Unauthorised-absent days that incur loss-of-pay deduction (BL-035). |
| `basic_paise` | INT | NOT NULL | — | Snapshot of basic at this payroll's period_start (BL-030 — latest salary effective ≤ period_start). |
| `allowances_paise` | INT | NOT NULL | — | Snapshot. |
| `gross_paise` | INT | NOT NULL | — | Pro-rated earned amount: `(basic + allowances) × days_worked / working_days`. Computed at finalisation, not on read. |
| `lop_deduction_paise` | INT | NOT NULL | 0 | BL-035 formula: `(basic + allowances) / working_days × lop_days`. |
| `reference_tax_paise` | INT | NOT NULL | 0 | BL-036a: reference tax computed as `gross × configured_rate`. Display-only — the PO sees this and decides the final tax. |
| `final_tax_paise` | INT | NOT NULL | 0 | The actual tax deducted. PO enters during Review; defaults to `reference_tax_paise` on create. |
| `other_deductions_paise` | INT | NOT NULL | 0 | PF, professional tax, advances, etc. |
| `net_pay_paise` | INT | NOT NULL | — | `gross - lop_deduction - final_tax - other_deductions + encashment_paise`. The single number on the bank transfer. |
| `encashment_days` | INT | NOT NULL | 0 | Days of leave encashed in this period (BL-LE-09). Adds to gross via `encashment_paise`. |
| `encashment_paise` | INT | NOT NULL | 0 | The cash value of `encashment_days`. Joins to the `leave_encashments` row via `encashment_id`. |
| `encashment_id` | INT UNIQUE NULL | YES | — | FK→`leave_encashments.id`. Set when this payslip pays out an encashment. UNIQUE — an encashment is paid in exactly one payslip. |
| `finalised_at` | DATETIME(3) NULL | YES | — | Set when the parent run is finalised. |
| `reversal_of_payslip_id` | INT UNIQUE NULL | YES | — | FK→`payslips.id`. Set on a reversal payslip — points at the original. |
| `reversed_by_payslip_id` | INT UNIQUE NULL | YES | — | FK→`payslips.id`. Set on the original — points at its reversal. The pair is one-to-one. |
| `version` | INT | NOT NULL | 0 | Concurrency. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; UNIQUE(`code`); UNIQUE(`encashment_id`); UNIQUE(`reversal_of_payslip_id`); UNIQUE(`reversed_by_payslip_id`); UNIQUE(`run_id`, `employee_id`) — at most one payslip per run per employee; composite `(employee_id, year, month)` — the employee's payslip list.

---

## 9. Performance (3)

### 9.1 `performance_cycles`

> A half-yearly review window. H1 = April–September, H2 = October–March (BL-003 Indian fiscal). Lifecycle: Open → SelfReview → ManagerReview → Closed.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `code` | VARCHAR UNIQUE | NOT NULL | — | Public code `C-YYYY-H1` or `C-YYYY-H2`. |
| `fy_start` | DATE | NOT NULL | — | Fiscal-year period start. |
| `fy_end` | DATE | NOT NULL | — | Fiscal-year period end. |
| `status` | INT | NOT NULL | 1 | §3.6: 1=Open, 2=SelfReview, 3=ManagerReview, 4=Closed. Drives which mutations are allowed. |
| `self_review_deadline` | DATE | NOT NULL | — | Last date employees can edit self-rating (BL-039). |
| `manager_review_deadline` | DATE | NOT NULL | — | Last date managers can edit manager-rating (BL-040). |
| `closed_at` | DATETIME(3) NULL | YES | — | Set when Admin closes the cycle. |
| `closed_by` | INT NULL | YES | — | FK→`employees.id`. |
| `created_by` | INT | NOT NULL | — | FK→`employees.id`. The Admin who created the cycle. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |
| `version` | INT | NOT NULL | 0 | Concurrency on the close action. |

**Indexes:** PK; UNIQUE(`code`).

### 9.2 `performance_reviews`

> One row per (cycle, employee). Auto-generated when a cycle is created — one row for each Active employee at cycle start. Mid-cycle joiners are skipped (BL-037).

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `cycle_id` | INT | NOT NULL | — | FK→`performance_cycles.id`. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. The reviewee. |
| `manager_id` | INT NULL | YES | — | FK→`employees.id`. The current owner of the manager-rating slot. Initially = the reviewee's reporting manager at cycle creation; can change mid-cycle if reporting manager flips (BL-042). |
| `previous_manager_id` | INT NULL | YES | — | FK→`employees.id`. Set on reassignment so the audit shows both managers (BL-042). |
| `self_rating` | INT NULL | YES | — | 1–5. NULL until the employee submits. |
| `self_note` | TEXT NULL | YES | — | Employee's self-review narrative. |
| `manager_rating` | INT NULL | YES | — | 1–5. NULL until the manager submits. |
| `manager_note` | TEXT NULL | YES | — | Manager's review narrative. |
| `manager_overrode_self` | BOOL | NOT NULL | false | True iff `manager_rating != self_rating` (or self was NULL when manager submitted). Surfaces a "manager-changed" tag in the UI (BL-040). |
| `final_rating` | INT NULL | YES | — | Set on cycle close — equal to `manager_rating` at the close moment. Locked thereafter (BL-041). |
| `locked_at` | DATETIME(3) NULL | YES | — | Stamped at cycle close — UI uses it to show a lock icon. |
| `version` | INT | NOT NULL | 0 | Concurrency on self-rating and manager-rating submissions. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; UNIQUE(`cycle_id`, `employee_id`) — one review per employee per cycle; single-column `(employee_id)` for the employee's "my reviews" page.

### 9.3 `goals`

> Manager- or employee-defined goals under a review. Manager defines 3–5 at cycle start (BL-038); employee may propose additional goals during the self-review window.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `review_id` | INT | NOT NULL | — | FK→`performance_reviews.id`. |
| `text` | TEXT | NOT NULL | — | Free-text goal description. |
| `outcome_id` | INT | NOT NULL | 1 | §3.6: 1=Pending, 2=Met, 3=Partial, 4=Missed. Default 1; manager rates at review submission. |
| `proposed_by_employee` | BOOL | NOT NULL | false | True if the employee added this goal during self-review (BL-038). Drives a small UI badge. |
| `version` | INT | NOT NULL | 0 | Concurrency. |
| `created_at`, `updated_at` | DATETIME(3) | NOT NULL | now() | Provenance. |

**Indexes:** PK; single-column `(review_id)` for "list all goals under this review".

---

## 10. Notifications, audit, configuration, idempotency (4)

### 10.1 `notifications`

> In-app feed entry. BL-043: system-generated only. BL-044: scoped by caller (one row per recipient — fan-out via `createMany`). BL-046: in-app only, no email/SMS/push. BL-045: pruned by the 90-day retention cron.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `recipient_id` | INT | NOT NULL | — | FK→`employees.id`. The user who sees this notification. |
| `category_id` | INT | NOT NULL | — | §3.7: 1=Leave, 2=Attendance, 3=Payroll, 4=Performance, 5=Status, 6=Configuration, 7=Auth, 8=System. Drives the filter chips in the bell-menu UI. |
| `title` | VARCHAR(120) | NOT NULL | — | Short headline. ≤120 chars — silently truncated in the `notify()` helper. |
| `body` | TEXT | NOT NULL | — | Plain text body. ≤600 chars — silently truncated. No HTML — UI renders text only. |
| `link` | VARCHAR(191) NULL | YES | — | Optional deep link, MUST start with `/` (SEC-001-P6 — defence-in-depth check in the helper rejects/nulls anything else). |
| `unread` | BOOL | NOT NULL | true | Flipped to false by `POST /notifications/mark-read`. The default ensures freshly inserted rows show up. |
| `audit_log_id` | INT NULL | YES | — | FK→`audit_log.id`. Optional pointer at the audit row that produced this notification. Lets Admin views jump from the notification to the underlying audit entry. |
| `created_at` | DATETIME(3) | NOT NULL | now() | Used for both ordering (newest-first feed) and retention pruning. |

**Indexes:** PK; composite `(recipient_id, unread, created_at DESC)` — the "my unread notifications, newest first" feed query (the dominant read path); single-column `(created_at)` — the retention-cleanup cron's `WHERE created_at < cutoff`.

### 10.2 `audit_log`

> Append-only record of every state-changing action. BL-047: every mutation writes a row. BL-048: enforced append-only via `REVOKE UPDATE, DELETE` on the table after migration.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `actor_id` | INT NULL | YES | — | FK→`employees.id`. The user who performed the action. NULL for system actions (cron jobs). |
| `actor_role_id` | INT | NOT NULL | — | §3.9: 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin, 99=unknown, 100=system. **Snapshot** of the actor's role at the moment of the action — survives later role changes. Stored separately from `actor_id` because the actor's role can change later but this audit row must reflect the role they had at action time. |
| `actor_ip` | VARCHAR NULL | YES | — | Source IP captured from the HTTP request. NULL for cron actions. Forensic / security signal. |
| `action` | VARCHAR | NOT NULL | — | Dot-separated action name (`leave.approve`, `payroll.run.finalise`, etc.). Substring-searched on the audit-log filter. |
| `target_type_id` | INT NULL | YES | — | §3.9: which entity type was affected (1=Employee, 2=LeaveRequest, …, 14=Notification). NULL for actions that don't target a specific record (e.g., login). |
| `target_id` | INT NULL | YES | — | The specific entity's ID — polymorphic (interpreted via `target_type_id`). |
| `module_id` | INT | NOT NULL | — | FK→`audit_modules.id`. Top-level module grouping (auth, leave, payroll, …). Drives the module-filter dropdown. |
| `before` | JSON NULL | YES | — | Snapshot of the affected record's relevant fields before the change. NULL for create actions. |
| `after` | JSON NULL | YES | — | Snapshot after the change. NULL for delete actions. |
| `created_at` | DATETIME(3) | NOT NULL | now() | When the action happened — the ordering key for the audit-log feed. |

**Indexes:** PK; single-column `(actor_id)`, `(action)`, `(created_at)`, `(module_id)`; composite `(target_type_id, target_id)` — supports the "show all audit entries for entity X" query, e.g. "all actions on LeaveRequest 42".

### 10.3 `configurations`

> Key/value JSON store for runtime tunables. PK is the `key` string — no surrogate. Holds things like `LATE_THRESHOLD`, `LEAVE_ESCALATION_WORKING_DAYS`, `ENCASHMENT_WINDOW_START_MONTH`, `TAX_GROSS_TAXABLE_BASIS`.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `key` | VARCHAR PK | — | — | Semantic key (e.g., `LATE_THRESHOLD`). The natural PK — no surrogate needed since keys are unique by definition. |
| `value` | JSON | NOT NULL | — | The value — JSON to allow strings, numbers, booleans, arrays, or small objects without per-type tables. |
| `updated_by` | VARCHAR NULL | YES | — | The actor who last changed this. String (not FK) — sometimes set to `'seed'` for seed-initialised rows. |
| `updated_at` | DATETIME(3) | NOT NULL | now()/auto | When it was last touched. |

**Indexes:** PK only.

### 10.4 `idempotency_keys`

> Stores `(employee, endpoint, key) → response snapshot` for retry-safety on mutating endpoints. Pruned by the 24-hour cleanup cron.

| Column | Type | Null | Default | Justification |
|---|---|---|---|---|
| `id` | INT PK | — | autoinc | Surrogate. |
| `key` | VARCHAR UNIQUE | NOT NULL | — | The client-supplied idempotency token. UNIQUE so the lookup is one-row. |
| `employee_id` | INT | NOT NULL | — | FK→`employees.id`. Scopes the key — different users' identical keys are independent. |
| `endpoint` | VARCHAR | NOT NULL | — | The path of the original request. Same key on a different endpoint is treated as a different operation. |
| `response_snapshot` | JSON | NOT NULL | — | The exact response body returned on the first call — replayed verbatim on retries. |
| `created_at` | DATETIME(3) | NOT NULL | now() | When the key was first stored. Drives the 24-hour TTL cleanup. |

**Indexes:** PK; UNIQUE(`key`); single-column `(created_at)` for the cleanup cron.

---

## 11. Prisma's own table

### `_prisma_migrations`

Managed entirely by Prisma migrate. Tracks which migrations have been applied. Schema:

| Column | Type | Purpose |
|---|---|---|
| `id` | VARCHAR(36) | UUID assigned by Prisma. |
| `checksum` | VARCHAR(64) | SHA-256 of the migration SQL — detects drift. |
| `finished_at` | DATETIME | Set when the migration completes successfully. |
| `migration_name` | VARCHAR(255) | The directory name under `prisma/migrations/`. |
| `logs` | TEXT | Output captured during apply. |
| `rolled_back_at` | DATETIME | Set if rolled back. |
| `started_at` | DATETIME | Apply start time. |
| `applied_steps_count` | INT UNSIGNED | Number of statements applied. |

Hands-off — never write to this manually. It's included in the `schema_v2.sql` dump so the destination DB picks up where the source left off without re-running migrations.

---

## Appendix A — INT-code mappings (frozen)

Every code listed here is **frozen**: once assigned, the meaning never changes; new codes are appended only. Updates to this list must propagate to (a) `apps/api/src/lib/statusInt.ts`, (b) `apps/web/src/lib/status/maps.ts`, (c) the zod range validators in `packages/contracts/src/*.ts`, (d) the MySQL `COLUMN_COMMENT` migration, (e) the seed where applicable, (f) `HRMS_Schema_v2_Plan.md` §3.

| Column | Codes |
|---|---|
| `roles.id` | 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin |
| `employment_types.id` | 1=Permanent, 2=Contract, 3=Probation, 4=Intern |
| `genders.id` | 1=Male, 2=Female, 3=Other, 4=PreferNotToSay |
| `audit_modules.id` | 1=auth, 2=employees, 3=leave, 4=payroll, 5=attendance, 6=performance, 7=notifications, 8=audit, 9=configuration |
| `leave_types.id` | 1=Annual, 2=Sick, 3=Casual, 4=Unpaid, 5=Maternity, 6=Paternity |
| `*.status` (all master tables) | 1=Active, 2=Deprecated |
| `employees.status` | 1=Active, 2=OnNotice, 3=OnLeave, 4=Inactive, 5=Exited |
| `leave_requests.status` | 1=Pending, 2=Approved, 3=Rejected, 4=Cancelled, 5=Escalated |
| `leave_encashments.status` | 1=Pending, 2=ManagerApproved, 3=AdminFinalised, 4=Paid, 5=Rejected, 6=Cancelled |
| `attendance_records.status` | 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday |
| `attendance_records.source_id` | 1=system, 2=regularisation |
| `regularisation_requests.status` | 1=Pending, 2=Approved, 3=Rejected |
| `payroll_runs.status` / `payslips.status` | 1=Draft, 2=Review, 3=Finalised, 4=Reversed |
| `performance_cycles.status` | 1=Open, 2=SelfReview, 3=ManagerReview, 4=Closed |
| `goals.outcome_id` | 1=Pending, 2=Met, 3=Partial, 4=Missed |
| `*.routed_to_id` (leave / encashment / regularisation) | 1=Manager, 2=Admin |
| `notifications.category_id` | 1=Leave, 2=Attendance, 3=Payroll, 4=Performance, 5=Status, 6=Configuration, 7=Auth, 8=System |
| `audit_log.target_type_id` | 1=Employee, 2=LeaveRequest, 3=LeaveEncashment, 4=AttendanceRecord, 5=RegularisationRequest, 6=PayrollRun, 7=Payslip, 8=PerformanceCycle, 9=PerformanceReview, 10=Goal, 11=Configuration, 12=SalaryStructure, 13=Holiday, 14=Notification |
| `audit_log.actor_role_id` | 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin, 99=unknown, 100=system |
| `reporting_manager_history.reason_id` | 1=Initial, 2=Reassigned, 3=Exited |
| `leave_balance_ledger.reason_id` | 1=Initial, 2=Approval, 3=Cancellation, 4=CarryForward, 5=Adjustment, 6=LateMarkPenalty |
| `password_reset_tokens.purpose_id` | 1=FirstLogin, 2=ResetPassword |

---

## Appendix B — Index inventory

Total index count drives both performance and storage. A rough survey:

| Domain | Indexes |
|---|---|
| Master tables (7) | 7 PKs + 7 UNIQUE(name) |
| `employees` | PK + UNIQUE(email) + UNIQUE(code) + 9 single-column (email, reporting_manager_id, previous_reporting_manager_id, role_id, employment_type_id, department_id, designation_id, gender_id, status) |
| Session / auth (3) | PK + UNIQUE(token); PK + composite (email, created_at) + composite (ip, created_at); PK + UNIQUE(token_hash) + single (employee_id) + single (expires_at) |
| `salary_structures` | PK + composite (employee_id, effective_from DESC) |
| `reporting_manager_history` | PK + composite (employee_id, from_date DESC) + composite (manager_id, to_date) |
| `leave_quotas` | PK + UNIQUE(leave_type_id, employment_type_id) |
| `leave_balances` | PK + UNIQUE(employee_id, leave_type_id, year) + composite (employee_id, year) |
| `leave_balance_ledger` | PK + composite (employee_id, year, created_at) |
| `leave_requests` | PK + UNIQUE(code) + 3 composites: (employee_id, status), (approver_id, status), (status, escalated_at) |
| `leave_encashments` | PK + UNIQUE(code) + composite (employee_id, year, status) |
| `attendance_records` | PK + UNIQUE(employee_id, date, source_id) + composite (employee_id, date) + composite (date, status) |
| `attendance_late_ledger` | PK + UNIQUE(employee_id, year, month) |
| `regularisation_requests` | PK + UNIQUE(code) + UNIQUE(corrected_record_id) + composites (employee_id, status), (approver_id, status) |
| `holidays` | PK + UNIQUE(date) + single (year) |
| `payroll_runs` | PK + UNIQUE(code) + UNIQUE(month, year, reversal_of_run_id) + composite (status, year, month) |
| `payslips` | PK + UNIQUE(code) + 3 UNIQUE FK columns (encashment_id, reversal_of_payslip_id, reversed_by_payslip_id) + UNIQUE(run_id, employee_id) + composite (employee_id, year, month) |
| `performance_cycles` | PK + UNIQUE(code) |
| `performance_reviews` | PK + UNIQUE(cycle_id, employee_id) + single (employee_id) |
| `goals` | PK + single (review_id) |
| `notifications` | PK + composite (recipient_id, unread, created_at DESC) + single (created_at) |
| `audit_log` | PK + 4 single-column (actor_id, action, created_at, module_id) + composite (target_type_id, target_id) |
| `configurations` | PK only |
| `idempotency_keys` | PK + UNIQUE(key) + single (created_at) |

Total: ~70 indexes across 35 tables. Most are FK-target indexes mandated by `relationMode = "prisma"` (Prisma docs recommend manually indexing each FK column since the DB doesn't auto-create one without the constraint).

---

## Appendix C — Business-rule index

Quick map of which BL rule touches which table(s). The full text of each rule is in `prototype/Business Logics.md` and the test cases in `docs/HRMS_Test_Cases.md`.

| Rule | Touches |
|---|---|
| BL-003 (Indian fiscal calendar — April–March) | `performance_cycles` |
| BL-004 (every role is also an employee) | `employees` (all roles are rows here) |
| BL-005 (no circular reporting) | `employees.reporting_manager_id` (enforced in service) |
| BL-006 (employee status transitions) | `employees.status` |
| BL-007 (history never deleted) | `reporting_manager_history`, `audit_log`, `salary_structures` |
| BL-008 (EMP code never reused) | `employees.code` |
| BL-009 (no leave-with-leave overlap) | `leave_requests` |
| BL-010 (no leave-with-regularisation conflict) | `leave_requests` × `regularisation_requests` |
| BL-011 (full-day leave only) | `leave_requests.days` |
| BL-012 (sick leave doesn't carry forward) | `leave_types.carry_forward_cap` + carry-forward cron |
| BL-013 (annual/casual carry-forward caps) | `leave_types.carry_forward_cap` |
| BL-014 (maternity/paternity event-based) | `leave_types.is_event_based` |
| BL-015 / BL-016 (M/P admin-only + caps) | `leave_types.requires_admin_approval`, `leave_types.max_days_per_event` |
| BL-017 (manager-without-manager → Admin) | `leave_requests.routed_to_id` |
| BL-018 (5-working-day SLA → escalate) | `leave_requests.escalated_at` + cron |
| BL-019 (cancellation rights) | `leave_requests.cancelled_by`, `cancelled_after_start` |
| BL-020 (balance restoration on cancel) | `leave_requests.restored_days` + `leave_balance_ledger` |
| BL-021 (deduct on approval) | `leave_balances` + `leave_balance_ledger` |
| BL-022 / BL-022a (manager exit routing) | `leave_requests.approver_id` + `employees.previous_reporting_manager_id` |
| BL-023 (one attendance row per day) | `attendance_records` (UNIQUE constraint) |
| BL-024 (check-out mandatory) | `attendance_records.check_out_time` |
| BL-025 / BL-025a (computed hours, configurable standard) | `attendance_records.hours_worked_minutes`, `attendance_records.target_hours` (per-row snapshot for historical correctness), `configurations.ATTENDANCE_STANDARD_DAILY_HOURS` (current value) |
| BL-026 (status derivation priority) | `attendance_records.status` (initial setting at midnight) |
| BL-027 (late threshold) | `attendance_records.late`, `configurations.LATE_THRESHOLD` |
| BL-028 (3-late penalty) | `attendance_late_ledger.count` |
| BL-029 (regularisation routing by age) | `regularisation_requests.age_days_at_submit` / `routed_to_id` |
| BL-030 (salary edits → next run) | `salary_structures.effective_from` |
| BL-031 (finalised payslip immutable) | `payslips.status` / `finalised_at` |
| BL-032 (reversal creates new row) | `payroll_runs.reversal_of_run_id` + `payslips.reversal_of_payslip_id` |
| BL-033 (only Admin reverses) | enforced via `requireRole` middleware |
| BL-034 (concurrent finalise guard) | `payroll_runs.version` + two-step confirm |
| BL-035 (LOP formula) | `payslips.lop_deduction_paise` |
| BL-036 (mid-month proration) | `payslips.days_worked` / `working_days` |
| BL-036a (manual tax with reference) | `payslips.reference_tax_paise` / `final_tax_paise` |
| BL-037 (mid-cycle joiners skipped) | `performance_reviews` (created only for pre-cycle-start employees) |
| BL-038 (3–5 goals + employee proposals) | `goals.proposed_by_employee` |
| BL-039 (self-rating editable until deadline) | `performance_cycles.self_review_deadline` |
| BL-040 (manager-rating + override flag) | `performance_reviews.manager_overrode_self` |
| BL-041 (cycle closed → no edits) | `performance_cycles.status` = 4 (Closed) |
| BL-042 (mid-cycle manager change) | `performance_reviews.previous_manager_id` |
| BL-043 / BL-044 / BL-045 / BL-046 (notification rules) | `notifications` |
| BL-047 (audit log every action) | `audit_log` (every insert) |
| BL-048 (audit append-only) | `audit_log` (post-migration `REVOKE UPDATE, DELETE`) |
| BL-LE-01 .. BL-LE-14 (encashment rules) | `leave_encashments`, `payslips.encashment_id`, `configurations.ENCASHMENT_*` |

---

*Last verified against schema.prisma + applied migrations on 2026-05-13.*
