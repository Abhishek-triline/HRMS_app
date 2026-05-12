# Nexora HRMS — Test Cases

Test cases mapped to the use cases in [SRS_HRMS_Nexora.md](./SRS_HRMS_Nexora.md), the business rules `BL-NNN`, and the process flows in [HRMS_Process_Flows.md](./HRMS_Process_Flows.md). Each row maps to exactly one acceptance criterion so a tester can run, pass, or fail it deterministically.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Authentication & Account Access](#2-authentication--account-access)
3. [Employees & Hierarchy](#3-employees--hierarchy)
4. [Leave Management](#4-leave-management)
5. [Attendance & Regularisation](#5-attendance--regularisation)
6. [Payroll](#6-payroll)
7. [Performance Reviews](#7-performance-reviews)
8. [Notifications](#8-notifications)
9. [Audit Log](#9-audit-log)
10. [Configuration](#10-configuration)
11. [Cross-Cutting & Edge Cases](#11-cross-cutting--edge-cases)
12. [UI / Visual Review Checklist](#12-ui--visual-review-checklist)
13. [Regression Smoke Pack](#13-regression-smoke-pack)
14. [Traceability Matrix](#14-traceability-matrix)

---

## 1. Conventions

| Aspect | Convention |
|---|---|
| Test ID | `TC-<MOD>-<NNN>` — e.g. `TC-LEAVE-007`. Modules: `AUTH`, `EMP`, `LEAVE`, `ATT`, `REG`, `PAY`, `PERF`, `NOT`, `AUD`, `CFG`, `XCUT`, `UI`. |
| Type | `+` positive · `−` negative · `B` boundary · `S` security · `C` concurrency · `R` regression. |
| Severity | `Crit` blocks shipping · `High` user-facing failure · `Med` UX glitch or edge gap · `Low` cosmetic. |
| Preconditions | "Logged in as <role>" assumes a freshly seeded test workspace per § 1.1. |
| Date conventions | "Today" = the test fixture's clock anchor (default `2026-05-09`, Wed). |
| Test data tags | `@happy`, `@edge`, `@security`, `@perf`, `@a11y`, `@mobile`. |

### 1.1 Test workspace seed

Every test run starts from a **deterministic seed** with:

- Admin: `priya@nexora.in` / `EMP-2022-0001`
- Manager: `rajan@nexora.in` / `EMP-2023-0014` — reports to Priya
- Manager-no-mgr: `sanjay@nexora.in` / `EMP-2022-0009` — reports to no-one
- PayrollOfficer: `neha@nexora.in` / `EMP-2023-0042`
- Employee A: `kavya@nexora.in` / `EMP-2024-0042` — reports to Rajan
- Employee B: `arjun@nexora.in` / `EMP-2024-0118` — reports to Sanjay
- Holidays: 26 Jan, 3 Mar, 3 Apr, 20 Apr, 15 Aug, 8 Nov, 25 Dec
- Leave balances: Annual 18, Sick 10, Casual 6, Maternity/Paternity per eligibility
- Late threshold: 10:30 AM · Standard daily hours: 8

---

## 2. Authentication & Account Access

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-AUTH-001` | + | Crit | Login with valid credentials | User exists, `Active` | 1. Open `/index.html` 2. Enter email + password 3. Click Sign in | Redirect to role dashboard. `nx_session` cookie set HttpOnly+Secure+SameSite=Lax. | UC-AUTH-01 |
| `TC-AUTH-002` | + | High | "Keep me signed in for 30 days" extends session | — | Tick checkbox before login | Cookie `Max-Age` ≥ 30 days. | UC-AUTH-01 |
| `TC-AUTH-003` | − | High | Wrong password | — | Enter wrong password | Generic "Email or password is incorrect" — never says which. Counter increments. | — |
| `TC-AUTH-004` | S | High | 5 wrong attempts → lockout | — | Submit wrong password 5 times within 5 min | 6th attempt returns `423 LOCKED`. UI shows "Try again in 15 min." Audit entry written. | — |
| `TC-AUTH-005` | + | High | Lockout clears after 15 min | After TC-AUTH-004 | Wait 15 min, retry valid creds | Login succeeds, counter reset. | — |
| `TC-AUTH-006` | + | Low | ~~Demo "Sign in as Admin" chip~~ — **retired on `main`**; chips only exist on the `demo_signin` branch | `demo_signin` branch checkout | Click `Demo as → Admin` chip | Lands on `/admin/dashboard`. | demo_signin only |
| `TC-AUTH-007` | + | Crit | Forgot password — happy | Active account | 1. Click Forgot? 2. Enter email 3. Open reset link from email 4. Set new password | Old password invalidated; all active sessions for that user invalidated. | UC-FL-02 |
| `TC-AUTH-008` | S | Crit | Forgot password — unknown email | — | Enter random email | Page shows "If an account exists, an email was sent." No 4xx. **No enumeration leak.** | UC-FL-02 |
| `TC-AUTH-009` | − | High | Forgot password — expired token | — | Wait 31 min after request, then click link | "Link expired — request a new one." | UC-FL-02 |
| `TC-AUTH-010` | + | High | First login forces password reset | New employee created by Admin | 1. Open first-login link 2. Enter temp creds 3. Set new password | `mustResetPassword` flag cleared; redirect to role dashboard. | UC-FL-01 |
| `TC-AUTH-011` | − | Med | First login — invalid temp token | Token re-used or expired | Open link again | "Link is no longer valid." | UC-FL-01 |
| `TC-AUTH-012` | + | High | Logout invalidates session | Logged in | Click Sign Out | Cookie cleared. Refresh redirects to `/index.html`. Audit entry written. | — |
| `TC-AUTH-013` | + | Med | `/auth/me` returns the right role | Logged in as Manager | `GET /api/v1/auth/me` | `role: "Manager"`, current `Employee` payload. | — |
| `TC-AUTH-014` | + | High | Sign-in form floats smoothly | Desktop, no `prefers-reduced-motion` | Open `/index.html` | Card lifts ~10 px with 6 s ease-in-out loop. | design doc § 4 |
| `TC-AUTH-015` | + | Med | Sign-in form respects reduced motion | OS reduced-motion enabled | Open `/index.html` | No float, no shine, no blob drift. | a11y |

---

## 3. Employees & Hierarchy

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-EMP-001` | + | Crit | Admin creates employee | Logged in as Admin | A-04 form: name, email, role, dept, manager, joinDate, salary | New `EMP-2026-NNNN` code generated; welcome email sent; `Inactive` until first login. | A-04, D-02, BL-008 |
| `TC-EMP-002` | − | High | Duplicate email rejected | A-04 form with existing email | Submit | "Email already registered." | A-04 |
| `TC-EMP-003` | + | Crit | EMP code never reused | Employee EMP-2024-0042 exited; A-04 with same name | Submit | New code (e.g. `EMP-2027-0312`); old `0042` retained, never reissued. | BL-008, DN-17 |
| `TC-EMP-004` | + | Crit | Admin reassigns reporting manager | Active employee with Mgr A; pending leave from yesterday | Reassign to Mgr B | All FUTURE leave/reg goes to Mgr B; the pending request stays with Mgr A. | BL-022, D-14 |
| `TC-EMP-005` | + | Crit | Reassign when previous Mgr exited | Mgr A exited, pending requests still in queue | Reassign to Mgr B | Pending requests roll up to Admin queue automatically. | BL-022, D-14 |
| `TC-EMP-006` | + | High | Manager sees own team | Logged in as Rajan | `M-02 → My Team` | Returns Kavya only (current). Past members show under separate "Past members" tab. | M-02, BL-022a |
| `TC-EMP-007` | − | High | Manager cannot see another team | Logged in as Rajan | Try `GET /employees?managerId=Sanjay` | `403 FORBIDDEN`. | scope |
| `TC-EMP-008` | + | High | Edit own profile (Admin) | Logged in as Priya | A-04 → edit own | Saves successfully; profile.html reflects update. | profile.html |
| `TC-EMP-009` | − | High | Employee cannot edit profile | Logged in as Kavya | Try profile edit endpoint | `403`. UI shows "Profile details are read-only." | profile.html |
| `TC-EMP-010` | + | High | Manual status change On-Notice | Logged in as Admin | Set Kavya status → `On-Notice` | Status persists; system-only `On-Leave`/`Active` transitions are not exposed in this dropdown. | BL-006 |
| `TC-EMP-011` | + | Crit | Salary edit applies from next run | May run not yet started; edit Kavya's basic | Trigger May run | New basic used. April run (already finalised) **untouched**. | BL-030, BL-031 |

---

## 4. Leave Management

### 4.1 Submission & validation

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-LEAVE-001` | + | Crit | Apply Annual leave — happy | Kavya, balance 18 d, no overlaps | Apply 13–15 May 2026 (3 d), Annual | Status = Pending; 3 d held; routes to Rajan. | E-03, BL-005 |
| `TC-LEAVE-002` | − | High | Half-day attempt rejected | — | Try `from = to = 13 May, half = true` | API returns 400 `VALIDATION_FAILED`. UI doesn't expose the field. | BL-011, DN-06 |
| `TC-LEAVE-003` | − | Crit | Overlap with approved leave | Existing approved 13–14 May | Apply 14–15 May | `409 LEAVE_OVERLAP` with `details.conflictId`. UI shows named conflict block — never generic error. | BL-009, DN-19 |
| `TC-LEAVE-004` | − | Crit | Overlap with regularisation | Approved reg covers 14 May | Apply leave 13–14 May | `409 LEAVE_REG_CONFLICT` naming `R-2026-NNNN`. | BL-010, DN-19 |
| `TC-LEAVE-005` | − | High | Insufficient balance | Annual = 1 d | Apply 4 d Annual | `409 INSUFFICIENT_BALANCE`. | BL-014 |
| `TC-LEAVE-006` | + | Crit | Maternity bypasses balance check | Female employee, eligible | Apply 90 d Maternity | Accepted regardless of any balance value. Routes to Admin only. | BL-015 |
| `TC-LEAVE-007` | + | Crit | Paternity bypasses balance + Mgr | Male employee, eligible | Apply 5 d Paternity | Accepted; routes to Admin only — never to Manager. | BL-016 |
| `TC-LEAVE-008` | + | High | Manager-with-no-manager → Admin | Sanjay applies leave | Submit any type | Routes to Admin queue. Audit entry shows "no manager — routed to Admin." | BL-017 |
| `TC-LEAVE-009` | B | Med | Leave on weekend boundary | Apply Fri–Mon | Submit | Days = 4 (raw range). System does not skip weekends — full day count includes them per BL-011 unless calendar excludes. *(Verify against latest spec.)* | BL-011 |

### 4.2 Decision & escalation

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-LEAVE-010` | + | Crit | Manager approves | Pending leave from Kavya | Rajan clicks Approve | Status = Approved; balance deducted immediately (BL-021). Notification to Kavya. | M-04, BL-021 |
| `TC-LEAVE-011` | + | High | Manager rejects with note | Pending leave | Rajan clicks Reject + note | Status = Rejected; balance untouched. Note required — empty rejected. | M-04 |
| `TC-LEAVE-012` | + | Crit | 5-day timeout escalates | Pending Annual leave on day 5 | Cron sweeps | Status flips to `Escalated`; routedTo = Admin; both Mgr and Admin notified. **No auto-approval.** | BL-018, DN-03 |
| `TC-LEAVE-013` | + | High | Admin acts on escalated leave | After TC-LEAVE-012 | Priya clicks Approve | Status = Approved; balance deducted. | A-06 |
| `TC-LEAVE-014` | + | High | Maternity goes straight to Admin | Submit Maternity | Check queue | Lands in A-06, NOT in M-04. | BL-015 |
| `TC-LEAVE-015` | C | Crit | Status flips on leave start/end | Approved 13–15 May | At 00:00 13 May, then 00:00 16 May | Status = `On-Leave` from start, → `Active` after end. Both auto-set. | BL-006 |

### 4.3 Cancellation

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-LEAVE-016` | + | High | Employee cancels Pending leave | Pending request | Cancel | Status = Cancelled; balance hold released. | BL-019, E-04 |
| `TC-LEAVE-017` | − | High | Employee cannot cancel Approved | Approved leave | Try cancel | `403`. UI hides cancel button. | BL-020 |
| `TC-LEAVE-018` | + | High | Admin cancels Approved leave | Approved leave | Admin → cancel | Status = Cancelled; balance restored. | BL-020 |
| `TC-LEAVE-019` | + | Med | Cancellation impact shown to user | Cancel screen | Open cancel confirm | "This will restore X day(s) to your Annual balance." | E-04 |

### 4.4 Annual reset & carry-forward

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-LEAVE-020` | + | Crit | Carry-forward capped on Jan 1 | Annual = 22 d on 31 Dec, cap = 12 d | Trigger Jan 1 reset | New balance = 12 + new annual quota. Notification sent. | BL-013 |
| `TC-LEAVE-021` | + | Med | Maternity / Paternity not reset | Used Maternity in prior year | Trigger Jan 1 reset | Maternity remaining unchanged — event-based. | BL-015 |

---

## 5. Attendance & Regularisation

### 5.1 Daily generation & status

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-ATT-001` | + | Crit | Midnight job creates rows | Mock clock 00:00 | Trigger `attendance.midnight-generate` | One AttendanceRecord per Active employee, default = `Absent`. | BL-024 |
| `TC-ATT-002` | + | High | Status derives correctly — On-Leave wins | Approved leave 13 May | After midnight job + leave start | Status = `On-Leave` (not Absent). | BL-026 |
| `TC-ATT-003` | + | High | Status derives — Holiday | 15 Aug | Midnight job | Status = `Holiday`. | BL-026 |
| `TC-ATT-004` | + | High | Status derives — Weekly Off | Saturday | Midnight job | Status = `Weekly-Off`. | BL-026 |
| `TC-ATT-005` | + | Crit | Check-in flips Absent → Present | Today's row = Absent | Click Check-In at 09:30 | Status = `Present`; checkInTime stamped. | BL-026, E-06 |

### 5.2 Check-in / out

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-ATT-006` | + | Crit | Check-in before threshold | Mock clock 09:30 | Click Check-In | No late mark. Confirmation toast with time. | BL-027 |
| `TC-ATT-007` | + | Crit | Check-in after threshold = Late | Mock clock 10:35 | Click Check-In | Late mark recorded; lateMonthCount = 1; warning shown only at count = 2. | BL-027 |
| `TC-ATT-008` | + | Crit | 3rd late mark → 1 day deducted | lateMonthCount = 2; mock clock 10:40 next day | Check-In | lateMonthCount = 3; **1 full day** deducted from Annual; notification sent. | BL-028 |
| `TC-ATT-009` | + | Crit | 4th late mark → another 1 day | lateMonthCount = 3 already | Trigger 4th late check-in | +1 more day deducted (total 2 days lost this month). | BL-028 |
| `TC-ATT-010` | + | Crit | Check-out computes hours | Checked in 09:30, now 18:42 | Click Check-Out | hoursWorked = `9h 12m`. | BL-025 |
| `TC-ATT-011` | + | High | Already-checked-out idempotent | Today already has checkOutTime | Click Check-Out again | No-op. UI shows confirmation panel. | E-06 |
| `TC-ATT-012` | + | Med | Half-day deduction does not exist | Trigger 3rd late | Inspect deduction | Always 1.0 day, never 0.5. | BL-011, DN-06 |

### 5.3 Regularisation

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-REG-001` | + | Crit | Reg ≤ 7 d routes to Manager | Today − 3 days | Submit reg | routedTo = Manager (Rajan). | BL-029 |
| `TC-REG-002` | + | Crit | Reg > 7 d routes to Admin | Today − 14 days | Submit reg | routedTo = Admin only. | BL-029 |
| `TC-REG-003` | − | High | Reg conflict with leave | Approved leave covers date D | Submit reg for D | `409 LEAVE_REG_CONFLICT`; UI names L-2026-0118. | BL-010, DN-19 |
| `TC-REG-004` | + | Crit | Approve preserves original record | Original Absent record exists | Manager approves reg | New record appended (source = `regularisation`); original kept; both linked. | BL-047, § 11.3 process flows |
| `TC-REG-005` | + | High | Reject regularisation with note | Pending reg | Manager rejects + note | Status = Rejected; original record unchanged. | M-06 |
| `TC-REG-006` | + | High | Admin's reg ≤ 7 d goes to Admin's Mgr | Admin (Priya) reports to no-one | Submit | Routes to Admin queue (no other mgr). | § 7.3 process flows |

### 5.4 Calendar & log views

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-ATT-013` | + | Med | Monthly calendar renders all statuses | Seeded month with mix of Present / Leave / Late / Off | Open `my-attendance.html` | Each cell has correct status dot color; legend matches. | E-05 |
| `TC-ATT-014` | + | Med | Hours mini-chart respects 8h target | Seeded last-14-day data | Open `my-attendance.html` | Dashed line at 80% of bar height; late day rendered crimson. | my-attendance.html |
| `TC-ATT-015` | + | Med | Manager team-attendance filters | Seeded team data | M-05, filter by date range | Filter applies; row count updates. | M-05 |

---

## 6. Payroll

### 6.1 Run lifecycle

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-PAY-001` | + | Crit | Initiate run for current month | No run for May 2026 | Admin → A-12 → Initiate | Run = Draft. One Payslip per Active employee. | A-12, P-03 |
| `TC-PAY-002` | + | Crit | LOP applied for absent days | Kavya has 1 unauthorised absent day | Compute | LOP = (Basic + Allowances) ÷ workingDays × 1. | BL-035 |
| `TC-PAY-003` | + | Crit | Mid-month joiner pro-ration | Joined 15 May | Compute May | Salary pro-rated to days actually worked. | BL-036 |
| `TC-PAY-004` | + | Crit | PO enters tax → Net recomputes | Run = Review | PO sets finalTax_paise on payslip | netPay = gross − lopDeduction − finalTax. UI updates immediately. | BL-036a, UC-014 |
| `TC-PAY-005` | + | Crit | Two-step Finalise modal | Run = Review | Click Finalise → modal | Type "FINALISE" required. Single click does NOT lock. | A-14, P-05 |
| `TC-PAY-006` | C | Crit | Concurrent finalise — exactly one wins | Both Admin and PO click Finalise within 1 s | Race | One returns 200 with status=Finalised; other returns `409 RUN_ALREADY_FINALISED` with winner name + timestamp. | BL-034 |
| `TC-PAY-007` | + | Crit | Finalised payslip is immutable | Run = Finalised | Try `PATCH /payslips/{id}/tax` | `409 PAYSLIP_IMMUTABLE`. | BL-031, DN-10 |
| `TC-PAY-008` | + | High | Reversal creates NEW record | Finalised payslip | Admin → A-15 → Reverse with reason | New reversal payslip with `reversalOfId`; original NEVER mutated. | BL-032 |
| `TC-PAY-009` | − | Crit | Only Admin can reverse | Logged in as PO | Try `POST /payroll/runs/{id}/reverse` | `403 FORBIDDEN`. | BL-033 |
| `TC-PAY-010` | + | Med | Reversal listed in Reversal History | Reversal exists | Open A-24 | Both original P-id and reversal P-id shown with audit metadata. | A-24 |

### 6.2 Payslip view

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-PAY-011` | + | High | Employee sees own payslip | Finalised May payslip | E-08 | Renders correctly. Tax shown is finalTax (PO entered). | E-08 |
| `TC-PAY-012` | − | High | Employee cannot see another's payslip | Logged in as Kavya | Try `GET /payslips/{Arjun's id}` | `403 NOT_OWNER`. | scope |
| `TC-PAY-013` | + | Med | Manager sees team payslip | Logged in as Rajan | Open Kavya's | Visible read-only. | M-02 |
| `TC-PAY-014` | + | Med | PDF download works | Finalised payslip | Click Download | PDF served; print stylesheet strips chrome. | E-08 |
| `TC-PAY-015` | + | Med | Finalised banner renders correctly | Finalised payslip | Open employee's payslip | Banner uses `bg-greenbg text-richgreen` (consistent across all 4 panels). | design doc |

### 6.3 Salary structure changes

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-PAY-016` | + | Crit | Edit applies from next run | April finalised; edit Kavya's basic on 5 May | Trigger May run | New basic used; April unchanged. | BL-030 |
| `TC-PAY-017` | + | High | Edit during open run uses new value | May = Draft; edit before compute | Compute May | New basic used immediately. | BL-030 |
| `TC-PAY-018` | − | Crit | Cannot retroactively edit finalised payslip | April finalised | Try edit | `409 PAYSLIP_IMMUTABLE`. | BL-031 |

---

## 7. Performance Reviews

### 7.1 Cycle lifecycle

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-PERF-001` | + | Crit | Admin creates cycle | Logged in as Priya | A-20 with start, end, deadlines | Cycle = Open. Active employees included. Mid-cycle joiners excluded. | A-20, BL-037 |
| `TC-PERF-002` | + | Crit | Mid-cycle joiner skipped | New employee joining 15 days into cycle | Cycle compute | Marked SKIP for this cycle; included from next. | BL-037, DN-14 |
| `TC-PERF-003` | + | Crit | Manager creates 3 goals | Cycle = Open; Rajan logged in | M-09 → add 3 goals for Kavya | Saved. Outcome = Pending until rated. | M-09, BL-038 |
| `TC-PERF-004` | + | High | Employee proposes extra goal during self-review | Cycle in self-review window | Kavya → E-11 → Propose | Saved with `proposedByEmployee = true`. | BL-038 |
| `TC-PERF-005` | − | High | Employee cannot propose goal outside window | Cycle past self-review deadline | Try propose | `409 CYCLE_PHASE`. | BL-038 |
| `TC-PERF-006` | + | High | Self-rating editable till deadline | Cycle in self-review window | E-11 update self-rating | Saved. | BL-039 |
| `TC-PERF-007` | − | High | Self-rating locked after deadline | Past selfReviewDeadline | E-11 update | `409 CYCLE_PHASE`. | BL-039 |
| `TC-PERF-008` | + | High | Manager rating with override flag | Self = 4, Manager rates 3 | M-10 submit | `managerOverrodeSelf = true`. UI shows "Mgr changed" tag. | BL-040 |
| `TC-PERF-009` | + | Crit | Close cycle locks all ratings | Cycle has all reviews | Admin → Close (2-step confirm) | Status = Closed; lockedAt set; final rating frozen. | BL-041 |
| `TC-PERF-010` | − | Crit | Closed cycle ratings immutable | Closed cycle | Try mutate | `409 CYCLE_CLOSED`. | BL-041 |

### 7.2 Manager change mid-cycle

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-PERF-011` | + | Crit | Old + new manager both retained | Mid-cycle reassign | Open review | Both `managerId` and `previousManagerId` shown. | BL-042, D-14 |
| `TC-PERF-012` | + | High | New manager continues from where old left | Old set 2 goals | New mgr opens | Existing goals visible; can add more or rate. | BL-042 |

### 7.3 Reports

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-PERF-013` | + | Med | Rating distribution report | Closed cycle | A-22 | Histogram across 1–5 levels. | A-22 |
| `TC-PERF-014` | + | Med | Missing reviews report | Cycle in mgr-review phase | A-23 | Lists employees without manager rating. | A-23 |

---

## 8. Notifications

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-NOT-001` | + | Crit | Leave submission notifies Manager | Kavya submits | Inspect Rajan's feed | New notification with link to L-id. | § 9.1 process flows |
| `TC-NOT-002` | + | Crit | Leave approval notifies Employee | Rajan approves | Kavya's feed | New notification. Bell shows red dot. | § 9.1 |
| `TC-NOT-003` | + | High | Late mark warning at 2nd | Trigger 2nd late | Kavya's feed | "1 more late = 1 day deducted." | BL-028 |
| `TC-NOT-004` | + | High | Late penalty notification at 3rd | Trigger 3rd late | Kavya's feed | "1 day deducted from Annual." | BL-028 |
| `TC-NOT-005` | + | High | Payslip ready | Run finalised | Kavya's feed | "Your May 2026 payslip is ready." | § 9.1 |
| `TC-NOT-006` | + | High | Reversal notifies Employee + Admin | Admin reverses Kavya's payslip | Both feeds | Notification with link. | § 9.1 |
| `TC-NOT-007` | + | Med | Cycle open notifies in-scope employees | Admin opens cycle | All Active employees' feeds | Notification with link. Mid-cycle joiners excluded. | § 9.1 |
| `TC-NOT-008` | + | Med | Self-review window 7d / 1d nudges | Cycle 7 d before deadline | Kavya's feed | Two notifications fire (7d, then 1d). | § 9.1 |
| `TC-NOT-009` | + | Med | Mark-read | Open feed | Click any unread | Marked read; bell count decrements. | E-12 |
| `TC-NOT-010` | + | Low | 90-day retention | Notification 91 days old | Inspect feed | Archived; not in default feed. | § 9.3 |
| `TC-NOT-011` | + | Med | Notification feed scoped per role | Logged in as Manager | GET feed | Only Manager-relevant notifications visible. | scope |
| `TC-NOT-012` | − | High | Cannot create notification via API | Any role | `POST /notifications` | `404 / 405`. System-generated only. | § 9.1 |

---

## 9. Audit Log

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-AUD-001` | + | Crit | Every approve writes audit | Manager approves leave | Inspect `/audit-log` | Entry with actor, before, after, BL ref. | BL-047 |
| `TC-AUD-002` | + | Crit | Every reject writes audit | Reject leave | Inspect | Entry written. | BL-047 |
| `TC-AUD-003` | + | Crit | Payroll finalise writes audit | Finalise run | Inspect | Entry includes `before.status = "Review"`, `after.status = "Finalised"`. | BL-047 |
| `TC-AUD-004` | + | Crit | Reversal writes audit | Admin reverses payslip | Inspect | Entry links original + reversal. | BL-032 |
| `TC-AUD-005` | + | Crit | Status change writes audit | Admin sets On-Notice | Inspect | Entry written. | BL-047 |
| `TC-AUD-006` | + | Crit | Config change writes audit | Admin changes late threshold | Inspect | Entry written; before/after captured. | BL-048 |
| `TC-AUD-007` | S | Crit | Audit entry cannot be edited | Active entry | Try `PATCH` | `405 / 403`. DB-level constraint denies UPDATE. | BL-047 |
| `TC-AUD-008` | S | Crit | Audit entry cannot be deleted | Active entry | Try `DELETE` | `405 / 403`. DB denies DELETE. | BL-047 |
| `TC-AUD-009` | + | High | Filter by actor + module | Many entries | A-26 with filters | Result narrows correctly. | A-26 |
| `TC-AUD-010` | − | High | Non-Admin cannot read audit | Logged in as Manager | `GET /audit-log` | `403`. | scope |
| `TC-AUD-011` | + | High | Login success/failure logged | Login attempts | Inspect | Both kinds present. | BL-048 |
| `TC-AUD-012` | + | High | Lockout logged | Trigger lockout | Inspect | `lockout` action present. | BL-048 |

---

## 10. Configuration

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-CFG-001` | + | High | Admin updates late threshold | Default 10:30 | Set to 10:00 | Saved. Audit entry. Future check-ins use new threshold. | A-19, BL-027 |
| `TC-CFG-002` | + | High | Admin updates standard daily hours | Default 8 | Set to 9 | Saved. UI "Remaining" tile uses 9h target. **No payroll/leave impact.** | A-19, BL-025a |
| `TC-CFG-003` | − | High | Non-Admin cannot edit config | Logged in as PO | Try PATCH | `403`. | scope |
| `TC-CFG-004` | + | High | Holiday calendar replaces year | A-19 | PUT new holidays for 2026 | Replaces existing 2026; other years untouched. | A-19 |
| `TC-CFG-005` | + | Med | Manager SLA edit takes effect | 5 → 7 working days | Submit pending leave on day 6 | NOT escalated (under new threshold). | BL-018 |

---

## 11. Cross-Cutting & Edge Cases

| ID | Type | Sev | Title | Preconditions | Steps | Expected | Refs |
|---|---|---|---|---|---|---|---|
| `TC-XCUT-001` | C | Crit | Leave + reg conflict — symmetric | Approved leave on D; submit reg on D | API | `409 LEAVE_REG_CONFLICT` naming L-id. Same response if leave submitted onto a reg-covered day. | BL-010, DN-19 |
| `TC-XCUT-002` | C | Crit | Manager-with-no-mgr — full chain rolls to Admin | Sanjay submits leave / reg / PR | All three | All routed to Admin. | § 7.7 process flows |
| `TC-XCUT-003` | + | Crit | Re-joining after exit | Kavya exited; rejoins 2 yrs later | Admin creates new record | New code generated; old `0042` retained, never reused. | BL-008, DN-17 |
| `TC-XCUT-004` | S | High | Cross-tenant data leak prevention | User from tenant A | Try IDs from tenant B | `403`. | security |
| `TC-XCUT-005` | + | Med | Optimistic concurrency on edit | Two users open same record | Both PATCH with same `version` | Second gets `409 VERSION_MISMATCH`. | conventions |
| `TC-XCUT-006` | + | Med | Idempotency-Key dedupes | Same Key replayed within 24 h | POST | Returns original response without re-applying. | conventions |
| `TC-XCUT-007` | + | High | All actions in audit-log coverage table | Each row of process-flows § 11.2 | Trigger that action | Entry appears with the documented `action`. | BL-048 |
| `TC-XCUT-008` | + | High | Auto-escalation does NOT auto-approve | Pending leave on day 5 | Cron sweeps | Status = Escalated, NOT Approved. Admin must still act. | DN-03 |
| `TC-XCUT-009` | + | Med | Print stylesheet strips chrome | Open payslip → print preview | Inspect | Sidebar, header, banners hidden in print. | design doc § 4 |
| `TC-XCUT-010` | + | Med | Custom scrollbars themed | Any page with scroll | Inspect | Sage thumb on light, mint thumb on dark. | design doc § 6 |

---

## 12. UI / Visual Review Checklist

| ID | Type | Sev | Title | Steps | Expected | Refs |
|---|---|---|---|---|---|---|
| `TC-UI-001` | + | High | Sidebar uses layered atmospheric stack | Open any in-app page | Forest gradient + aurora streak + brand glow + dot grain visible. | design doc § 4 |
| `TC-UI-002` | + | High | "Check In / Out" injected in every role sidebar | Inspect admin, manager, PO sidebars | Item present after "My Attendance" with state-driven label. | sidebar.js, BL-004 |
| `TC-UI-003` | + | High | My Attendance hero — cinematic stack | Open my-attendance for each role | Gradient, aurora, sun, mint pool, topographic curves, mountain silhouettes, dot grain, constellation visible. | design doc § 4 |
| `TC-UI-004` | + | High | Regularise CTA contrast-amber | My Attendance hero | Amber gradient, ring, hover-lift, click press-in. | design doc § 4 |
| `TC-UI-005` | + | High | Profile hero — geometric diamonds | Open profile for each role | Three nested rotated diamonds on the right; mesh gradient; weave pattern. | design doc § 4 |
| `TC-UI-006` | + | High | My Payslips & My Reviews use Self-Service Hero | Open both | Same cinematic layer stack as my-attendance hero. | design doc § 4 |
| `TC-UI-007` | + | High | Time-of-day demo dock — Check In + Dashboard | Click each swatch | Hero scene swaps. ⟲ Live restores wall-clock. | design doc § 4 |
| `TC-UI-008` | + | High | Morning gradient is deepened | data-tod="morning" | Coppery-orange → tan → emerald → forest. NOT pale peach/cream. | design doc § 4 |
| `TC-UI-009` | + | High | Day gradient is deepened | data-tod="day" | Deep teal → emerald → forest. NOT light sky-blue. | design doc § 4 |
| `TC-UI-010` | + | Med | Check-in state preview dock works | Open employee/checkin.html | ⏰ Ready / ✓ Working / 🌙 Out toggles panels. Default = Ready. | design doc § 4 |
| `TC-UI-011` | + | Med | Burger button vertically centred | Mobile viewport | Button centred against header (60 / 64 px), no box, three forest lines. | design doc § 4 |
| `TC-UI-012` | + | Med | Drawer closes on backdrop / Escape / nav-link | Open drawer, then trigger each | All three close it; body scroll lock released. | design doc § 4 |
| `TC-UI-013` | + | Med | Standard daily hours config card | A-19 attendance tab | Card visible with input + "Display only" callout. | A-19, BL-025a |
| `TC-UI-014` | + | Med | Conflict error block names record | Submit leave that overlaps | UI shows L-id (e.g. `L-2026-0118`) and resolution hint. | DN-19 |
| `TC-UI-015` | + | Med | Manager-Changed inline tag | Self ≠ manager rating | "Mgr changed" tag with tooltip on review row. | BL-040 |

---

## 13. Regression Smoke Pack

A 20-minute pass before each release. Run in this order:

| Order | TC ID | What it covers |
|---|---|---|
| 1 | `TC-AUTH-001` | Login |
| 2 | `TC-EMP-001` | Create employee |
| 3 | `TC-LEAVE-001` | Submit leave |
| 4 | `TC-LEAVE-010` | Manager approve |
| 5 | `TC-LEAVE-003` | Overlap rejection |
| 6 | `TC-ATT-006` | On-time check-in |
| 7 | `TC-ATT-008` | Late mark deduction |
| 8 | `TC-REG-001` | Regularisation routing |
| 9 | `TC-PAY-001` | Initiate run |
| 10 | `TC-PAY-005` | Two-step finalise |
| 11 | `TC-PAY-006` | Concurrent guard |
| 12 | `TC-PAY-007` | Immutable payslip |
| 13 | `TC-PERF-001` | Create cycle |
| 14 | `TC-PERF-009` | Close cycle locks ratings |
| 15 | `TC-NOT-002` | Approval notification |
| 16 | `TC-AUD-007` | Audit immutability |
| 17 | `TC-CFG-001` | Late threshold edit |
| 18 | `TC-UI-002` | Check-in sidebar entry |
| 19 | `TC-UI-007` | Time-of-day demo dock |

If any of these fails → **block release**.

---

## 14. Traceability Matrix

A condensed mapping: every BL rule must have at least one test case.

| Rule | Tests |
|---|---|
| BL-004 (every role is also Employee) | TC-UI-002, TC-XCUT-002 |
| BL-006 (status transitions) | TC-EMP-010, TC-LEAVE-015, TC-ATT-002 |
| BL-008 (EMP code never reused) | TC-EMP-003, TC-XCUT-003 |
| BL-009 (overlap reject) | TC-LEAVE-003 |
| BL-010 (leave/reg conflict) | TC-LEAVE-004, TC-REG-003, TC-XCUT-001 |
| BL-011 (no half-day) | TC-LEAVE-002, TC-LEAVE-009, TC-ATT-012 |
| BL-013 (carry-forward) | TC-LEAVE-020 |
| BL-014 (balance check) | TC-LEAVE-005 |
| BL-015 (Maternity → Admin) | TC-LEAVE-006, TC-LEAVE-014 |
| BL-016 (Paternity → Admin) | TC-LEAVE-007 |
| BL-017 (no-mgr → Admin) | TC-LEAVE-008 |
| BL-018 (5-day timeout) | TC-LEAVE-012, TC-XCUT-008 |
| BL-019 / 020 (cancellation) | TC-LEAVE-016/017/018 |
| BL-021 (deduct on approve) | TC-LEAVE-010 |
| BL-022 (mid-cycle reassign) | TC-EMP-004, TC-EMP-005 |
| BL-022a (past team members) | TC-EMP-006 |
| BL-024 (midnight job) | TC-ATT-001 |
| BL-025 (hours = out − in) | TC-ATT-010 |
| BL-025a (standard daily hours config) | TC-CFG-002, TC-UI-013 |
| BL-026 (status priority) | TC-ATT-002/003/004 |
| BL-027 (late threshold) | TC-ATT-006/007, TC-CFG-001 |
| BL-028 (3 late = 1 day) | TC-ATT-008/009, TC-NOT-003/004 |
| BL-029 (reg routing) | TC-REG-001/002 |
| BL-030 (salary not retroactive) | TC-PAY-016/017, TC-EMP-011 |
| BL-031 (payslip immutable) | TC-PAY-007, TC-PAY-018 |
| BL-032 (reversal as new record) | TC-PAY-008, TC-AUD-004 |
| BL-033 (Admin-only reversal) | TC-PAY-009 |
| BL-034 (concurrent finalise) | TC-PAY-006 |
| BL-035 (LOP formula) | TC-PAY-002 |
| BL-036 (mid-month proration) | TC-PAY-003 |
| BL-036a (manual tax v1) | TC-PAY-004 |
| BL-037 (mid-cycle joiner skip) | TC-PERF-002 |
| BL-038 (goals + employee proposal) | TC-PERF-003/004/005 |
| BL-039 (self-rating deadline) | TC-PERF-006/007 |
| BL-040 (mgr override flag) | TC-PERF-008, TC-UI-015 |
| BL-041 (cycle close locks) | TC-PERF-009/010 |
| BL-042 (mgr change retains both) | TC-PERF-011/012 |
| BL-047 (audit immutability) | TC-AUD-001/007/008 |
| BL-048 (audit coverage) | TC-AUD-002..006/011/012, TC-XCUT-007 |
| BL-LE-01..14 (leave encashment) | TC-LE-01..14 |

---

## § 10  Leave Encashment Test Cases (TC-LE-01..14)

All cases in `apps/api/src/modules/leave/__tests__/leave-encashment.test.ts` (Vitest unit tests).

| TC ID | BL Rule | Description | Expected result |
|-------|---------|-------------|-----------------|
| TC-LE-01 | BL-LE-01, BL-LE-04, BL-LE-05 | Employee submits Annual encashment inside window, has balance, Manager is Active | `201 Pending`; approverId = Manager; audit row written |
| TC-LE-02 | BL-LE-02 | Admin finalises with `daysApproved=10` but balance is 12 → max 50% = 6 | `daysApproved` clamped to 6 |
| TC-LE-03 | BL-LE-03 | Employee submits again for same year when `AdminFinalised` encashment already exists | `409 ENCASHMENT_ALREADY_USED` with `conflictId` |
| TC-LE-04 | BL-LE-04 | Submit request on February 15 (outside Dec-Jan window) | `409 ENCASHMENT_OUT_OF_WINDOW` |
| TC-LE-05 | BL-LE-05 | Submit when reporting Manager is `Exited` | approverId = Admin (fallback routing) |
| TC-LE-06 | BL-LE-14 | `escalateStaleEncashments` called with `Pending` row older than 5 working days | Status flips to `Escalated`; Admin notified |
| TC-LE-07 | BL-LE-06 | `adminFinaliseEncashment` | `LeaveBalance.daysRemaining` decremented; `daysEncashed` incremented inside same tx |
| TC-LE-08 | BL-LE-06 | Admin cancels an `AdminFinalised` encashment | Balance restored in same transaction |
| TC-LE-09 | BL-LE-09 | `findUnpaidAdminFinalisedForEmployee` | Returns `AdminFinalised` row for `year - 1`; returns null when none |
| TC-LE-10 | BL-LE-09, BL-LE-10 | `markEncashmentPaid` | Status → `Paid`; `paidInPayslipId` set; audit row `leave.encashment.pay` written |
| TC-LE-11 | BL-LE-07 | `adminFinaliseEncashment` when `daPaise` is null | Uses `basicPaise` only; no crash; rate = `basicPaise ÷ 26` |
| TC-LE-12 | BL-LE-11 | `markEncashmentReversed` | Audit row `leave.encashment.payment.reverse` written; balance NOT updated |
| TC-LE-13 | BL-LE-13 | `submitEncashmentRequest` for an `Exited` employee | `409 VALIDATION_FAILED` with `ruleId BL-LE-13` |
| TC-LE-14 | BL-LE-03 | Reject does not touch `LeaveBalance` | Balance unchanged; status → `Rejected` |

---

> Test cases are versioned alongside the SRS. Adding a new BL rule → add a test row + traceability link in the same PR.
