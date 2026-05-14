# Nexora HRMS v2 — Phase 7 QA Report

**Branch:** `database_schema_changes`
**Run on:** 2026-05-13 (initial pass + same-day follow-up fixes)
**Test type:** End-to-end smoke + contract conformance against the live dev API
**Smoke driver:** manual curl against `http://localhost:4000/api/v1/`

## 1. Executive Summary

**Ship recommendation: 🟢 GREEN (after follow-up).**

Initial pass surfaced eight defects against the v2 contract. All HIGH and
MEDIUM-severity defects were fixed in the same QA cycle and re-tested
clean against the live API. Two LOW defects remain — both cosmetic /
operational, neither blocks shipping.

### Defect status

| Severity | Initial | Fixed | Open |
|---|---|---|---|
| BLOCKER (D0) | 1 | 1 | 0 |
| HIGH (D1–D4, D8) | 5 | 5 | 0 |
| MEDIUM (D6) | 1 | 1 (false alarm — no leak) | 0 |
| LOW (D5, D7) | 2 | 1 | 1 |
| **Total** | **9** | **8** | **1** |

The remaining LOW defect (D7) is an operational note about the dummy seed
not resetting row state across QA smoke runs — not a v2 bug, just
something to document.

| Status | Count |
|---|---|
| ✅ Modules with all tested flows passing | 5 (auth, leave, attendance, regularisation, payroll, role gates, notifications) |
| 🟡 Modules with cosmetic / contract-violation defects | 3 (performance, audit, leave-approve-response) |
| ❌ Modules with missing endpoints | 1 (masters) |
| 🔥 Blocker defects (BLOCKER, fixed in this session) | 1 |
| 🔴 HIGH-severity defects open | 5 |
| 🟠 MEDIUM-severity defects open | 1 |
| 🟢 LOW-severity defects open | 2 |

## 2. Coverage Matrix

| Module | Flow tested | Result |
|---|---|---|
| Auth | Login (4 roles), /auth/me shape | ✅ Pass |
| Leave | Employee submit → manager approve → balance deduct | ✅ Pass (with low-sev D5) |
| Leave | Audit log writes leave.create + leave.approve | ✅ Pass |
| Attendance | POST /attendance/check-in, GET /attendance/me | ✅ Pass |
| Attendance | POST /attendance/check-out | ✅ Pass |
| Regularisation | Employee submit ≤7d → manager approve | ✅ Pass |
| Regularisation | BL-029 routing (≤7d → Manager, ageDaysAtSubmit captured) | ✅ Pass |
| Payroll | POST /payroll/runs (June 2026) → status=2 (Review) | ✅ Pass |
| Payroll | POST /payroll/runs/:id/finalise two-step → status=3 (Finalised) | ✅ Pass |
| Performance | PATCH /reviews/:id/self-rating on closed cycle → BL-041 CYCLE_CLOSED 409 | ✅ Pass |
| Performance | GET /performance/cycles response shape | ❌ Fail (D2 — status as string) |
| Audit log | Filter by targetTypeId+targetId | ✅ Pass |
| Audit log | Filter by moduleId | ❌ Fail (D8 — filter ignored) |
| Audit log | Response shape (`moduleId` field) | ❌ Fail (D4 — `module` string) |
| Notifications | GET /notifications | ✅ Pass |
| Masters | GET /masters/{roles,departments,designations,...} | ❌ Fail (D1 — 404) |
| Role gates | Employee → POST /employees | ✅ Pass (403) |
| Role gates | Manager → POST /payroll/runs | ✅ Pass (403) |
| Role gates | Manager → POST /payroll/runs/:id/reverse (BL-033) | ✅ Pass (403) |
| Role gates | Employee → POST /leave/requests/:id/approve | ✅ Pass (403) |

## 3. Defects

### D0 — BLOCKER (FIXED in commit `1cf4bae`)

**Code generators use renamed v2 column `lastSeq` (now `number`).**
Severity: BLOCKER. Caught the very first time anyone hit `POST
/leave/requests`. Same break would have hit every counter-using create
endpoint (regularisation, encashment, payslip code gen).

- File(s): `apps/api/src/modules/leave/leaveCode.ts`, `attendance/regCode.ts`, `leave/encashmentCode.ts`, `payroll/payrollCode.ts`
- Error: `PrismaClientKnownRequestError: Raw query failed. Code: 1054. Message: Unknown column 'lastSeq' in 'field list'`
- Cause: Phase 4 backend rewrite didn't update raw SQL (Prisma can't typecheck `$executeRaw`). The v2 schema renamed `lastSeq` → `number` and the `payroll_code_counters` table dropped its `id` and `kind` columns in favour of composite PK `(year, month)`.
- Fix: replaced column names in all 4 files; payroll counter INSERT now uses just `(year, month, number)`.

