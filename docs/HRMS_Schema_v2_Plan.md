# Schema v2 — Full Refactor Plan

**Status:** **PLANNING — awaiting owner sign-off (say "go" to begin Phase 1).**
**Branch:** `database_schema_changes`
**Approach:** **Clean-target rewrite, no transitional dual-shape.** This is staging only; no real user data; the deployed DB is replaced from a fresh `.sql` export. Application code is rewritten forward to match the new shape — typecheck will temporarily fail across modules until the rewrite is complete.

---

## 1. Goals (locked)

1. **Every primary key is `INTEGER AUTO_INCREMENT`.** No cuids, no ULIDs.
2. **Every status / type / category column is `INT`.** No Prisma enums in the schema.
3. **Master tables hold lookup data.** Standard shape: `(id INT PK, name UNIQUE, status_id INT DEFAULT 1, created_at, updated_at)`.
4. **Frontend owns INT → label mapping.** Reusable `<StatusBadge>` + per-entity status maps. No backend-side enum→string conversion.
5. **All DB column names are `snake_case`.** Prisma field names stay camelCase, bridged via `@map("snake_case_name")`.
6. **No `FOREIGN KEY` constraints.** `relationMode = "prisma"` enforces integrity at the application layer. `@relation` directives stay; the DB engine doesn't enforce them.

---

## 2. Master tables (7 total)

Each has the shape `(id INT PK, name UNIQUE, status_id INT DEFAULT 1, created_at, updated_at)`. `status_id` semantics: `1 = Active`, `2 = Deprecated`.

| Master | Seed data | Replaces |
|---|---|---|
| **roles** | Employee, Manager, PayrollOfficer, Admin | `employees.role` enum |
| **employment_types** | Permanent, Contract, Probation, Intern | `employees.employment_type` enum |
| **departments** | Engineering, Design, HR, Finance, Operations, Product, Sales | `employees.department String?` (seeded from existing distinct values; Admin can add more) |
| **designations** | Software Engineer, Engineering Manager, Head of People, Payroll Officer, …(seeded from existing distinct values) | `employees.designation String?` (Admin can add more) |
| **genders** | Male, Female, Other, PreferNotToSay | `employees.gender String?` |
| **audit_modules** | auth, employees, leave, payroll, attendance, performance, notifications, audit, configuration | `audit_log.module String` |
| **leave_types** | Annual, Sick, Casual, Unpaid, Maternity, Paternity (with their isEventBased, carryForwardCap, etc.) | already a master in current schema; PK flips from cuid to INT |

---

## 3. INT-code columns (19 total)

Plain INT columns; meaning lives in `apps/web/src/lib/status/maps.ts` + `apps/api/src/lib/statusInt.ts`. Values are FROZEN — never re-number, only append.

### 3.1 Employee state

| Column | Code → label |
|---|---|
| `employees.status_id` | 1=Active, 2=OnNotice, 3=OnLeave, 4=Inactive, 5=Exited |

### 3.2 Leave

| Column | Code → label |
|---|---|
| `leave_requests.status_id` | 1=Pending, 2=Approved, 3=Rejected, 4=Cancelled, 5=Escalated |
| `leave_requests.routed_to_id` | 1=Manager, 2=Admin |
| `leave_balance_ledger.reason_id` | 1=Initial, 2=Approval, 3=Cancellation, 4=CarryForward, 5=Adjustment, 6=LateMarkPenalty |

### 3.3 Leave Encashment

| Column | Code → label |
|---|---|
| `leave_encashments.status_id` | 1=Pending, 2=ManagerApproved, 3=AdminFinalised, 4=Paid, 5=Rejected, 6=Cancelled |
| `leave_encashments.routed_to_id` | 1=Manager, 2=Admin |

### 3.4 Attendance + Regularisation

| Column | Code → label |
|---|---|
| `attendance_records.status_id` | 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday |
| `attendance_records.source_id` | 1=system, 2=regularisation |
| `regularisation_requests.status_id` | 1=Pending, 2=Approved, 3=Rejected |
| `regularisation_requests.routed_to_id` | 1=Manager, 2=Admin |

