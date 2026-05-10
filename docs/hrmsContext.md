# HRMS — Complete Context Document

## Business Background

A company with 250 employees currently manages HR through spreadsheets, email-based leave approvals,
and a payroll process that takes 4 days every month. Problems include an employee on extended sick
leave being accidentally paid twice, and performance reviews getting skipped because no one tracks
who is due for one.

The goal is to build a complete HR Management System (HRMS) covering employees, leave, attendance,
payroll, and performance reviews.

---

## Important Clarifications (From Q&A)

- **HR = Admin.** Everywhere the system refers to "HR", that means the Admin role. Admin has full
  access and performs all HR actions throughout the system.
- **Single Indian company.** There is no multi-entity support. The fiscal calendar is always
  April to March — it is not configurable.
- **Every role is also an employee.** A Manager, PayrollOfficer, and Admin all have an underlying
  employee record and are subject to the same leave, attendance, and payroll rules as any other
  employee.

---

## Critical Operational Rules (Must Be Handled)

### 1. Manager Change Mid-Cycle
If an employee's manager changes (due to promotion or restructuring):
- The new manager handles all approvals from the change date onward.
- Any pending approvals submitted before the change still belong to the old manager.
- The old manager must approve or reject those pending requests.
- If the old manager has already exited the company, all pending approval requests route to
  **Admin**. Admin can either decide directly or reassign them.

### 2. Leave and Attendance Overlap Conflict
If an employee submits both a leave request and an attendance regularisation request that cover
the same time period, the second submission must be automatically rejected with a specific
conflict error message — not a generic validation error.

### 3. Payroll Fiscal Calendar
Payroll cycles follow the Indian fiscal calendar: April to March. This is fixed and does not
depend on the system clock or any configuration.

### 4. Concurrent Payroll Finalisation
If two Admin/HR users attempt to finalise the same payroll run at exactly the same time, the
system must ensure exactly one finalisation succeeds. The other request must fail gracefully.

---

## Module 1 — Auth & Users

### Roles
There are four roles in the system:
- **Admin** — full system access; also acts as HR for all HR-related actions
- **Manager** — manages a team, approves leaves and attendance regularisations
- **Employee** — regular staff member
- **PayrollOfficer** — handles payroll processing

Every role is also an employee. A Manager, PayrollOfficer, and Admin all have an underlying
employee record and go through the same leave, attendance, and payroll processes as any employee.

### Employee Creation
- Only Admin can create employees. There is no self-registration.
- When created, the account is inactive until the employee logs in for the first time and sets
  their password.

### Employee Code Format
- Every employee gets a unique code in the format: `EMP-YYYY-NNNN`
  - `YYYY` = year of creation
  - `NNNN` = 4-digit sequential number
- This code is unique and is never reused.

### Employee Status
An employee can be in one of four statuses:
- **Active** — default status on creation; currently working
- **On-notice** — Admin sets manually when notice is served
- **Exited** — Admin sets on the last working day
- **On-leave** — **system-set automatically** while an approved leave is in progress; reverts
  to Active when the leave ends

Most transitions are manual (Admin-controlled). The single exception is **on-leave**, which
the system flips on/off based on approved leave dates.

### Reporting Structure
- Each employee can have at most one reporting manager.
- Subordinates are defined per hierarchy layer — every direct and indirect report below a
  manager is their subordinate.
- A manager cannot — directly or indirectly — report to anyone who is their subordinate.
  No circular reporting chains are allowed.

### Manager With No Reporting Manager
- If a Manager has no reporting manager themselves, Admin approves their leave requests.

### Exits and Re-joins
- When an employee exits, all historical records are kept permanently. Nothing is deleted.
- If they re-join the company later, a brand new employee record is created with a new
  employee code. The old record remains unchanged.

---

## Module 2 — Leave

### Leave Types
The system supports six types of leave:
1. **Annual** — yearly paid leave
2. **Sick** — medical leave
3. **Casual** — short unplanned leave
4. **Maternity** — for new mothers; entitlement-based (see below)
5. **Paternity** — for new fathers; entitlement-based (see below)
6. **Unpaid** — leave without pay; deducted from gross pay in payroll

### Employment Types
Leave quotas are defined per employment type. The valid employment types are:
- Permanent
- Contract
- Intern
- Probation

Permanent employees get the full quota. Contract, Intern, and Probation get reduced or
pro-rated quotas. The final quota table is set by Admin; the system models quota-per-type
as a configurable relationship.

### Leave Balances
- Each employee has a leave balance per leave type per year.
- The balance is determined by their employment type.

### Annual Reset (January 1st)
Every year on January 1st, leave balances reset with the following rules:
- **Annual leave** — carries forward up to **10 days** (default; configurable).
- **Casual leave** — carries forward up to **5 days** (default; configurable).
- **Sick leave** — does NOT carry forward. Resets to zero every year.
- **Maternity and Paternity** — not applicable (event-based; see below).

### Carry-Forward Cap
- The carry-forward cap is configurable **per leave type** (not per employment type).
- Defaults: Annual = 10 days, Casual = 5 days.
- Admin can update the cap for each leave type independently.

