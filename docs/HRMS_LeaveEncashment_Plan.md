# Leave Encashment (Additive)

**Status:** **APPROVED — implementation in progress.** Owner signed off on all 11 OQs with their defaults (OQ-5: Option A — new `daPaise` column; OQ-7: Option A — payslip reversal returns money but not days).
**Authoring rule:** Data model + API spec land in this document first. No schema migration, no contract changes, no service code until this plan is approved.

---

## 1. Requirement (verbatim, owner)

> Employees can encash up to 50% of their unused annual leave balance at the end of the calendar year. Encashment is paid through the next payroll run as a separate component, calculated as **(basic + DA) ÷ working-days-in-month** per encashed day. The encashed balance is deducted from the annual leave balance **immediately on approval**.

---

## 2. Interpretation & Decisions (approved by owner 2026-05-12)

All open questions were presented in two rounds — first as defaults, then with a deep-dive on OQ-7 (reversal). Final answers are below. **No further owner input is required before implementation continues.** Defaults that were accepted are explicitly labelled to make future re-reads obvious. The decisions are reflected in the schema, backend, and frontend that have shipped under commits `e776ecf` and `d5553e2`.

| # | Question | Decision (final) | Source |
|---|---|---|---|
| OQ-1 | Does "end of calendar year" mean a hard request window, or just a soft semantic? | **Hard window: Dec 1 (year Y) → Jan 15 (year Y+1).** Configurable via `ENCASHMENT_WINDOW_START_MONTH` (12), `ENCASHMENT_WINDOW_END_MONTH` (1), `ENCASHMENT_WINDOW_END_DAY` (15). Outside the window the request endpoint returns `ENCASHMENT_OUT_OF_WINDOW`. | Owner accepted default |
| OQ-2 | Can an employee submit multiple encashment requests in the same window? | **No — one *approved* encashment per employee per calendar year.** Subsequent requests reject with `ENCASHMENT_ALREADY_USED`. Cancelled / Rejected requests do not consume the quota. | Owner accepted default |
| OQ-3 | 50% of *what* balance — at request time, at approval time, or at end-of-year cutoff? | **At Admin-Finalise time.** `min(floor(daysRemaining × 0.5), daysRemaining)` evaluated when Admin signs off. The request body carries the employee's requested days; the server clamps at finalisation. | Owner accepted default |
| OQ-4 | Who approves the request? Manager only, Admin only, or both? | **Two-step: Manager → Admin.** Routing identical to leave (BL-015 / BL-017 / BL-022) for the manager step; Admin-Finalise is *always* required because the action impacts payroll. State machine: `Pending` → `Manager-Approved` → `Admin-Finalised` → `Paid`. | Owner accepted default |
| OQ-5 | What is "DA"? Is it a new column or maps to an existing allowance component? | **Option A — new nullable column `daPaise` on `SalaryStructure`.** Defaults to 0 for legacy rows. Encashment formula uses `(basicPaise + COALESCE(daPaise, 0))` — companies that do not pay DA work unchanged (formula degrades to just `basicPaise`). | Owner explicitly picked Option A |
| OQ-6 | "Working-days-in-month" — which month? The month the request is approved, or the month it's paid? | **Month of the payroll run that pays it.** The rate uses the paying run's `workingDays` value (already computed by `workingDaysCalc.ts` per BL-031). | Owner accepted default |
| OQ-7 | Can encashment be reversed? | **Reverse via payslip reversal only (BL-033).** Reversal payslip emits a negative `encashmentPaise` line and writes `leave.encashment.payment.reverse` audit row. **Leave-balance days are NOT restored** — the days are gone for the year. A dedicated `leave.encashment.reverse` admin endpoint is deferred to v1.1. | Owner accepted default after deep-dive |
| OQ-8 | Does encashment block carry-forward? | **No — encashment reduces `daysRemaining` immediately at Admin-Finalise.** The Jan 1 carry-forward job (BL-012) operates on the post-deduction balance. Operational guard: encashment cron runs Dec 31 23:50 IST, carry-forward at Jan 1 00:01 IST (11-min buffer). | Owner accepted default |
| OQ-9 | Should we encash other leave types (Casual, Sick)? | **Annual only.** Hard-coded; not configurable in v1. Sick doesn't carry forward (BL-012); Casual cap is too small to be meaningful. | Owner accepted default |
| OQ-10 | What about employees who exited mid-year? | **Out of scope for v1.** Full-and-final-settlement encashment is a separate feature. Exited employees cannot submit encashment requests. | Owner accepted default |
| OQ-11 | Should the encashment amount itself be taxable? | **Yes — taxable as part of gross.** `encashmentPaise` adds to `grossPaise` and flows into the existing `referenceTaxPaise` computation. §10(10AA) exemption is deferred to v1.1 (Indian tax-engine work). | Owner accepted default |