### 3.5 Payroll

| Column | Code → label |
|---|---|
| `payroll_runs.status_id` | 1=Draft, 2=Review, 3=Finalised, 4=Reversed |
| `payslips.status_id` | (identical mapping to payroll_runs) |

### 3.6 Performance

| Column | Code → label |
|---|---|
| `performance_cycles.status_id` | 1=Open, 2=SelfReview, 3=ManagerReview, 4=Closed |
| `goals.outcome_id` | 1=Pending, 2=Met, 3=Partial, 4=Missed |

### 3.7 Notifications

| Column | Code → label |
|---|---|
| `notifications.category_id` | 1=Leave, 2=Attendance, 3=Payroll, 4=Performance, 5=Status, 6=Configuration, 7=Auth, 8=System |

### 3.8 Auth / hierarchy

| Column | Code → label |
|---|---|
| `reporting_manager_history.reason_id` | 1=Initial, 2=Reassigned, 3=Exited |
| `password_reset_tokens.purpose_id` | 1=FirstLogin, 2=ResetPassword |

### 3.9 Audit log

| Column | Code → label |
|---|---|
| `audit_log.target_type_id` | 1=Employee, 2=LeaveRequest, 3=LeaveEncashment, 4=AttendanceRecord, 5=RegularisationRequest, 6=PayrollRun, 7=Payslip, 8=PerformanceCycle, 9=PerformanceReview, 10=Goal, 11=Configuration, 12=SalaryStructure, 13=Holiday, 14=Notification |
| `audit_log.actor_role_id` | 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin, 99=unknown, 100=system |

---

## 4. Tables that stay as-is

- **`configurations`** — keeps key-based string PK. It's a key/value store; the keys are stable strings like `LATE_THRESHOLD`. No change.
- **Code counter tables** (`leave_code_counters`, `payroll_code_counters`, `reg_code_counters`, `encashment_code_counters`) — keep year (or year+month) as PK. They're stateful sequence generators, not lookups.

---

## 5. Phased implementation

**No transitional dual-shape. Each phase commits cleanly; the API is broken between phases 2 and 5.**

| # | Phase | What | Touches | Status |
|---|---|---|---|---|
| **1** | Schema | Rewrite `apps/api/prisma/schema.prisma` to clean target. Drop local DB. Single fresh `init_clean_schema` migration. Verify migrate runs green. | 1 file (schema.prisma) + 1 new migration | ⏳ Planned |
| **2** | Seed | Rewrite `apps/api/prisma/seed.ts` to seed: master tables (with frozen IDs), 4 demo accounts (admin/manager/employee/payroll), default `Configuration` rows, 6 leave types, leave quotas, current-year holidays. Verify `pnpm db:seed` succeeds. | 1 file (seed.ts) | ⏳ Planned |
| **3** | Contracts | Rewrite every `packages/contracts/src/*.ts` schema. Remove all `z.enum(...)` for statuses; replace with `z.number().int()`. IDs become `z.number().int()`. Master FK columns become `z.number().int().nullable()` where appropriate. Export the canonical INT mapping constants. | ~15 contract files | ⏳ Planned |
| **4** | Backend | Rewrite `apps/api/src/modules/**/*.ts` and shared libs to use INT IDs everywhere, INT statuses in queries, master-table joins where the response needs the human name. Update audit-log helper to write INT `target_type_id` + `actor_role_id`. Update mailer / scheduler. | ~40 service + route files | ⏳ Planned |
| **5** | Frontend | Rewrite `apps/web/src/**/*.tsx`: URL params become `number`, status renders use a single `<StatusBadge>` driven by the per-entity INT maps, every form that posts an ID sends a number, TanStack Query cache keys use numbers. Drop the legacy string-status `StatusBadge`. | ~110 web files | ⏳ Planned |
| **6** | Export | `mysqldump` the local DB into `apps/api/prisma/schema_v2.sql`. Devops uses this to replace the staging DB. | 1 file | ⏳ Planned |
| **7** | QA | End-to-end smoke test: login (all 4 roles), apply leave, approve, run payroll, finalise, attendance check-in, regularisation, performance cycle create+self-rate+manager-rate, audit log render. | manual | ⏳ Planned |