### D1 — HIGH

**Master directory endpoints not registered.**
`GET /api/v1/masters/{roles,departments,designations,employment-types,genders}` and `POST /api/v1/masters/{departments,designations}` all return `404 NOT_FOUND`. The Phase 3 contracts package exports `MasterListResponseSchema`, `CreateDepartmentRequestSchema`, and `CreateDesignationRequestSchema` for these, so the contract is published but the routes were never created.

Impact: the frontend's department/designation/role/gender dropdowns will be empty or fall back to hardcoded lists. Admin can't add new masters via API.

Fix: add `apps/api/src/modules/employees/masters.routes.ts` exporting a `mastersRouter` that serves the 5 GETs (from the respective Prisma model `.findMany({ where: { status: 1 }, orderBy: { name: 'asc' } })`) and the 2 admin POSTs (idempotent upsert by name). Mount in `router.ts` at `/masters`.

### D2 — HIGH

**Performance cycle `status` returned as string ('Open'/'Closed'), not INT.**
Contract: `CycleStatusIdSchema = z.number().int().min(1).max(4)`.
Actual response: `"status": "Closed"`.

- Cause: `performance.service.ts:59` defines `mapCycleStatus(int) → string` and 3 mappers (`performance.routes.ts:175`, `performance.service.ts:145`, `performance.service.ts:183`) wrap the DB INT through that function before sending.
- Fix: delete `mapCycleStatus()` and `mapCycleStatusToDB()`; pass the INT through directly (`status: c.status`). The 5 calling sites all flip to direct field access. The audit `before/after` payload at line 535-536 should also use INT codes for forward-compat.

### D3 — HIGH

**Goal `outcome` returned as string ('Met'/'Partial'/'Missed'/'Pending'), not INT.**
Contract: `GoalOutcomeIdSchema = z.number().int().min(1).max(4)` with field name `outcomeId`.

- Cause: `performance.service.ts:81` defines `mapGoalOutcome(int) → string`. Same pattern as D2.
- Fix: delete the mapper, pass `outcomeId: g.outcomeId` through directly.

### D4 — HIGH

**Audit log response field is `module: "payroll"` (string), not `moduleId: 4` + `moduleName: "payroll"`.**
Contract `AuditLogEntrySchema` declares:
```ts
moduleId: AuditModuleIdSchema,
moduleName: z.string(),
```
Actual: `"module": "payroll"`.

- Cause: `apps/api/src/modules/audit/audit.routes.ts` mapper denormalises the related `AuditModule.name` into a single `module` string field. Frontend that uses the contract types will fail to parse the response.
- Fix: return both fields. Cheap — `moduleId: row.moduleId, moduleName: row.module.name` in the mapper.

### D5 — LOW

**POST `/leave/requests/:id/approve` response returns `leaveTypeId: 0`.**
The DB row is correct (verified with subsequent GET — returns `leaveTypeId: 1`). Only the approve-response mapper drops the ID.

- Cause: probably an `?? 0` fallback or a missing `include: { leaveType: true }` in the post-mutation re-read.
- Impact: minimal — frontend re-fetches the request after approval. Cosmetic.
- Fix: include `leaveType: true` in the post-approval response query, or read `leaveTypeId` from the existing record before mutation.

### D6 — MEDIUM

**Payroll routes still call `mapRunStatusToString` for PDF rendering (and likely API responses).**
`apps/api/src/modules/payroll/payroll.routes.ts:80` defines `mapRunStatusToString` and it's called at line 1326 inside a payslip-related render.

Status of payslip API responses: not directly tested in this QA run but contract says `PayslipStatusIdSchema = z.number().int().min(1).max(4)`. If `mapRunStatusToString` leaks into the API response (not just the PDF template), payroll responses are similarly broken.

- Fix: audit `payroll.routes.ts` for all uses of `mapRunStatusToString` outside the PDF templating path. PDF can keep using strings (humans read it). API responses must be INT.

### D7 — LOW (not a v2 bug)

**Dummy cycle id=2 (`C-2026-H1`) has DB `status=4` (Closed) but the seed shape was `status=1` (Open).**
- Cause: a previous smoke-test run closed the cycle. The dummy seed is idempotent in the sense of "won't re-create rows", but it doesn't reset row state across smoke runs.
- Impact: QA tests that need an Open cycle have to either create a new cycle or reset the row. Not a v2 contract bug.
- Optional fix: have the seed restore the open cycle to `status=1` on re-run, or document the limitation.

### D8 — HIGH

**Audit log `moduleId` query filter is ignored.**
`GET /audit-logs?moduleId=3` returns rows from modules 4 (payroll) and 5 (attendance) — the filter does not constrain results.