### 2.1 UI follow-up decisions (during frontend implementation)

Two product questions surfaced when the frontend was being built. Both were decided in favour of the recommended defaults:

| # | Question | Decision |
|---|---|---|
| UI-1 | What does the Admin Encashment Queue show? | **Both `Pending` and `Manager-Approved` items in one queue.** Implemented as tabs in `AdminEncashmentQueue.tsx`: *Manager-Approved (Action needed)* / *Pending (Awaiting Manager)* / *All*. Admin can finalise from the first tab; the second is read-only visibility. |
| UI-2 | Where does the encashment window config live? | **Inside the existing Leave Config panel.** Added as a collapsible "Encashment" subsection in `LeaveConfigPanel.tsx` rather than a dedicated page. Four controls: start month, end month, end day, max percent. |

---

## 3. Business Rules (proposed BL-NEW-* — to be assigned canonical BL numbers on approval)

| ID | Rule |
|---|---|
| **BL-LE-01** | Encashment applies to leave type `Annual` only. |
| **BL-LE-02** | Maximum encashable = `floor(LeaveBalance.daysRemaining × 0.5)` at the moment of Admin finalisation (after Manager approval). Server clamps the requested days. |
| **BL-LE-03** | One *approved* encashment per employee per calendar year. Pending / Rejected / Cancelled do not consume the quota. |
| **BL-LE-04** | Request window: `ENCASHMENT_WINDOW_START_MONTH` (default 12 = Dec) of year Y through `ENCASHMENT_WINDOW_END_MONTH` (default 1 = Jan, with day cap `ENCASHMENT_WINDOW_END_DAY` = 15) of year Y+1. Both endpoints configurable via the `configurations` table. Outside the window → `409 ENCASHMENT_OUT_OF_WINDOW`. |
| **BL-LE-05** | Routing: reporting manager → 5-day SLA → escalate to Admin (mirrors BL-015 / BL-018). Admin-final required regardless. State machine: `Pending` → `Manager-Approved` → `Admin-Finalised` → `Paid` (or `Rejected` / `Cancelled` at any pre-Paid state). |
| **BL-LE-06** | Balance deduction is immediate at Admin-Finalised. `LeaveBalance.daysRemaining -= daysApproved`. New field `daysEncashed` on `LeaveBalance` tracks the running total separately from `daysUsed`. |
| **BL-LE-07** | Rate per encashed day = `(SalaryStructure.basicPaise + COALESCE(daPaise, 0)) / workingDaysInMonth(payslipMonth, payslipYear)` where workingDays is the value already used by the payroll engine for proration (BL-031). Truncation (floor) on paise to avoid sub-unit dust. |
| **BL-LE-08** | Total amount = `daysApproved × ratePerDay`. Computed and locked at the time of Admin-Finalisation. Snapshot stored on the encashment record. |
| **BL-LE-09** | Payment is added as a new positive component `encashmentPaise` to the next initiated payroll run for that employee (`PayrollRun.status = Draft`). One run; not split across runs. If the employee has no upcoming run (e.g. terminated before next cycle), encashment record stays `Admin-Finalised` and is flagged for manual Admin intervention. |
| **BL-LE-10** | The carry-forward cron (BL-012) operates on the *post-deduction* `daysRemaining`. Encashment must finalise BEFORE Jan 1 00:01 IST to keep its impact on that year's balance. |
| **BL-LE-11** | Reversing a payslip (BL-033) that contains encashment reverses the payment line on the reversal payslip but does NOT restore the leave-balance deduction. The reversal payslip emits a negative `encashmentPaise` entry. Audit row `leave.encashment.payment.reverse`. |
| **BL-LE-12** | Encashment amount is taxable; included in `grossPaise` and the `referenceTaxPaise` calculation. (v1.1: Indian §10(10AA) exemption.) |
| **BL-LE-13** | Audit log entries: `leave.encashment.request.create`, `.approve`, `.reject`, `.cancel`, `.payment.scheduled`, `.payment.paid`, `.payment.reverse`. All append-only per BL-047. |
| **BL-LE-14** | Notifications: applicant on every state change; approver(s) on `request.create`; PayrollOfficer(s) on `.admin-finalise` so they know what's queued for next run. |