### Event-Based Leaves (Maternity & Paternity)
Maternity and paternity leave are **event-based, not annual quotas**. No balance is
credited or tracked. Each event (childbirth) gets one allocation; once consumed, that
allocation is closed. They neither reset nor carry forward.

- **Maternity leave**: up to 26 weeks per event (configurable by Admin).
- **Paternity leave**: up to **10 working days per event**, taken as a **single block**, must
  be claimed within **6 months of the child's birth** (configurable by Admin).
- When applied for, the system checks eligibility (employment, prior usage for the same
  event) and grants up to the configured maximum.

### How Leave Balances Change
- When a leave is **approved** — the balance is deducted immediately.
- When a leave is **cancelled before it starts** — the full balance is restored.
- When a leave is **cancelled after it has started** — only the remaining unused days are
  restored. Days already taken are not restored.

### Overlap Rule
Two leave requests from the same employee cannot overlap in dates. The system must block this.

### Who Can Cancel Leave
Cancellation rights depend on whether the leave has started:
- **Before the leave start date** — the employee may cancel themselves.
- **After the leave has started** — only the Manager or Admin can cancel. Employee
  self-cancellation is blocked once the leave is in progress, because partial-day
  restoration needs review.

The balance restoration rules (above) still apply based on timing.

### Approval Flow
- Standard leave types (annual, sick, casual, unpaid) require approval from the employee's
  reporting Manager.
- **Maternity leave** — approved by Admin only (not the Manager).
- **Paternity leave** — approved by Admin only (same flow as maternity, since both are
  event-based).
- **Manager with no reporting manager** — Admin approves their leave.

### Approval Timeout / Escalation
- If a Manager does not act on a leave request within **5 working days**, the request
  automatically escalates to Admin for action.
- The 5-working-day window is the default and is configurable by Admin.
- There is no auto-approval. The request stays pending until someone acts on it.

### No Half-Day Leave
There is no half-day leave in the system. Leave is always taken in full-day units.

---

## Module 3 — Attendance

### Daily Attendance Record
Every active employee has a daily attendance entry containing:
- **Date**
- **Status**: one of — present, absent, on-leave, weekly-off, holiday
- **Check-in time**
- **Check-out time**
- **Hours worked** (auto-calculated by system as checkout minus check-in)

### Record Creation
- The system **auto-generates an attendance record at midnight** for every active employee.
- The default status on creation is **absent**.
- The status is overridden later by:
  - check-in (→ present, with late mark if after threshold), or
  - approved leave for that day (→ on-leave), or
  - weekend / public holiday (→ weekly-off / holiday).
- Hours worked are always computed by the system; never self-reported.

### Check-Out Rule
- Check-out is mandatory once a check-in has been recorded.
- Hours worked is automatically calculated by the system as: `checkout time − check-in time`

### How Status is Derived (in priority order)
The system automatically determines attendance status:
1. If there is an approved leave for that day → status = **on-leave**
2. If the day is a weekend or public holiday → status = **weekly-off** or **holiday**
3. If the employee has a check-in record → status = **present**
4. If none of the above → status = **absent**

### Regularisation Requests
If an employee needs to correct their attendance record:
- For records **up to 7 days ago** → the employee's Manager approves the regularisation.
- For records **older than 7 days** → only Admin/HR can approve.

### Late Marking
- If an employee checks in after **10:30 AM** (configurable by Admin), they are marked as **late**.
- If an employee gets **3 late marks in the same calendar month**, **1 full day** is automatically
  deducted from their annual leave balance.
- For **every additional late mark beyond 3** in the same calendar month, **another full day**
  is deducted from their annual leave balance.

> Note: The original document mentioned a half-day deduction. This is corrected — the penalty
> is a full day, not a half day.

---

## Module 4 — Payroll

### Payroll Frequency
Payroll is run monthly for every employee.

### Payslip Components
Each payslip contains:
- Basic salary
- Allowances
- Deductions
- Gross pay
- Taxable income
- Tax (calculated by built-in tax slab engine)
- Net pay

### Tax Calculation (v1)
- v1 does **not** ship a tax slab engine.
- The PayrollOfficer enters the tax amount manually on each payslip during the run review.
- A standard formula is used as a guide (gross taxable income × flat reference rate), but
  the value is editable per payslip.
- A configurable Indian tax slab engine is on the v2 roadmap.

### Salary Structure Rules
- The salary structure (components and amounts) can be edited by Admin/HR.
- Changes take effect from the **next payroll run only** — not retroactively.
- Once a payslip is generated and finalised, it is **immutable** — it can never be edited.

### Payroll Locking
- Once a payroll run for a month is finalised, that month is **locked**.
- No further changes can be made to it.

### Payroll Reversal
- Only an **Admin** can reverse a finalised payroll.
- Reversal creates a **new reversal record** — the original payslip is never modified or deleted.