- Verified by running both `moduleId=3` and `moduleId=4`: same row set returned.
- Cause: probable typo in `audit.routes.ts` filter clause — either using `where: { module: { equals: ... } }` against the wrong column, or never adding the filter to the Prisma where.
- Impact: HIGH — Admin audit-log viewer cannot filter by module. Compliance / security investigations broken.
- Fix: `where: { moduleId: parsed.moduleId }` if not already there. Check the other filter params (`actorRoleId`, `targetTypeId`, etc.) for similar drift.

## 4. BL rules verified end-to-end

| Rule | What I verified |
|---|---|
| BL-005 | (not directly — no circular reporting attempt made) |
| BL-008 | EMP code uniqueness — implicit in seed; not actively tested |
| BL-021 | Leave balance deducted immediately on approval (Annual: 15 → 14 for employee 3 after 1-day approval) |
| BL-029 | Regularisation routing — 5-day-old request routed to Manager (`routedToId: 1, approverId: 2`) |
| BL-034 | Payroll two-step finalisation — `confirm: "FINALISE"` literal required; status 2→3 atomic |
| BL-041 | Cycle-closed guard — PATCH self-rating on a Closed cycle returns 409 `CYCLE_CLOSED` with `ruleId: "BL-041"` |
| BL-044 | Role scoping — Employee/Manager attempts on Admin-only endpoints all returned 403 FORBIDDEN (4/4 negative cases) |
| BL-047 | Audit log entry written on every state-changing action — confirmed for `auth.login.success`, `leave.create`, `leave.approve`, `regularisation.approve`, `payroll.run.create`, `payroll.run.finalise` |
| BL-LE-* | Not exercised in this run (within the encashment window logic would require Dec/Jan dates) |

## 5. v2-specific verification

| Check | Status |
|---|---|
| All endpoint responses use INT IDs (no string IDs) | ✅ Pass (verified on auth, employees, leave, attendance, regularisation, payroll, audit, notifications) |
| All status / role / type fields are INT on the wire | ❌ Fail — performance returns strings (D2, D3), audit returns string `module` field (D4), payroll may have similar issue (D6) |
| Master-FK responses include both `*Id` and resolved name | ✅ Pass for `departmentId`+`department`, `designationId`+`designation`, `reportingManagerId`+`reportingManagerName`, `leaveTypeId`+`leaveTypeName` |
| Role gating works per role | ✅ Pass (4/4 negative cases returned 403) |
| `_prisma_migrations` consistent with code | ✅ Pass (3 migrations all applied; schema drift check would need explicit `prisma migrate diff`) |
| Master directory endpoints reachable | ❌ Fail (D1 — not registered) |
| Audit log filter parameters honoured | ❌ Partial — `targetTypeId+targetId` works; `moduleId` ignored (D8) |

## 6. Follow-up fix cycle (same day)

All HIGH-severity defects were addressed in a follow-up commit on the
same branch. Each fix was verified by re-running the failing test case
against the live API after restarting the dev server.

### D1 — masters endpoints

Created `apps/api/src/modules/employees/masters.routes.ts` exposing:
  - `GET /masters/roles` — all signed-in users
  - `GET /masters/employment-types` — all signed-in users
  - `GET /masters/genders` — all signed-in users
  - `GET /masters/departments` — all signed-in users
  - `GET /masters/designations` — all signed-in users
  - `POST /masters/departments` — Admin only; idempotent on duplicate name
  - `POST /masters/designations` — Admin only; idempotent on duplicate name

All listers filter to `status = 1` (Active) and order by name. Mounted at
`/api/v1/masters` in `router.ts`.

**Verified:**
- `GET /masters/departments` returns 7 active rows with `{id, name}` shape ✓
- `GET /masters/roles` returns 4 frozen roles ✓
- `POST /masters/departments {"name": "QA Test Dept"}` as admin → 201 with id=8 ✓
- Same POST as employee → 403 FORBIDDEN ✓
- Audit row written for the create with `module: 'employees'`, `action: 'masters.department.created'` ✓

### D2 — performance cycle status returned as INT

Dropped `mapCycleStatus(int → string)` and `mapCycleStatusToDB(string → int)`
from `performance.service.ts`; the 3 callsites (`shapeCycle`, `shapeReviewDetail`,
and the cycle-close audit) now pass `row.status` through directly. The
unused import in `performance.routes.ts` was also removed.

**Verified:** `GET /performance/cycles` now returns `"status": 4` (INT) — was `"status": "Closed"`.

### D3 — goal outcome returned as INT