---

## 4. Data Model Changes

### 4.1 New Prisma model: `LeaveEncashment`

```prisma
enum LeaveEncashmentStatusDb {
  Pending
  ManagerApproved
  AdminFinalised
  Paid
  Rejected
  Cancelled
}

model LeaveEncashment {
  id                  String   @id @default(cuid())
  /// LE-YYYY-NNNN — globally unique.
  code                String   @unique
  employeeId          String
  employee            Employee @relation(fields: [employeeId], references: [id])
  year                Int      // calendar year the balance was earned in
  daysRequested       Int      // employee-stated; server clamps to 50%
  daysApproved        Int?     // set at Admin-Finalised; null until then
  /// Locked snapshot at Admin-Finalised — basicPaise + daPaise from the active SalaryStructure.
  ratePerDayPaise     Int?
  /// daysApproved × ratePerDayPaise; locked at Admin-Finalised.
  amountPaise         Int?
  status              LeaveEncashmentStatusDb @default(Pending)
  /// Same routing model as leave_requests.
  routedTo            String   // 'Manager' | 'Admin'
  approverId          String?  // current approver
  approver            Employee? @relation("EncashmentApprover", fields: [approverId], references: [id])
  decidedAt           DateTime?
  decidedBy           String?
  decisionNote        String?
  /// Set when Manager-SLA escalates to Admin.
  escalatedAt         DateTime?
  /// Payslip that paid this encashment. Null until payroll run picks it up.
  paidInPayslipId     String?
  paidInPayslip       Payslip? @relation(fields: [paidInPayslipId], references: [id])
  paidAt              DateTime?
  /// Cancellation provenance.
  cancelledAt         DateTime?
  cancelledBy         String?
  version             Int      @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([employeeId, year, status], name: "one_approved_per_year")
  @@index([status, year])
  @@map("leave_encashments")
}
```

> **Note on `@@unique([employeeId, year, status])`:** MySQL won't directly enforce "one Admin-Finalised per year" via a unique constraint that excludes other statuses. The simplest workable path is: enforce in application logic at create + approve time (check via `findFirst` with `status IN (ManagerApproved, AdminFinalised, Paid)`). The Prisma `@@unique` line above is a placeholder — actual DB constraint will be a partial index added in the migration via raw SQL.

### 4.2 New columns on `SalaryStructure`

```prisma
model SalaryStructure {
  // ... existing fields ...
  /// Dearness Allowance. Nullable; legacy rows default to null → treated as 0.
  daPaise         Int?
}
```

### 4.3 New columns on `Payslip`