### Loss of Pay (LOP) Calculation
- If an employee has taken unpaid leave, those days are deducted from their gross pay.
- Formula: `(Basic Salary + Allowances) ÷ Number of Working Days × Number of LOP Days`
- Each unpaid leave day is deducted using this formula.

### Pro-ration for Mid-Month Joiners and Exits
- If an employee joins or exits in the middle of a month, their salary is calculated
  proportionally based on the number of days actually worked.

### Concurrent Finalisation Protection
- If two Admin users attempt to finalise the same payroll run at the same time, the system
  must ensure exactly one finalisation succeeds.
- The other request must fail gracefully.

### Fiscal Calendar
- Payroll cycles always follow the **Indian fiscal calendar: April to March**.
- This is not configurable. There is no multi-entity support.

---

## Module 5 — Performance Reviews

### Review Cycles
Reviews happen twice a year (half-yearly). HR/Admin creates each cycle.
- **Cycle 1**: April to September
- **Cycle 2**: October to March

When creating a cycle, Admin defines:
- Start date
- End date
- Self-review deadline
- Manager-review deadline

### What Is Captured Per Employee Per Cycle
- **Self-rating** — submitted by the employee
- **Manager rating** — submitted by the reporting manager
- **Goals** — created by the Manager at cycle start (typically 3–5 per employee). The
  employee may propose additional goals during the self-review window. Each goal is marked
  as: met, partially met, or missed.
- **Final rating** — a score from 1 to 5
- **Comments** — written feedback

### Editing Rules
- Employees can edit their self-rating until the **self-review deadline**.
- Managers can edit their manager rating until the **manager-review deadline**.
- Once Admin **closes the cycle**, the final rating is **locked** and cannot be changed by anyone.

### Mid-Cycle Joiners
- Employees who join mid-cycle are **skipped** for that cycle entirely.
- They will be included from the next full review cycle onward.

### Manager Change Mid-Cycle
- If an employee's manager changes while a review cycle is in progress, the **new manager**
  submits the rating.
- The system records **both the previous manager and the current manager** on that review
  for audit purposes.

### Reports Available to Admin
1. **Rating distribution per department per cycle** — shows how ratings are spread across
   each department.
2. **Employees with missing reviews** — lists employees who have not yet received a review
   for the current cycle.

---

## Summary of All Rules and Constraints

| Area | Rule |
|---|---|
| HR role | HR = Admin throughout the system |
| Multi-entity | Not supported; single Indian company |
| Fiscal calendar | Always April–March; not configurable |
| Every role is an employee | Admin, Manager, PayrollOfficer all have employee records |
| Employee hierarchy | No circular reporting chains allowed |
| Subordinate definition | All direct and indirect reports below a manager |
| Employee status transitions | Manual (Admin) for active/on-notice/exited; on-leave is system-set automatically while approved leave is in progress |
| Employee exits | All historical data kept permanently; nothing deleted |
| Re-joins | New record + new employee code every time |
| Employment types | Permanent, Contract, Intern, Probation |
| Leave overlap (same employee) | Blocked — two overlapping leave requests not allowed |
| Leave + attendance overlap | Second request rejected with specific conflict error |
| Sick leave carry-forward | Does not carry forward on January 1 reset |
| Annual & casual carry-forward | Annual cap default 10 days; Casual cap default 5 days; configurable per leave type |
| Maternity leave | Admin-approved; event-based; up to 26 weeks; no balance |
| Paternity leave | Admin-approved; event-based; up to 10 working days, single block, within 6 months of birth |
| Half-day leave | Not supported |
| Late penalty | 3 lates in a month = 1 full day deducted; each additional late = another full day |
| Late check-in threshold | After 10:30 AM (configurable by Admin) |
| Manager with no manager | Admin approves their leave |
| Leave approval timeout | Escalates to Admin after 5 working days of no Manager action (configurable) |
| Who can cancel leave | Before start: employee. After start: Manager or Admin only |
| Exited manager's pending approvals | Routed to Admin (decides directly or reassigns) |
| Attendance record creation | Auto-generated at midnight for all active employees; default = absent |
| Check-out | Mandatory once check-in is recorded |
| Hours worked | Auto-calculated: checkout − check-in |
| Regularisation (≤7 days) | Manager approves |
| Regularisation (>7 days) | Admin only |
| Payslips | Immutable once finalised |
| Salary structure changes | Apply from next payroll run only |
| Payroll reversal | Admin-only; original payslip never edited; new reversal record created |
| Concurrent payroll finalisation | Exactly one must succeed; other must fail gracefully |
| Tax calculation | v1: manual entry by PayrollOfficer per payslip (standard formula as guide); slab engine deferred to v2 |
| LOP formula | (Basic + Allowances) ÷ Working Days × LOP Days |
| Mid-month joiners/exits | Salary pro-rated based on days worked |
| Goals in performance review | Manager creates at cycle start (typically 3–5); employee may propose during self-review |
| Mid-cycle joiners (reviews) | Skipped for that cycle; included from next full cycle |
| Manager change mid-cycle | New manager rates; both old and new manager recorded |
| Cycle closure | Admin closes cycle; final rating locked after closure |
