# Nexora HRMS — API Reference (v1)

This document describes the REST API surface for Nexora HRMS, organised by module. Every endpoint maps back to a use case in the SRS (e.g. `A-12`, `E-03`) and the business rules it must enforce (e.g. `BL-017`, `BL-031`). Field names and shapes follow the data model in [SRS_HRMS_Nexora.md § 5](./SRS_HRMS_Nexora.md) and the process flows in [HRMS_Process_Flows.md](./HRMS_Process_Flows.md).

> **Spec status.** This is the v1 contract. Any future-phase additions (multi-tenant, OAuth, Indian tax engine) are explicitly noted; everything else is in scope for the first release.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Authentication & Sessions](#2-authentication--sessions)
3. [Domain Models](#3-domain-models)
4. [Endpoints — Auth](#4-endpoints--auth)
5. [Endpoints — Employees & Hierarchy](#5-endpoints--employees--hierarchy)
6. [Endpoints — Leave](#6-endpoints--leave)
7. [Endpoints — Attendance & Regularisation](#7-endpoints--attendance--regularisation)
8. [Endpoints — Payroll](#8-endpoints--payroll)
9. [Endpoints — Performance Cycles](#9-endpoints--performance-cycles)
10. [Endpoints — Notifications](#10-endpoints--notifications)
11. [Endpoints — Audit Log](#11-endpoints--audit-log)
12. [Endpoints — Configuration](#12-endpoints--configuration)
13. [Error Catalog](#13-error-catalog)
14. [Webhooks / Server-Side Jobs](#14-webhooks--server-side-jobs)

---

## 1. Conventions

| Aspect | Rule |
|---|---|
| Base URL | `/api/v1` |
| Transport | HTTPS only. HTTP is rejected at the edge. |
| Content type | `application/json; charset=utf-8` for both request and response, except `multipart/form-data` for uploads. |
| Identifiers | Follow the prefixed-code style from the SRS: `EMP-2026-0042`, `L-2026-0118`, `R-2026-0087`, `P-2026-04`, `RUN-2026-04`, `C-2026-H1`. Internally these are surrogate UUIDs; the prefixed code is the canonical reference for users. |
| Dates / times | ISO-8601 with timezone (`2026-05-09T10:35:00+05:30`). All server-side comparisons use the workspace timezone (default Asia/Kolkata). |
| Currency | All money values are in paise (integer) to avoid float drift. UI formats to `₹` with `Intl.NumberFormat('en-IN')`. Field name suffix `_paise` is used where ambiguous. |
| Pagination | Cursor-based: `?cursor=<opaque>&limit=50` (default `limit=20`, max `100`). Response includes `nextCursor` (null when exhausted). |
| Sorting | `?sort=field` ascending or `?sort=-field` descending. Multiple fields comma-separated. |
| Filtering | Query parameters — see each endpoint. Date ranges use `from` / `to` (inclusive). |
| Idempotency | Mutation endpoints accept an optional `Idempotency-Key` header. Duplicates within 24 h return the original response without re-applying the action. |
| Concurrency | All mutable resources expose `version` (integer, monotonic). Updates require the current `version`; mismatches return `409 Conflict` (see BL-034). |
| Errors | Standard envelope (see § 13). 4xx for client problems, 5xx for server. `429` carries `Retry-After`. |

### Standard response envelopes

**Success — single resource:**
```json
{ "data": { /* resource */ } }
```

**Success — collection:**
```json
{ "data": [ /* resources */ ], "nextCursor": "abc123" }
```

**Error:**
```json
{
  "error": {
    "code": "LEAVE_OVERLAP",
    "message": "An approved Annual Leave (L-2026-0118) already covers 28 May 2026.",
    "details": { "conflictId": "L-2026-0118", "date": "2026-05-28" },
    "ruleId": "BL-009"
  }
}
```

### Role abbreviations used below

| Code | Role |
|---|---|
| `E` | Employee (any signed-in user — every role is also an Employee, BL-004) |
| `M` | Reporting Manager of the resource owner |
| `MGR` | Any user whose role is Manager |
| `PO` | Payroll Officer |
| `A` | Admin |
| `SELF` | The owner of the resource (e.g. an employee accessing their own payslip) |

---

## 2. Authentication & Sessions

| Method | Mechanism |
|---|---|
| Login | Email + password. Session cookie `nx_session` (HttpOnly, Secure, SameSite=Lax). Lifetime 12 h sliding, 30 days if "Keep me signed in for 30 days" was ticked. |
| First login | Temp credentials emailed by Admin on creation force a password reset on first sign-in (UC-FL-01, see [§10.1 Process Flows](./HRMS_Process_Flows.md)). |
| Forgot password | Single-use token, 30 min expiry, email-delivered (UC-FL-02). Successful reset invalidates all active sessions for that user. |
| MFA | **Out of scope for v1.** The auth endpoints leave room for an `mfaChallenge` step. |
| Lockout | 5 wrong attempts → 15 min hard lockout. Counter resets on successful login. |
| Authorisation | Every protected endpoint inspects the session and applies role + ownership checks. Cross-tenant access is denied with `403`. |
| Audit | All auth actions (`login.success`, `login.failure`, `password.reset`, `lockout`) write to the audit log (BL-047). |

---

## 3. Domain Models

Field types use TypeScript-style notation. `?` = optional / nullable. Read-only fields are produced by the system and rejected on writes.

### 3.1 Employee

```ts
type EmployeeStatus = "Active" | "On-Notice" | "Exited" | "On-Leave" | "Inactive";
type Role = "Employee" | "Manager" | "PayrollOfficer" | "Admin";

interface Employee {
  id: string;                          // surrogate UUID
  code: string;                        // EMP-YYYY-NNNN — never reused (BL-008)
  name: string;
  email: string;                       // unique
  role: Role;                          // primary role; the Employee record always exists too (BL-004)
  status: EmployeeStatus;              // BL-006 transitions auto on leave start/end
  department: string;
  designation: string;
  reportingManagerId: string | null;   // null permitted; chain rolls up to Admin
  joinDate: string;                    // ISO date
  exitDate: string | null;
  salaryStructure: SalaryStructure;
  leaveBalances: LeaveBalances;
  createdAt: string;                   // read-only
  updatedAt: string;                   // read-only
  version: number;                     // optimistic concurrency token
}
```

### 3.2 Salary Structure

```ts
interface SalaryStructure {
  basic_paise: number;
  allowances_paise: number;            // sum of HRA + special + transport, etc.
  effectiveFrom: string;               // ISO date — applies from next run only (BL-030)
}
```

### 3.3 Leave Balances

```ts
interface LeaveBalances {
  annual: number;                      // days, integer (BL-011 — full days only)
  sick: number;
  casual: number;
  maternity: { eligible: boolean; remainingDays: number };  // event-based, no annual reset
  paternity: { eligible: boolean; remainingDays: number };
  carryForwardCap: number;             // applied at Jan 1 reset (BL-013)
}
```

### 3.4 Leave Request

```ts
type LeaveType = "Annual" | "Sick" | "Casual" | "Unpaid" | "Maternity" | "Paternity";
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled" | "Escalated";

interface LeaveRequest {
  id: string;
  code: string;                        // L-YYYY-NNNN
  employeeId: string;
  type: LeaveType;
  fromDate: string;                    // ISO date, inclusive
  toDate: string;                      // ISO date, inclusive
  days: number;                        // computed, full days only (BL-011)
  reason: string;
  status: LeaveStatus;
  approverId: string | null;           // current approver (manager OR admin OR escalated)
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  escalatedAt: string | null;          // BL-018 — set on 5-day timeout
  routedTo: "Manager" | "Admin";       // resolved at submit time per BL-015/016/017
  createdAt: string;
  version: number;
}
```

### 3.5 Attendance Record

```ts
type AttendanceStatus = "Present" | "Absent" | "On-Leave" | "Weekly-Off" | "Holiday";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;                        // ISO date, one row per employee per day (BL-024)
  status: AttendanceStatus;            // derived per BL-026
  checkInTime: string | null;          // ISO datetime
  checkOutTime: string | null;
  hoursWorked: number | null;          // computed: out − in (BL-025)
  late: boolean;                       // checkInTime > config.lateThreshold (BL-027)
  lateMonthCount: number;              // running count this calendar month
  lopApplied: boolean;                 // for Absent / unauthorised days
  source: "system" | "regularisation"; // system = original; regularisation = corrected
  regularisationId: string | null;     // links the correcting regularisation, if any
  createdAt: string;
  version: number;
}
```

### 3.6 Regularisation Request

```ts
type RegStatus = "Pending" | "Approved" | "Rejected";

interface RegularisationRequest {
  id: string;
  code: string;                        // R-YYYY-NNNN
  employeeId: string;
  date: string;                        // the day being corrected
  proposedCheckIn: string | null;
  proposedCheckOut: string | null;
  reason: string;
  status: RegStatus;
  routedTo: "Manager" | "Admin";       // age-based (BL-029): ≤7d → Manager else Admin
  ageDaysAtSubmit: number;             // captured snapshot
  approverId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  version: number;
}
```

### 3.7 Payroll Run

```ts
type RunStatus = "Draft" | "Review" | "Finalised" | "Reversed";

interface PayrollRun {
  id: string;
  code: string;                        // RUN-YYYY-MM
  month: number;                       // 1..12
  year: number;
  status: RunStatus;
  initiatedBy: string;                 // Admin or PO
  finalisedBy: string | null;
  finalisedAt: string | null;
  totalGross_paise: number;            // computed across all payslips
  totalNet_paise: number;
  payslipIds: string[];
  createdAt: string;
  version: number;
}
```

### 3.8 Payslip

```ts
type PayslipStatus = "Draft" | "Review" | "Finalised" | "Reversed";

interface Payslip {
  id: string;
  code: string;                        // P-YYYY-MM-NNNN
  runId: string;
  employeeId: string;
  month: number;
  year: number;
  status: PayslipStatus;
  workingDays: number;
  lopDays: number;
  gross_paise: number;                 // computed (BL-035 / BL-036)
  lopDeduction_paise: number;
  referenceTax_paise: number;          // suggested; manual override below (BL-036a)
  finalTax_paise: number;              // PO-entered, editable in Review (UC-014)
  netPay_paise: number;                // gross − lopDeduction − finalTax
  finalisedAt: string | null;
  reversalOfId: string | null;         // null on originals; set on reversal records (BL-032)
  createdAt: string;
  version: number;
}
```

### 3.9 Performance Cycle

```ts
type CycleStatus = "Open" | "Self-Review" | "Manager-Review" | "Closed";

interface PerformanceCycle {
  id: string;
  code: string;                        // C-YYYY-H1 or C-YYYY-H2
  fyStart: string;                     // ISO date
  fyEnd: string;
  status: CycleStatus;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  closedAt: string | null;
  createdBy: string;                   // Admin
  participants: number;                // active employees at cycle start (excludes mid-cycle joiners — BL-037)
  createdAt: string;
  version: number;
}
```

### 3.10 Performance Review

```ts
type GoalOutcome = "Met" | "Partial" | "Missed" | "Pending";

interface Goal {
  id: string;
  text: string;
  outcome: GoalOutcome;                // set by Manager (BL-038)
  proposedByEmployee: boolean;         // BL-038 — Employee may propose during self-review
}

interface Review {
  id: string;
  cycleId: string;
  employeeId: string;
  managerId: string;                   // captured at goal-setting; BL-042 — both retained on mgr change
  previousManagerId: string | null;
  goals: Goal[];                       // typically 3–5
  selfRating: number | null;           // 1..5 — editable until selfReviewDeadline (BL-039)
  selfNote: string | null;
  managerRating: number | null;        // 1..5
  managerNote: string | null;
  managerOverrodeSelf: boolean;        // BL-040 — surfaces "Mgr changed" tag
  finalRating: number | null;          // = managerRating once cycle is Closed (BL-041)
  lockedAt: string | null;
  createdAt: string;
  version: number;
}
```

### 3.11 Notification

```ts
type NotificationCategory =
  | "Leave" | "Attendance" | "Payroll" | "Performance" | "Status"
  | "Configuration" | "Auth" | "System";

interface Notification {
  id: string;
  recipientId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link: string | null;                 // deep link to source record
  unread: boolean;
  createdAt: string;                   // retained 90 days
}
```

### 3.12 Audit Log Entry

```ts
interface AuditLogEntry {
  id: string;                          // ULID, monotonic
  actorId: string;
  actorRole: Role;
  actorIp: string;
  action: string;                      // dotted: "leave.approve", "payroll.finalise"
  targetType: string;                  // e.g. "LeaveRequest"
  targetId: string;
  module: string;                      // "Leave" | "Attendance" | ...
  before: object | null;               // pre-image (null on create)
  after: object | null;                // post-image (null on delete)
  createdAt: string;                   // append-only — UPDATE/DELETE denied at DB level (BL-047)
}
```

### 3.13 Configuration

```ts
interface AttendanceConfig {
  lateThreshold: string;               // "HH:MM" — BL-027 (default "10:30")
  standardDailyHours: number;          // BL-025a (default 8) — display-only
  lateDeductionRule: { thresholdMarks: number; daysDeducted: number }; // fixed: {3, 1}
}

interface LeaveConfig {
  managerSlaWorkingDays: number;       // BL-018 (default 5)
  carryForwardCap: number;             // BL-013
}
```

---

## 4. Endpoints — Auth

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/auth/login` | Public | UC-AUTH-01 | Body: `{ email, password, rememberMe? }`. Sets `nx-session` cookie. Returns `{ user, role }`. 5-strikes lockout → `423 Locked`. |
| `POST` | `/auth/logout` | Any | — | Invalidates current session. |
| `POST` | `/auth/forgot-password` | Public | UC-FL-02 | Body: `{ email }`. **Always** returns `200` regardless of whether the account exists — prevents enumeration. Sends single-use token (30 min TTL). |
| `POST` | `/auth/reset-password` | Public | UC-FL-02 | Body: `{ token, newPassword }`. Validates token, hashes password, invalidates **all** sessions for that user. |
| `POST` | `/auth/first-login/set-password` | First-login user | UC-FL-01 | Body: `{ tempCredentialsToken, newPassword }`. Clears the `mustResetPassword` flag, redirects to role dashboard. |
| `GET` | `/auth/me` | Any | — | Returns the current `Employee` plus role, permissions snapshot, and feature flags. |

---

## 5. Endpoints — Employees & Hierarchy

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/employees` | A | A-04 / D-02 | Generates `code` (`EMP-YYYY-NNNN`), creates user, emails first-login link. Body validates uniqueness on `email`. |
| `GET` | `/employees` | A, MGR (scoped to team) | A-03 / M-02 | Filterable: `?status`, `?role`, `?department`, `?managerId`, `?q`. Cursor-paginated. |
| `GET` | `/employees/{id}` | A, MGR (own team), SELF | A-04, M-02, profile.html | — |
| `PATCH` | `/employees/{id}` | A | D-02 | Full profile + hierarchy edits. Salary edits route through `/employees/{id}/salary` instead. |
| `PATCH` | `/employees/{id}/salary` | A | D-04 | Body: new `SalaryStructure`. Applies from next payroll run only (BL-030). Past payslips immutable (BL-031). |
| `POST` | `/employees/{id}/status` | A | D-02 | Body: `{ status: "On-Notice" \| "Exited", effectiveDate }`. System-driven `On-Leave` ↔ `Active` transitions are not exposed here (BL-006). |
| `POST` | `/employees/{id}/reassign-manager` | A | D-14 | Body: `{ newManagerId, effectiveDate }`. Pending leave/regularisation requests stay with the previous manager (BL-022). |
| `GET` | `/employees/{id}/team` | MGR (own), A | M-02 | Direct + indirect reports tree, with current/past flag (BL-022a — past members surfaced separately). |
| `GET` | `/employees/{id}/profile` | SELF, A | profile.html | Read-only profile view for the user themselves. |

---

## 6. Endpoints — Leave

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/leave/requests` | E | E-03 | Body: `{ type, fromDate, toDate, reason }`. Server enforces BL-009 / BL-010 / balance / routing (BL-015/016/017). 409 with `LEAVE_OVERLAP` if conflict. |
| `GET` | `/leave/requests` | E, MGR, A | E-03, M-04, A-06 | Scoped: Employees see their own; Managers see their team's; Admin sees all. Filters: `?status`, `?type`, `?fromDate`, `?toDate`. |
| `GET` | `/leave/requests/{id}` | E (owner), MGR (in chain), A | — | — |
| `POST` | `/leave/requests/{id}/approve` | M (assigned), A | M-04, A-06 | Body: `{ note? }`. Deducts balance immediately (BL-021), except Maternity / Paternity (event-based). Status flips to `On-Leave` / `Active` per BL-006 on start/end. |
| `POST` | `/leave/requests/{id}/reject` | M (assigned), A | M-04, A-06 | Body: `{ note }`. Note is required. |
| `POST` | `/leave/requests/{id}/cancel` | E (owner if Pending), A | E-04 | Pending → cancellable by employee directly. Approved → only Admin can cancel; balance is restored. |
| `GET` | `/leave/balances/{employeeId}` | SELF, MGR (team), A | E-02, my-leave.html | Returns current `LeaveBalances`. |
| `POST` | `/leave/carry-forward/run` | System (cron) | BL-013 | Internal — Jan 1 job. Not exposed externally. |

> The 5-day SLA escalation (BL-018) is enforced by a server-side scheduler (§ 14), not a manual endpoint.

---

## 7. Endpoints — Attendance & Regularisation

### 7.1 Attendance

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/attendance/check-in` | E | E-06 | Body: `{}` — server stamps `now()`. Computes late-mark per BL-027 and triggers BL-028 deduction if 3rd of the month. Returns updated `AttendanceRecord`. |
| `POST` | `/attendance/check-out` | E | E-06 | Body: `{}` — server stamps `now()`. Computes `hoursWorked` (BL-025). |
| `GET` | `/attendance/me` | E (SELF) | E-05 | Filters: `?from`, `?to`, `?status`. Default range = current calendar month. |
| `GET` | `/attendance/team` | MGR | M-05 | Team scope. Filters: `?date`, `?from`, `?to`, `?status`, `?employeeId`. |
| `GET` | `/attendance` | A | A-09 | Org-wide. Same filters as team. |
| `POST` | `/attendance/midnight-job/run` | System (cron) | BL-024 | Internal — daily 00:00 row generation. Not exposed externally. |

### 7.2 Regularisation

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/regularisations` | E | E-07 | Body: `{ date, proposedCheckIn?, proposedCheckOut?, reason }`. Routes to Manager (≤7 d) or Admin (>7 d) per BL-029. 409 `LEAVE_REG_CONFLICT` if `date` already covered by approved leave. |
| `GET` | `/regularisations` | E (own), MGR, A | E-07, M-06, A-10 | Scoped. Filters: `?status`, `?employeeId`. |
| `POST` | `/regularisations/{id}/approve` | M (assigned), A | M-06, A-10 | Applies the proposed times to the underlying `AttendanceRecord`. **Original record is preserved** — a new corrected record is appended and linked via `regularisationId` (§ 11.3 of process flows). |
| `POST` | `/regularisations/{id}/reject` | M (assigned), A | M-06, A-10 | Body: `{ note }`. |

---

## 8. Endpoints — Payroll

### 8.1 Runs

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/payroll/runs` | A, PO | A-12 / P-03 | Body: `{ month, year }`. Creates Draft run and computes initial Gross / LOP / proration / reference tax for every Active employee. |
| `GET` | `/payroll/runs` | A, PO | A-12 | Filters: `?year`, `?status`. |
| `GET` | `/payroll/runs/{id}` | A, PO | A-12 / P-04 | Includes `payslipIds` for the run. |
| `POST` | `/payroll/runs/{id}/finalise` | A, PO | A-14 / P-05 | Two-step: client must POST with `{ confirm: "FINALISE" }`. Concurrent-finalise guard (BL-034) — server uses an advisory lock; second caller gets `409 RUN_ALREADY_FINALISED` with the winner's name + timestamp. |
| `POST` | `/payroll/runs/{id}/reverse` | A | A-15 | Admin-only (BL-033). Body: `{ reason }`. Creates a **new** reversal run + reversal payslips (BL-032); originals are never mutated. |

### 8.2 Payslips

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `GET` | `/payslips` | E (own), MGR (team), PO, A | E-08 / my-payslips.html | Filters: `?fyStart`, `?fyEnd`, `?employeeId`. |
| `GET` | `/payslips/{id}` | E (owner), PO, A, MGR (employee in their chain) | payslip.html | — |
| `PATCH` | `/payslips/{id}/tax` | PO | P-04 / UC-014 | Body: `{ finalTax_paise }`. Allowed only while parent run is `Review`. Recomputes `netPay_paise`. |
| `GET` | `/payslips/{id}/pdf` | E (owner), PO, A | E-08 | Streams the generated PDF. |

> Reversal records are exposed under `/payslips?reversalOfId=<id>` for audit traceability.

---

## 9. Endpoints — Performance Cycles

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `POST` | `/performance/cycles` | A | A-20 | Body: `{ fyStart, fyEnd, selfReviewDeadline, managerReviewDeadline }`. Creates cycle in `Open`. Mid-cycle joiners are excluded (BL-037). |
| `GET` | `/performance/cycles` | A, MGR, E (own active) | A-20, M-09 | — |
| `GET` | `/performance/cycles/{id}` | A, MGR, E (own active) | — | — |
| `POST` | `/performance/cycles/{id}/close` | A | A-20 | Two-step destructive confirm. Locks all final ratings (BL-041). |
| `GET` | `/performance/cycles/{id}/reports/distribution` | A | A-22 | Rating distribution report. |
| `GET` | `/performance/cycles/{id}/reports/missing` | A | A-23 | Employees / managers with missing reviews. |

### 9.1 Reviews (per employee per cycle)

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `GET` | `/performance/reviews` | A, MGR (team), E (own) | A-21, M-09, E-10 | Filters: `?cycleId`, `?employeeId`, `?managerId`. |
| `GET` | `/performance/reviews/{id}` | A, MGR, E (owner) | E-10 / E-11 | — |
| `POST` | `/performance/reviews/{id}/goals` | M (assigned), A | M-09 | Body: `{ text }`. Must be done while cycle is `Open`. Manager creates 3–5 goals. |
| `POST` | `/performance/reviews/{id}/goals/propose` | E (owner) | E-11 | Employee may propose extra goals during self-review window only (BL-038). Outcome remains Pending until Manager scores. |
| `PATCH` | `/performance/reviews/{id}/self-rating` | E (owner) | E-11 | Body: `{ selfRating, selfNote }`. Editable until `selfReviewDeadline` (BL-039). |
| `POST` | `/performance/reviews/{id}/manager-rating` | M (assigned), A | M-10 | Body: `{ managerRating, managerNote, goals: [{id, outcome}] }`. Sets `managerOverrodeSelf` if applicable (BL-040). |

---

## 10. Endpoints — Notifications

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `GET` | `/notifications` | Any | A-22 / M-09 / E-12 / P-06 | Returns the signed-in user's feed. Filters: `?category`, `?unread`, `?from`, `?to`. Cursor-paginated. |
| `POST` | `/notifications/mark-read` | Any | — | Body: `{ ids: string[] }` or `{ all: true }`. |
| `GET` | `/notifications/unread-count` | Any | header bell | Returns `{ count }`. |

> Notifications are **system-generated only** — there is no public POST. All triggers are listed in [Process Flows § 9.1](./HRMS_Process_Flows.md). 90-day retention.

---

## 11. Endpoints — Audit Log

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `GET` | `/audit-log` | A | A-26 | Filters: `?actorId`, `?action`, `?module`, `?targetType`, `?targetId`, `?from`, `?to`. Cursor-paginated. |
| `GET` | `/audit-log/{id}` | A | A-26 | Single entry with `before` / `after` snapshots. |

> No `POST`, `PATCH`, or `DELETE` endpoints exist. Entries are append-only — even Admin cannot edit or delete (BL-047). The DB enforces this with a constraint that denies `UPDATE` and `DELETE` on the `audit_log` table.

---

## 12. Endpoints — Configuration

| Method | Path | Roles | Use case | Notes |
|---|---|---|---|---|
| `GET` | `/config/attendance` | A | A-19 | Returns `AttendanceConfig`. |
| `PATCH` | `/config/attendance` | A | A-19 | Body: `Partial<AttendanceConfig>`. Editing `lateThreshold` writes audit entry. `standardDailyHours` is display-only (BL-025a) but persisted server-side so all clients agree. |
| `GET` | `/config/leave` | A | A-19 | Returns `LeaveConfig`. |
| `PATCH` | `/config/leave` | A | A-19 | — |
| `GET` | `/config/holidays` | Any | A-19 | Public read — used by attendance derivation. |
| `PUT` | `/config/holidays` | A | A-19 | Body: `Holiday[]`. Replaces the calendar for a given year. |

---

## 13. Error Catalog

Errors return `{ error: { code, message, details?, ruleId? } }` with the appropriate HTTP status.

| HTTP | `code` | When | Rule ref |
|---|---|---|---|
| `400` | `VALIDATION_FAILED` | Generic schema / type errors. | — |
| `400` | `INVALID_DATE_RANGE` | `from > to` or non-business-day where required. | — |
| `401` | `UNAUTHENTICATED` | No session or expired session. | — |
| `403` | `FORBIDDEN` | Role check failed. | — |
| `403` | `NOT_OWNER` | Resource ownership check failed (e.g. employee accessing another's payslip). | — |
| `404` | `NOT_FOUND` | Resource does not exist or is outside the caller's scope. | — |
| `409` | `LEAVE_OVERLAP` | Submitted leave overlaps an existing approved leave. | BL-009 |
| `409` | `LEAVE_REG_CONFLICT` | Leave overlaps an approved regularisation, or vice versa. Carries `details.conflictId`. | BL-010 |
| `409` | `INSUFFICIENT_BALANCE` | Leave balance below requested days (excl. Maternity / Paternity). | BL-014 |
| `409` | `RUN_ALREADY_FINALISED` | Concurrent finalise — second caller loses. Carries `winnerName` and `winnerAt`. | BL-034 |
| `409` | `VERSION_MISMATCH` | Optimistic concurrency: caller's `version` is stale. | — |
| `409` | `CYCLE_CLOSED` | Attempt to mutate goals / ratings on a Closed cycle. | BL-041 |
| `409` | `PAYSLIP_IMMUTABLE` | Attempt to edit a Finalised payslip. | BL-031 |
| `409` | `CIRCULAR_REPORTING` | `POST /employees/{id}/reassign-manager` would create a cycle (the target manager is in the employee's own subtree). | BL-005 |
| `423` | `LOCKED` | Account temporarily locked (5 wrong logins). Carries `Retry-After`. | — |
| `429` | `RATE_LIMITED` | Throttled. Carries `Retry-After`. | — |
| `500` | `INTERNAL_ERROR` | Anything unhandled. Always logged. | — |

---

## 14. Webhooks / Server-Side Jobs

These are not callable from the API but are part of the contract because they drive observable state changes.

| Job | Schedule | Effect | Rule ref |
|---|---|---|---|
| `attendance.midnight-generate` | Daily 00:00 (workspace tz) | Creates one `AttendanceRecord` per Active employee with status = Absent. | BL-024 |
| `leave.escalation-sweep` | Hourly | Finds Pending leave requests older than 5 working days and flips them to Escalated, notifying Admin. | BL-018 |
| `leave.carry-forward` | Annually, Jan 1 00:00 | Caps each Annual balance at `carryForwardCap`, notifies each Employee. | BL-013 |
| `attendance.late-mark-warn` | On every check-in that triggers a 2nd late mark in the calendar month | Sends warning notification to Employee. | BL-028 (warning band) |
| `notifications.archive-90d` | Daily | Archives notifications older than 90 days (read or unread). | — |
| `audit-log.indexer` | Continuous | Maintains the searchable index used by A-26. | BL-048 |

---

## Appendix — Endpoint count by module

| Module | Endpoints |
|---|---|
| Auth | 6 |
| Employees & Hierarchy | 8 |
| Leave | 8 |
| Attendance & Regularisation | 10 |
| Payroll | 9 |
| Performance | 11 |
| Notifications | 3 |
| Audit Log | 2 |
| Configuration | 6 |
| **Total** | **63** |

---

> Cross-reference: every endpoint listed above maps back to a use case in the [SRS](./SRS_HRMS_Nexora.md) and a flow in the [Process Flows](./HRMS_Process_Flows.md). Whenever a new BL rule is added, this document and the audit-log coverage table (§ 11.2 of Process Flows) must be reviewed together.