```prisma
model Payslip {
  // ... existing fields ...
  /// Encashment days paid in this payslip (BL-LE-09). 0 if no encashment.
  encashmentDays  Int @default(0)
  /// Encashment amount in paise (BL-LE-08). Adds to gross.
  encashmentPaise Int @default(0)
  /// FK to the encashment record paid in this payslip. Null for payslips without encashment.
  encashmentId    String? @unique
  encashment      LeaveEncashment? @relation(fields: [encashmentId], references: [id])
}
```

### 4.4 New column on `LeaveBalance`

```prisma
model LeaveBalance {
  // ... existing fields ...
  /// Days encashed in this year (BL-LE-06). Separate from daysUsed.
  daysEncashed Int @default(0)
}
```

> **Migration strategy:** all new columns nullable / default-zero. No data backfill needed. Indexes added in the same migration. **No prisma migrate auto — handwrite the migration to add the partial unique index for `one_approved_per_year`.**

### 4.5 New `Configuration` rows (seed)

| Key | Default value | Notes |
|---|---|---|
| `ENCASHMENT_WINDOW_START_MONTH` | `12` | December |
| `ENCASHMENT_WINDOW_END_MONTH` | `1` | January |
| `ENCASHMENT_WINDOW_END_DAY` | `15` | 15 Jan |
| `ENCASHMENT_MAX_PERCENT` | `50` | 50 % of `daysRemaining` |

Admin updates these via existing `PATCH /api/v1/configurations/:key` flow.

---

## 5. API Surface (proposed — `HRMS_API.md` §10 to be appended on approval)

### 5.1 Employee endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| `POST` | `/leave-encashments` | E (SELF) | Body `{ year, daysRequested }`. Server validates window, balance, 50% cap, no prior approved request for that year. Routing identical to leave. |
| `GET` | `/leave-encashments` | E (SELF) | Lists own requests. Filters `?year`, `?status`. |
| `GET` | `/leave-encashments/:id` | E (SELF) / MGR (subordinate) / A | Detail. |
| `POST` | `/leave-encashments/:id/cancel` | E (SELF before Manager-Approved; A always) | Body `{ note? }`. |

### 5.2 Approver endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| `GET` | `/leave-encashments/queue` | MGR / A | Pending + ManagerApproved scoped to approver. |
| `POST` | `/leave-encashments/:id/manager-approve` | MGR | Body `{ note? }`. Transitions `Pending → ManagerApproved`. Routes to Admin queue. |
| `POST` | `/leave-encashments/:id/admin-finalise` | A | Body `{ daysApproved?, note? }`. `daysApproved` defaults to `daysRequested` clamped to 50%. Computes rate, locks amount, deducts balance, audits, notifies PayrollOfficer. |
| `POST` | `/leave-encashments/:id/reject` | MGR / A | Body `{ note: required }`. |

### 5.3 Payroll integration (no new endpoints — existing payroll engine extended)

- `POST /payroll/runs/:id/initiate` already reads each employee's salary structure + working days. Engine extension: for each employee, find their `AdminFinalised` (not-yet-paid) encashment for the year just-closed; add the encashment line to the payslip; mark `LeaveEncashment.status = Paid` with the payslip FK.
- `POST /payroll/runs/:id/reverse` extension: when reversing a payslip with an encashment line, emit a negative `encashmentPaise` entry on the reversal payslip and write `leave.encashment.payment.reverse` audit row. Balance is NOT restored.

### 5.4 New error codes (`packages/contracts/src/errors.ts`)

| Code | HTTP | Meaning |
|---|---|---|
| `ENCASHMENT_OUT_OF_WINDOW` | 409 | Outside Dec 1 → Jan 15 window. |
| `ENCASHMENT_ALREADY_USED` | 409 | Employee already has an approved encashment for this year. |
| `ENCASHMENT_INSUFFICIENT_BALANCE` | 409 | Requested days > 50 % of remaining. |
| `ENCASHMENT_INVALID_LEAVE_TYPE` | 400 | (defensive — Annual only.) |

---

## 6. Phasing