**Estimated effort:**
- Phase 1+2: ~2-3 hours
- Phase 3: ~1 day
- Phase 4: ~2-3 days
- Phase 5: ~3-4 days
- Phase 6+7: ~half day

**Total: ~1 working week of focused engineering.**

---

## 6. What this plan deliberately does NOT include

- **No backwards-compat shim.** The old enum/string columns are gone after Phase 1. Code that hasn't been rewritten yet won't compile until its phase ships.
- **No dual-write helpers.** The previous attempt's `resolveMasterIds()` etc. helpers are scrapped. The new path is direct.
- **No URL redirects for old cuid IDs.** The deployed DB has no real data; URLs change shape (`/admin/employees/cmp0…` → `/admin/employees/42`).
- **No Prisma enum types in the schema.** All enum-shaped concepts become INT codes or master FKs.
- **No `audit_log.target_id` polymorphic column.** Replaced by `target_type_id INT` + `target_id INT` (referring to the target table's PK). The string-target legacy field is gone.
- **No tax-engine work**, no §10(10AA) exemption, no encashment improvements — orthogonal to this refactor.
- **No production cutover plan.** Devops takes the `.sql` from Phase 6 and replaces the staging DB.

---

## 7. Constraints (non-negotiable)

- All PKs are `INTEGER AUTO_INCREMENT`. No exceptions other than the four code-counter tables (year/year+month PKs) and `Configuration` (key string PK).
- No `FOREIGN KEY` constraints in any generated migration.
- All DB column names are `snake_case`.
- All Prisma field names stay `camelCase` so app code remains readable.
- No `@default(cuid())`, no `@id String`.
- No Prisma `enum` declarations.
- Status mapping integers in §3 are frozen — never re-number; only append.

---

## 8. Code-rewrite checklist (Phase 3 → 5)

This is the long tail. Tracked here so the team can see progress.

### Phase 3 — Contracts (15 files)

- [ ] `packages/contracts/src/common.ts` — drop `EmployeeStatusSchema`, `RoleSchema`, `EmploymentTypeSchema` enums; add `IdSchema = z.number().int()`.
- [ ] `packages/contracts/src/auth.ts` — login response uses INT IDs; remove role enum.
- [ ] `packages/contracts/src/employees.ts` — drop string statuses, switch to `statusId` / `roleId` / etc.
- [ ] `packages/contracts/src/leave.ts` — `LeaveStatusSchema` becomes INT code.
- [ ] `packages/contracts/src/leave-encashment.ts` — same.
- [ ] `packages/contracts/src/attendance.ts` — same.
- [ ] `packages/contracts/src/payroll.ts` — same for run + payslip.
- [ ] `packages/contracts/src/performance.ts` — cycle + goal.
- [ ] `packages/contracts/src/notifications.ts` — category.
- [ ] `packages/contracts/src/audit.ts` — target_type_id, actor_role_id, module_id.
- [ ] `packages/contracts/src/configuration.ts` — minor (key/value stays).
- [ ] `packages/contracts/src/errors.ts` — unchanged.
- [ ] `packages/contracts/src/index.ts` — export new mapping constants.

### Phase 4 — Backend (~40 files)

- [ ] `apps/api/src/modules/auth/auth.routes.ts` + `auth.service.ts`
- [ ] `apps/api/src/modules/employees/employees.routes.ts` + helpers
- [ ] `apps/api/src/modules/leave/leave.routes.ts` + `leave.service.ts`
- [ ] `apps/api/src/modules/leave/leave-encashment.routes.ts` + `.service.ts`
- [ ] `apps/api/src/modules/attendance/attendance.routes.ts` + `.service.ts` + `holidays.routes.ts` + `regularisations.routes.ts`
- [ ] `apps/api/src/modules/payroll/payroll.routes.ts` + `payrollEngine.ts`
- [ ] `apps/api/src/modules/performance/performance.routes.ts` + `.service.ts`
- [ ] `apps/api/src/modules/notifications/notifications.routes.ts`
- [ ] `apps/api/src/modules/audit/audit.routes.ts`
- [ ] `apps/api/src/modules/configuration/configuration.routes.ts`
- [ ] `apps/api/src/lib/audit.ts` (helper writes target_type_id, actor_role_id)
- [ ] `apps/api/src/lib/notifications.ts` (writes category_id)
- [ ] `apps/api/src/lib/scheduler.ts` (status_id in cron jobs)
- [ ] `apps/api/src/lib/statusInt.ts` (NEW — single source of INT constants)
- [ ] `apps/api/src/lib/openapi.ts` (response shape examples)
- [ ] `apps/api/src/middleware/requireRole.ts` (compares roleId)
- [ ] `apps/api/src/middleware/requireSession.ts` (employee fetch includes roleId)
- [ ] Tests under `__tests__/` updated to use INT IDs

### Phase 5 — Frontend (~110 files)

- [ ] `apps/web/src/lib/status/maps.ts` — per-entity status maps already designed; finalised
- [ ] `apps/web/src/components/ui/StatusBadge.tsx` — drop the legacy string variant; only INT-driven path remains
- [ ] Drop `apps/web/src/components/employees/EmployeeStatusBadge.tsx` (legacy wrapper) — uses StatusBadge directly with `entity="employee"`
- [ ] Every `useQuery` cache key with an ID becomes a number
- [ ] Every Next.js dynamic-route `[id]` param parsed as number
- [ ] Every form's hidden ID field is a number
- [ ] Every API client call uses number IDs in path strings
- [ ] Every `.status === 'Active'` comparison becomes `.statusId === 1` (or compared against the imported const)
- [ ] Every place that renders a role/dept/designation/gender name reads from the master FK (joined response field)
- [ ] Login flow / first-login token consumption — token still hashed string, IDs are int
- [ ] Sidebar nav config — no ID changes
- [ ] PDF generator (payslip) — uses INT IDs internally

---

## 9. Sign-off checklist (owner)

- [ ] Goals in §1 — approved
- [ ] Master tables in §2 (7 total including leave_types) — approved
- [ ] INT-code mappings in §3 (19 columns) — approved
- [ ] Tables that stay as-is in §4 — approved
- [ ] Phase order in §5 — approved
- [ ] What's NOT in scope per §6 — approved
- [ ] Constraints in §7 — approved
- [ ] **Owner says "go"** — Phase 1 begins immediately

---

## 10. Phase status (live tracker)

| Phase | Started | Completed | Commit | Notes |
|---|---|---|---|---|
| 1. Schema | 2026-05-12 | 2026-05-12 | (this branch) | ✅ Done — fresh DB created, 36 tables, 0 FK constraints, schema validated, single `init_clean_schema` migration |
| 2. Seed | 2026-05-12 | 2026-05-12 | (this branch) | ✅ Done — 14 configs, 4 roles, 4 employment_types, 4 genders, 9 audit_modules, 6 leave_types, 7 depts, 6 designations, 16 quotas, 7 holidays, 4 demo accounts (admin/mgr/emp/payroll) with salary + RM history + 16 leave balances |
| 3. Contracts | 2026-05-12 | 2026-05-12 | (this branch) | ✅ Done — all 11 domain files rewritten: IDs as `IdSchema` (positive Int), all status/role/type fields as INT codes, frozen ID constants exported (LeaveTypeId, LeaveEncashmentStatusId, AttendanceStatusId, RegStatusId, PayrollRunStatusId, CycleStatusId, GoalOutcomeId, NotificationCategoryId), master directory endpoints added (CreateDepartment, CreateDesignation, MasterListResponse). typecheck + build clean. |
| 4. Backend | — | — | — | ⏳ Next |
| 5. Frontend | — | — | — | ⏳ Planned |
| 6. .sql export | — | — | — | ⏳ Planned |
| 7. QA | — | — | — | ⏳ Planned |

(Updated as each phase ships.)