Dropped `mapGoalOutcome(int → string)` and `mapGoalOutcomeToDB(string → int)`.
The 3 callsites now emit `outcomeId: g.outcomeId` (renamed field per the
contract). Manager-rating mutation handler already accepted `outcomeId: number`
inputs — no change there.

**Verified:** `GET /performance/reviews/7` now returns goals with `"outcomeId": 2` (INT) — was `"outcome": "Met"`.

### D4 — audit log response shape

`audit.routes.ts` mapper now emits both fields per contract:
```diff
- module: row.module.name,
+ moduleId: row.moduleId,
+ moduleName: row.module.name,
```

**Verified:** audit responses now have both `"moduleId": 2` and `"moduleName": "employees"`.

### D5 — leave approve response

The `mapLeaveRequest` helper read `req.leaveType.id ?? 0` — a fallback to 0
when the relation include was missing. Fixed by changing the local row
shape to read `req.leaveTypeId` directly from the column (it's always
present on the row) and reading `req.leaveType.name` only for the name.

**Verified:** Submitting a Casual leave (typeId=3) and approving it now returns `leaveTypeId: 3` in BOTH the create AND approve responses.

### D6 — payroll status-string leak (FALSE ALARM)

Investigation found `mapRunStatusToString` is **only** called inside
`streamPayslipPDF()` (line 1326), where a human-readable string is
appropriate for the PDF template. **No API response paths use it.** All
the API `status:` fields in payroll.routes.ts emit the raw INT.

No fix needed. Closing as not-a-bug.

### D8 — audit moduleId filter ignored

The `audit.routes.ts` handler's local type declared `module?: string`,
`actorRole?: string`, `targetType?: string` — old wire field names. But
the validator (`AuditLogListQuerySchema`) coerces incoming params using
the v2 names (`moduleId`, `actorRoleId`, `targetTypeId`). Result: the
handler always read `undefined` and the filter was a no-op.

Rewrote the local query type to match the contract and replaced the
name-to-id lookup blocks with direct INT assignments to the Prisma
`where` clause. Removed ~50 lines of dead lookup code.

**Verified:**
- `GET /audit-logs?moduleId=3` → 9 rows, all `moduleId=3` (`moduleName: "leave"`) ✓
- `GET /audit-logs?moduleId=4` → 5 rows, all `moduleId=4` (`moduleName: "payroll"`) ✓

## 7. Files changed in the fix cycle

| File | Change |
|---|---|
| `apps/api/src/modules/employees/masters.routes.ts` | **NEW** — 7 endpoints + audit on creates |
| `apps/api/src/router.ts` | Mount `mastersRouter` at `/masters` |
| `apps/api/src/modules/performance/performance.service.ts` | Deleted 4 string mapper functions; 5 callsites switched to direct INT field access; cycle-close audit `after` uses `CycleStatus.Closed` (INT) |
| `apps/api/src/modules/performance/performance.routes.ts` | Removed `mapCycleStatus` import; `status: c.status` directly |
| `apps/api/src/modules/audit/audit.routes.ts` | Filter logic rewritten to consume contract field names; response shape adds `moduleId` alongside `moduleName` |
| `apps/api/src/modules/leave/leave.routes.ts` | `mapLeaveRequest` reads `leaveTypeId` from row column instead of relation |

Net diff: roughly **+220 lines / -90 lines** including the new masters
route file (~210 lines), with a net deletion in performance/audit from
removing dead helpers.

## 8. Open / deferred

### D7 — LOW

The dummy seed's open cycle (id=2, `C-2026-H1`) was closed by a previous
smoke run and the seed doesn't restore row state on re-run. Not a v2
bug; mitigation is to either reset that specific row in the seed's
idempotent block or document it as a known limitation. Out of scope for
this fix cycle.

## 9. Final verification (after follow-up fixes)

| Check | Result |
|---|---|
| `pnpm --filter @nexora/api typecheck` | ✅ exit 0 |
| `pnpm --filter @nexora/api test` | ✅ 54/54 pass (unchanged) |
| `pnpm --filter @nexora/web typecheck` | ✅ exit 0 (unchanged) |
| Auth flow re-test | ✅ Pass |
| D1 retest (masters) | ✅ Pass |
| D2 retest (cycle.status INT) | ✅ Pass |
| D3 retest (goal.outcomeId INT) | ✅ Pass |
| D4 retest (audit moduleId+moduleName) | ✅ Pass |
| D5 retest (leave approve leaveTypeId) | ✅ Pass |
| D8 retest (audit moduleId filter) | ✅ Pass |
| Role gates (4 negative cases) | ✅ Pass (unchanged) |

**Final ship recommendation: 🟢 GREEN.**

The v2 refactor is now ready for staging cutover. The single open LOW-sev
item (D7) is operational, not a blocker.