| Phase | Owner | Output | Owner sign-off needed? |
|---|---|---|---|
| **A. Docs** | (this doc) | `HRMS_LeaveEncashment_Plan.md` (this file) + appended sections in `HRMS_API.md` § 10, `SRS_HRMS_Nexora.md` § 5.X, `HRMS_Process_Flows.md` § 5.X, `HRMS_Test_Cases.md` § 12. **No code.** | ✅ **YES — explicit consent on OQ-1 to OQ-11 above.** |
| **B. Schema** | backend-developer | Prisma migration (SalaryStructure.daPaise, LeaveBalance.daysEncashed, Payslip.encashmentDays/Paise/Id, LeaveEncashment table, Configuration seed rows, partial unique index). | Auto after A. |
| **C. Contracts** | backend-developer | zod schemas: `LeaveEncashmentRequest`, `LeaveEncashmentDetail`, `LeaveEncashmentSummary`, request/response envelopes, new error codes, new `Configuration` keys. | Auto after B. |
| **D. Backend** | backend-developer | `leave-encashment.service.ts` + `.routes.ts`; payroll-engine extension; audit log entries; notifications; cron-ordering check (encashment finalise must run before Jan-1 carry-forward — add a `concurrencyGuard` advisory); Vitest coverage for BL-LE-01 through BL-LE-14. | Auto after C. |
| **E. Frontend** | frontend-developer | Employee `/employee/leave-encashment` page (request form + history table); Manager `/manager/leave-encashment-queue`; Admin `/admin/leave-encashment-queue`; Payroll payslip viewer shows encashment line. Sidebar entries gated by role. | Auto after D. |
| **F. QA + Security** | qa-tester + security-analyzer | Test pack (BL-LE-01 to BL-LE-14 + edge cases below) + security review of the new endpoints (privilege-escalation, replay, double-payment). | Auto after E. |

---

## 7. Edge Cases & Acceptance Criteria (preview for `HRMS_Test_Cases.md`)

| TC | Scenario | Expected |
|---|---|---|
| TC-LE-01 | Employee submits 5-day encashment when `daysRemaining = 12` | `Pending`; manager queue gets it. After Admin finalises with `daysApproved = 5`: balance `daysRemaining = 7`, `daysEncashed = 5`, rate locked. |
| TC-LE-02 | Employee requests 10 days when `daysRemaining = 12` (over 50 %) | Server clamps at Admin-Finalise step to `floor(12 × 0.5) = 6`. Audit reflects the clamp. Optional: surface a warning at request-time. |
| TC-LE-03 | Two requests in same year — second one before first is decided | Second request accepted as `Pending` (no quota consumed yet). When first becomes `AdminFinalised`, second auto-rejects with `ENCASHMENT_ALREADY_USED`. |
| TC-LE-04 | Submit on Feb 1 (outside window) | `409 ENCASHMENT_OUT_OF_WINDOW`. |
| TC-LE-05 | Employee whose reporting manager is `Exited` | Routes straight to Admin queue (BL-LE-05). |
| TC-LE-06 | Manager doesn't act within 5 working days | Escalation cron auto-routes to Admin; audit `leave.encashment.escalate`. |
| TC-LE-07 | Admin finalises Dec 31 23:59; Jan 1 carry-forward cron runs | Carry-forward sees post-deduction balance. Encashed days do not carry over. |
| TC-LE-08 | Admin finalises Jan 1 00:01 (after CF ran) | Balance for year Y+1 is reduced. Encashment payslip uses year Y's `ratePerDayPaise` snapshot at finalise. |
| TC-LE-09 | Next payroll run picks up the encashment | Payslip shows `encashmentDays`, `encashmentPaise`, `grossPaise` increases. `LeaveEncashment.status = Paid` with payslip FK. Notification to employee. |
| TC-LE-10 | Payslip with encashment is reversed | Reversal payslip emits negative encashment line. `LeaveEncashment.status` stays `Paid` but a new `leave.encashment.payment.reverse` audit row is written and a notification fires. Balance is NOT restored. |
| TC-LE-11 | Salary structure changes between request and approval | Rate uses the structure active on the Admin-Finalise date (BL-030 already locks salary by `effectiveFrom <= today`). |
| TC-LE-12 | `daPaise = NULL` on salary structure (legacy or no-DA company) | Rate = `basicPaise / workingDays`. No crash. |
| TC-LE-13 | Employee exits after request but before pay | Encashment auto-cancels on Admin-finalise-attempt with `EMPLOYEE_EXITED`; no payment. |
| TC-LE-14 | Concurrent finalise + carry-forward (race) | The Jan 1 carry-forward sees both rows; if encashment finalise is in-flight, the carry-forward selects `FOR UPDATE` and waits. Acceptable to require ordering at the cron level (encashment cron runs at 23:50 Dec 31). |

---

## 8. Coupling Check (per scorecard Section 4)

- **Leave-balance ↔ payroll module coupling:**
  - **Deduction on approval:** `leave-encashment.service.ts: adminFinalise()` decrements `LeaveBalance.daysRemaining` inside the same transaction as setting `status = AdminFinalised`. No async drift.
  - **Payment on next run:** `payrollEngine.ts: buildPayslipFor(employee, run)` extended to call `findUnpaidEncashment(employee.id, run.year - 1)` and inject the line. The `Paid` transition happens *inside the payroll-run transaction* so finalising the run, paying encashment, and stamping the FK happen atomically.
- **Existing payroll absorbs the new component:**
  - `Payslip.grossPaise` formula in `payrollEngine.ts` becomes `basic_prorated + allowances_prorated + encashmentPaise`. Tax (`referenceTaxPaise`) already runs on `grossPaise`, so encashment is taxed automatically.
  - PDF renderer (`payslip.pdf.ts`) gets a new conditional row: "Leave Encashment (X days @ ₹Y/day)". Hidden when `encashmentPaise = 0`.
- **Data model first:** This document is the data-model document. **No code is written until it is signed off.**

---

## 9. What This Plan Deliberately Does NOT Cover (v1.1+)

1. Section 10(10AA) tax exemption for encashment.
2. Encashment as part of full-and-final settlement on exit.
3. Encashment for leave types other than Annual.
4. Admin one-shot bulk-approve UI.
5. Multiple encashments per year (rejected by BL-LE-03).
6. Direct `leave.encashment.reverse` admin action separate from payslip reversal.

---

## 10. Sign-off Checklist (owner-confirmed 2026-05-12)

- [x] OQ-1 — window: Dec 1 → Jan 15, configurable ✔
- [x] OQ-2 — one approved per year ✔
- [x] OQ-3 — 50 % evaluated at Admin-Finalise ✔
- [x] OQ-4 — Manager-Approved → Admin-Finalised two-step ✔
- [x] OQ-5 — new `daPaise` column on `SalaryStructure` (Option A) ✔
- [x] OQ-6 — rate uses the paying month's workingDays ✔
- [x] OQ-7 — reversal via payslip reversal only (money back, days don't restore) ✔
- [x] OQ-8 — encashment finalise before Jan 1 cron (11-min buffer) ✔
- [x] OQ-9 — Annual only ✔
- [x] OQ-10 — exited employees out of scope (v1.1) ✔
- [x] OQ-11 — encashment taxable in v1; §10(10AA) deferred ✔
- [ ] Final BL numbers (BL-LE-01..14) — assign canonical BL-NNN numbers when promoted to SRS.

Implementation order:
1. ✅ Plan approved (this section).
2. **In progress** — Phase B (schema migration + contracts) → Phase C (backend service + routes + payroll-engine extension + tests) → Phase D (frontend pages) → Phase E (QA + security review).
3. SRS / API / Process-Flows / Test-Cases doc updates happen as commits land, not as a separate prelude.
