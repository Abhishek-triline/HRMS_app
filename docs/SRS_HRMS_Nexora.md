# Software Requirements Specification (SRS)
## HR Management System (HRMS) — Nexora Technologies Pvt. Ltd.

**Document Version:** 1.0  
**Date:** May 2026  
**Prepared by:** Abhishek Pundir  
**Confidential — For Internal Use Only**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Stakeholders & Roles](#2-stakeholders--roles)
3. [Pages & Screens (by Role)](#3-pages--screens-by-role)
4. [Features by Module](#4-features-by-module)
5. [Application Flow](#5-application-flow)
6. [Business Logic & Rules](#6-business-logic--rules)
7. [Use Cases](#7-use-cases)
8. [Do's and Don'ts](#8-dos-and-donts)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Out of Scope (Future Phases)](#10-out-of-scope-future-phases)
11. [Admin-Configurable Settings](#11-admin-configurable-settings)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the complete functional and non-functional requirements for the Nexora HRMS — a purpose-built HR Management System replacing the current spreadsheet, email, and manual payroll process. This document serves as the single source of truth for product design, development, and testing.

### 1.2 Problem Statement

Three documented failures drive this project:

| Failure | Impact |
|---|---|
| An employee on extended sick leave was paid twice | Financial loss; no payroll locking controls existed |
| Performance reviews were regularly skipped | Employees not evaluated; no tracking of review due dates |
| Payroll processing takes 4 working days every month | Operational inefficiency; manual data entry and cross-referencing |

### 1.3 Scope

The HRMS covers five modules:
- **Employee Management** — records, roles, hierarchy, statuses
- **Leave Management** — 6 leave types, balances, approvals, resets
- **Attendance Tracking** — check-in/out, late marks, regularisation
- **Payroll Processing** — monthly payslips, manual tax entry (v1), LOP, proration, locking
- **Performance Reviews** — half-yearly cycles, goals, ratings, audit trail

### 1.4 Constraints

- **Single Indian entity (v1)** — entity drives the fiscal calendar. **Country is modelled at the entity level**, so additional fiscal calendars (and a future multi-country roll-out) can be added without a redesign. For v1 the country is fixed to India and the fiscal calendar is April–March; multi-entity support is deferred.
- **No self-registration** — Admin creates all accounts
- **Web-based only** — no mobile app in this version
- **No external integrations** — standalone platform
- **No tax slab engine in v1** — PayrollOfficer enters tax manually per payslip; slab engine deferred to v2

### 1.5 Definitions

| Term | Definition |
|---|---|
| HR / Admin | The HR team uses Admin accounts. There is no separate HR role. Every "HR only" rule in the brief means "Admin only". |
| LOP | Loss of Pay — unpaid leave days deducted from gross pay |
| Regularisation | Formal process to correct a past attendance record |
| Event-based leave | Leave granted per event (e.g. childbirth) rather than as an annual quota — applies to Maternity & Paternity. Once consumed for an event, that allocation is closed. |
| Finalised payroll | A locked, immutable payroll run |
| Fiscal year | April 1 to March 31 (Indian fiscal calendar; entity-driven, fixed to India in v1) |
| EMP code | Unique employee code in format EMP-YYYY-NNNN |
| Notification | A system-generated, role-scoped, in-app alert produced by a qualifying event (leave / regularisation / payroll / performance / status / configuration). Always click-through to the originating record |

---

## 2. Stakeholders & Roles

### 2.1 Role Summary

| Role | Description | Key Capability |
|---|---|---|
| **Admin** | Full system access; acts as HR for all HR actions | Everything — user creation, payroll, configuration, approvals |
| **Manager** | Manages a team; approves leave and attendance | Team-scoped approvals, goal-setting, performance ratings |
| **Employee** | Regular staff member | Self-service — leave, check-in, payslip, self-review |
| **PayrollOfficer** | Handles payroll processing | Payroll runs, payslip review, report viewing |

### 2.2 Critical Role Rule

**Roles stack on top of an Employee record.** Every user is an Employee for leave, attendance, and payroll purposes. Manager and PayrollOfficer are additional capabilities layered on top. Admin is a system role that is also an Employee. There are no exemptions from the Employee rules.

### 2.3 Employee Code Format

Every employee receives a unique code: `EMP-YYYY-NNNN`  
- `YYYY` = 4-digit year of account creation  
- `NNNN` = 4-digit sequential number  
- Code is **never reused** — even after exit and re-join

### 2.4 Reporting Structure Rules

- Each employee has **at most one** reporting manager
- **No circular chains** — a manager cannot directly or indirectly report to any of their own subordinates
- Subordinates = all direct **and** indirect reports below a manager
- A **manager with no reporting manager** → Admin approves their leave

---

## 3. Pages & Screens (by Role)

### 3.1 Pages Accessible by All Roles (Role-Filtered Content)

| Page | Description |
|---|---|
| **Login** | Username/password login; password set on first login |
| **Dashboard** | Role-specific summary tiles and quick actions |
| **My Profile** | View own employee record (read-only for non-admin) |
| **Notifications** | Role-specific feed of in-app alerts (escalations, approvals, payroll milestones, review deadlines, status changes). Reachable from a notification bell in every page header. |

---

### 3.2 Admin Pages

| # | Page | Description |
|---|---|---|
| A-01 | **Dashboard** | Org-wide headcount, employees on leave today, pending approvals queue, payroll run status, review cycles due |
| A-02 | **Employee Directory** | Full list of all employees with filters (status, department, role, employment type) |
| A-03 | **Create Employee** | Form to create a new employee record and send first-login invitation |
| A-04 | **Employee Detail / Edit** | View and edit full employee record — personal info, role, salary structure, reporting manager, status |
| A-05 | **Employee Status Management** | Manually change employee status (Active → On-notice → Exited, etc.) |
| A-06 | **Leave Approval Queue** | Escalated leave requests + maternity leave requests awaiting Admin action |
| A-07 | **Leave Balance Management** | View and adjust leave balances per employee; configure carry-forward caps |
| A-08 | **Leave Configuration** | Set carry-forward caps per leave type, maternity/paternity duration limits, escalation period |
| A-09 | **Attendance Overview** | Full org attendance — present, absent, on-leave, late counts by day |
| A-10 | **Attendance Regularisation Queue** | Regularisation requests older than 7 days awaiting Admin approval |
| A-11 | **Payroll Runs** | List of all payroll runs with status (Draft, Processing, Review, Finalised) |
| A-12 | **Initiate Payroll Run** | Start a new monthly payroll run for a given month |
| A-13 | **Payroll Run Detail** | Review full payroll run — employee payslips, LOP, tax, totals |
| A-14 | **Finalise Payroll** | Two-step confirmation to lock a payroll run |
| A-15 | **Reverse Payroll** | Create a reversal record for a finalised payroll run (destructive; confirmation required) |
| A-16 | **Payslip Viewer** | View individual immutable finalised payslip (PDF) |
| A-17 | **Tax Settings (v1)** | View the standard reference formula and per-payslip manual entry policy. Slab engine deferred to v2 |
| A-18 | **Leave Quota Configuration** | Set leave days per employment type per leave type |
| A-19 | **Attendance Configuration** | Set late check-in threshold time (default 10:30 AM) and standard daily working hours (default 8h) |
| A-20 | **Performance Cycle Management** | Create, view, and close half-yearly performance review cycles |
| A-21 | **Performance Cycle Detail** | View all employee reviews in a cycle; see status (pending, submitted, locked) |
| A-22 | **Rating Distribution Report** | Ratings spread across departments for a given cycle |
| A-23 | **Missing Reviews Report** | Employees without a submitted review in the current cycle |
| A-24 | **Reversal History** | Log of all payroll reversals with timestamps and initiator |
| A-25 | **Notifications** | Admin-scoped feed: escalated leave requests, regularisations >7 days, payroll-run finalisation prompts, missing-review alerts, status-change events, configuration changes |
| A-26 | **Audit Log** | Unified, append-only system audit log spanning every module — user / hierarchy changes, leave decisions, attendance corrections, payroll runs and reversals, review-cycle actions, configuration changes. Filterable by module / user / action / date. Read-only; no edit or delete affordance (BL-047 / BL-048) |

---

### 3.3 Manager Pages

| # | Page | Description |
|---|---|---|
| M-01 | **Dashboard** | Team headcount, team attendance today, pending leave requests, upcoming review deadlines |
| M-02 | **My Team** | Two tabs — **Current Team** (all direct reports with status badges and quick links) and **Past Team Members** (read-only history of employees who previously reported to this manager — reassigned to a different manager or exited the company; retained for audit per BL-007 / BL-042) |
| M-03 | **Leave Approval Queue** | Pending leave requests from direct team — approve or reject with comments |
| M-04 | **Leave Request Detail** | Full leave request view: employee name, dates, leave type, balance impact, before action |
| M-05 | **Attendance Overview (Team)** | Team attendance for today and historical dates |
| M-06 | **Attendance Regularisation Queue** | Regularisation requests ≤ 7 days old from direct reports |
| M-07 | **Regularisation Request Detail** | View and approve/reject a single regularisation request |
| M-08 | **Performance — My Team Cycles** | Active and past review cycles for the team |
| M-09 | **Goal Setting Form** | Create and manage up to 5 goals per employee per cycle |
| M-10 | **Manager Rating Form** | Submit manager rating and comments for a direct report (until manager-review deadline) |
| M-11 | **My Leave** | Manager's own leave balances and request history |
| M-12 | **My Attendance** | Manager's own attendance history and check-in/out |
| M-13 | **My Payslips** | Manager's own payslip history |
| M-14 | **My Review** | Manager's own self-rating form and review status |
| M-15 | **Notifications** | Manager-scoped feed: pending leave / regularisation requests from team, manager-review deadline reminders, today's team-on-leave summary, goal-setting prompts at cycle start |

---

### 3.4 Employee Pages

| # | Page | Description |
|---|---|---|
| E-01 | **Dashboard** | Leave balance summary, attendance this month, latest payslip, active review cycle status |
| E-02 | **My Leave** | Leave balances per type, request history, and leave application form |
| E-03 | **Apply for Leave** | Form: leave type, start date, end date, reason (full days only; no half-day) |
| E-04 | **Leave Request Detail** | Status of a submitted request: pending, approved, rejected, cancelled |
| E-05 | **My Attendance** | Monthly attendance calendar — present, absent, late, on-leave, holiday, weekly-off |
| E-06 | **Check-In / Check-Out** | Single action button for daily check-in and mandatory check-out |
| E-07 | **Regularisation Request Form** | Submit a correction for a past attendance record |
| E-08 | **My Payslips** | List of all payslips with month/year; click to view PDF |
| E-09 | **Payslip Viewer** | Immutable payslip detail — all components, gross, tax, net pay |
| E-10 | **My Reviews** | Self-rating form for active cycle (editable until self-review deadline) |
| E-11 | **Self-Rating Form** | Submit rating and written comments; locked after deadline |
| E-12 | **Notifications** | Employee-scoped feed: leave-status updates, late-mark warnings before annual-leave deduction kicks in, payslip-ready alerts, self-review windows, regularisation outcomes, carry-forward applied |

---

### 3.5 Payroll Officer Pages

| # | Page | Description |
|---|---|---|
| P-01 | **Dashboard** | Current payroll run status, employees processed, pending finalisation, tax summary |
| P-02 | **Payroll Runs** | List of all payroll runs with status |
| P-03 | **Initiate Payroll Run** | Start a new monthly run (if no run exists for that month) |
| P-04 | **Payroll Run Detail** | Review run — all payslips, LOP days, tax totals, proration cases |
| P-05 | **Finalise Payroll** | Two-step confirmation modal showing full run summary before commit |
| P-06 | **Payslip Viewer** | View individual payslip in detail |
| P-07 | **Reversal History** | View log of all reversals (read-only) |
| P-08 | **Reports** | Download/view payroll-related reports |
| P-09 | **My Leave** | PayrollOfficer's own leave balances and requests |
| P-10 | **My Attendance** | PayrollOfficer's own attendance |
| P-11 | **My Payslips** | PayrollOfficer's own payslips |
| P-12 | **My Reviews** | PayrollOfficer's own self-rating form |
| P-13 | **Notifications** | Payroll-Officer-scoped feed: run-finalisation prompts, tax-rate updates, LOP-anomaly alerts, reversal events created by Admin, mid-month-joiner detections |

---

### 3.6 Authentication Pages (All Users)

| # | Page | Description |
|---|---|---|
| Auth-01 | **Login** | Email + password; redirects to role-appropriate dashboard |
| Auth-02 | **First Login / Set Password** | New employee sets their own password to activate account |
| Auth-03 | **Forgot Password** | Password reset flow |

---

## 4. Features by Module

### 4.1 Module 1 — Auth & User Management

| Feature | Description |
|---|---|
| Employee creation (Admin only) | Admin fills form: name, email, role, department, employment type, salary structure, reporting manager |
| Auto-generate EMP code | System assigns `EMP-YYYY-NNNN` on creation; never reused |
| First-login activation | Account inactive until employee sets password on first login |
| Role-based access control | Each role sees only their permitted navigation items and data |
| Employee status management | Active = default on creation. On-notice = Admin sets manually when notice is served. Exited = Admin sets on last working day. On-leave = **system-set** automatically while an approved leave is in progress |
| Reporting hierarchy management | Admin assigns/changes reporting manager; circular chain validation enforced |
| Historical record retention | Exited employee records kept permanently; nothing deleted |
| Re-join handling | New employee record + new code issued; old record untouched |
| Manager change handling | New manager takes future approvals; pending requests stay with old manager. If old manager has exited, pending requests route to **Admin** (decides directly or reassigns) |
| Employee directory | Searchable, filterable list of all employees (Admin) or team (Manager) |

---

### 4.2 Module 2 — Leave Management

| Feature | Description |
|---|---|
| Six leave types | Annual, Sick, Casual, Maternity, Paternity, Unpaid |
| Four employment types | Permanent (full quotas), Contract, Intern, Probation (reduced/pro-rated). Quota table is configurable per leave type per employment type |
| Leave balance tracking | Per employee, per leave type, per calendar year (Annual/Sick/Casual/Unpaid only) |
| Leave application | Employee submits: leave type, start date, end date, reason |
| Overlap prevention | Two leave requests from same employee with overlapping dates — blocked |
| Leave-attendance conflict detection | Overlapping leave + regularisation request — second submission rejected with specific error |
| Approval routing | Annual/Sick/Casual/Unpaid → reporting manager; Maternity & Paternity → Admin only (event-based); Manager with no manager → Admin |
| Approval escalation | If manager does not act within **5 working days** (configurable) → escalates to Admin (no auto-approval) |
| Leave cancellation | Before start: employee may cancel themselves. After start: only Manager or Admin (partial-day restoration needs review) |
| Balance deduction | On approval; restored on cancellation (full if before start; remaining days only if after start) |
| Annual reset (Jan 1) | Annual carry forward cap default 10 days; Casual default 5 days; Sick resets to zero; Maternity/Paternity not applicable |
| Carry-forward cap | Configurable **per leave type** (not per employment type). Defaults: Annual 10, Casual 5 |
| Event-based leaves | Maternity (up to 26 weeks per event) and Paternity (up to 10 working days per event, single block, must be claimed within 6 months of birth). Both Admin-approved. Once consumed for an event, that allocation is closed |
| No half-day leave | Leave is always in full-day units |
| Manager exit + pending approvals | If approving manager exits, pending requests route to **Admin** (decides directly or reassigns) |

---

### 4.3 Module 3 — Attendance Tracking

| Feature | Description |
|---|---|
| Daily attendance record | **Auto-generated at midnight** for every active employee; default status = absent. Contains: date, status, check-in time, check-out time, hours worked |
| Status overrides | Default absent → overridden by check-in (present, with late mark if applicable), approved leave (on-leave), weekend/holiday (weekly-off/holiday) |
| Check-in / Check-out | Employee action; check-out mandatory after check-in; hours auto-calculated (never self-reported) |
| Status priority | On-leave > Weekly-off/Holiday > Present > Absent |
| Late mark detection | Check-in after configured threshold (default 10:30 AM) = late mark |
| Late penalty | 3 late marks in calendar month = 1 full day deducted from annual leave; each additional late = 1 more day deducted |
| Regularisation request | Employee submits correction for past record; routed by age: ≤7 days → manager; >7 days → Admin |
| Leave-attendance conflict | Submitting regularisation for a date that has an approved leave request → rejected with specific conflict error |
| Holiday / weekly-off calendar | System tracks public holidays and weekends for status derivation |

---

### 4.4 Module 4 — Payroll Processing

| Feature | Description |
|---|---|
| Monthly payroll run | One run per employee per month; follows April–March fiscal year |
| Payslip components | Basic salary, allowances, deductions, gross pay, taxable income, tax, net pay |
| Tax (v1) | **Manual entry by PayrollOfficer** on each payslip. The system shows a standard formula (gross taxable income × flat reference rate) as a guide, but the value is editable. Configurable Indian slab engine deferred to v2 |
| LOP calculation | (Basic + Allowances) ÷ Working Days × LOP Days deducted from gross |
| Proration for mid-month joiners/exits | Salary proportional to days actually worked |
| Salary structure edit | Admin can edit; changes apply from **next** payroll run only; historical payslips unchanged |
| Payroll finalisation | Locks the run; payslips become immutable |
| Concurrent finalisation protection | If two users finalise the same run simultaneously, exactly one succeeds; other fails gracefully |
| Payroll reversal | Admin-only; creates a new reversal record; original payslip never modified |
| Payslip immutability | Once finalised, a payslip cannot be edited by anyone |
| Payroll locking | Finalised month is permanently locked; no changes allowed |

---

### 4.5 Module 5 — Performance Reviews

| Feature | Description |
|---|---|
| Two cycles per year | Cycle 1: April–September; Cycle 2: October–March |
| Cycle creation (Admin) | Admin defines: start date, end date, self-review deadline, manager-review deadline |
| Goal setting | Manager creates goals at cycle start (typically 3–5 per employee). Employee may propose additional goals during the self-review window. Each marked: Met, Partially Met, or Missed |
| Self-rating | Employee submits rating and comments; editable until self-review deadline |
| Manager rating | Manager submits rating and comments; editable until manager-review deadline |
| Final rating | Score 1–5; locked when Admin closes the cycle |
| Cycle closure | Admin closes cycle; all ratings locked; no further edits by anyone |
| Mid-cycle joiner skip | Employees joining mid-cycle skipped for that cycle; included from next full cycle |
| Manager change mid-cycle | New manager submits rating; system records both old and new manager for audit |
| Rating distribution report | Admin: ratings spread per department per cycle |
| Missing reviews report | Admin: employees without a submitted review in current cycle |

---

### 4.6 Module 6 — Notifications

| Feature | Description |
|---|---|
| In-app notification feed | Role-scoped feed surfaced from a bell in every page header. The bell displays an unread indicator (crimson dot) when at least one item is unread |
| System-generated events | Notifications are produced by system events: leave submitted / approved / rejected / escalated / cancelled, regularisation submitted / actioned, payroll run state changes, payslip finalised, payroll reversal created, performance cycle opened / closed, self-review and manager-review deadlines approaching, status changes (Active / On-Notice / Exited / On-Leave), late-mark thresholds reached, configuration changes |
| Role-aware visibility | Each role only sees notifications relevant to their scope: Admin sees org-wide events, Manager sees team-scoped events, Employee sees personal events, PayrollOfficer sees payroll-pipeline events. No cross-role exposure |
| Filters | Filter chips on the page: All, Unread, Approvals, Payroll, Performance, System |
| Mark as read | Per-item mark-as-read on click-through to the originating record; bulk Mark-all-as-read action |
| Click-through | Each notification links to the originating record (e.g. leave detail, payroll-run detail, regularisation queue) |
| Retention | Notifications retained for **90 days** (configurable). Audit-relevant events (approvals, payroll runs, reversals) remain permanently in the system audit log regardless |
| No external delivery (v1) | v1 ships in-app only — no email, SMS, push, or third-party integrations |

---

## 5. Application Flow

### 5.1 Login & First-Time Setup Flow

```
Admin Creates Employee
    → System generates EMP-YYYY-NNNN
    → Account created (inactive)
    → Invitation email sent to employee

Employee Opens Invitation Link
    → Set Password page (Auth-02)
    → Password set → Account activated
    → Redirect to role-appropriate Dashboard
```

### 5.2 Leave Request Flow

```
Employee submits leave request (Apply for Leave — E-03)
    ↓
System checks:
    • Overlap with existing leave? → Block
    • Overlap with regularisation request? → Reject with conflict error
    • Leave type = Maternity OR Paternity? → Route to Admin (event-based)
    • Manager exists? → Route to Manager | No Manager? → Route to Admin
    ↓
Request lands in Manager's Leave Approval Queue (M-03)
    ↓
Manager acts within 5 working days?
    YES → Approve / Reject → Employee notified
    NO  → Auto-escalate to Admin queue (A-06)
         → Admin approves/rejects → Employee notified
    ↓
On APPROVAL:
    • Deduct balance immediately (except Maternity/Paternity)
    ↓
On REJECTION:
    • No balance change; employee notified
    ↓
On CANCELLATION:
    • Before leave start → employee may cancel themselves → full balance restored
    • After leave has started → only Manager or Admin can cancel → only remaining days restored
```

### 5.3 Attendance Daily Flow

```
00:00 — System auto-generates an attendance row for every active employee
        (default status = absent)

Employee opens Check-In / Check-Out page (E-06)
    → Check-In recorded → today's row updated to "present"
    → System marks time; if > late threshold → late mark recorded

Late Mark Logic (per calendar month):
    3 late marks → 1 full day deducted from annual leave balance
    4th late mark → another 1 full day deducted
    Each additional → another 1 full day deducted

End of day:
    → Employee checks out → Hours worked auto-calculated

Status derivation (in priority order):
    1. Approved leave exists for day → On-leave
    2. Weekend or public holiday → Weekly-off / Holiday
    3. Check-in recorded → Present
    4. None of above → Absent
```

### 5.4 Attendance Regularisation Flow

```
Employee submits regularisation for a past date (E-07)
    ↓
System checks:
    • Approved leave exists for same period? → Reject with specific conflict error
    ↓
Record age?
    ≤ 7 days ago → Routed to employee's Manager (M-06)
    > 7 days ago → Routed to Admin (A-10)
    ↓
Approver acts → Record corrected | Rejected → Employee notified
```

### 5.5 Payroll Processing Flow

```
Admin / PayrollOfficer initiates payroll run for a month (A-12 / P-03)
    → Run created in Draft status
    ↓
System calculates for each employee:
    • Base salary from salary structure
    • Allowances
    • LOP days → (Basic + Allowances) ÷ Working Days × LOP Days
    • Proration if mid-month joiner or exit
    • Deductions
    • Tax (v1): system shows reference figure from standard formula; PayrollOfficer enters final tax manually per payslip
    • Net pay
    ↓
Run moves to Review status → Admin/PayrollOfficer reviews payslips (A-13 / P-04)
    ↓
Finalise Payroll (A-14 / P-05):
    → Two-step confirmation modal showing full run summary
    → Concurrent finalisation guard:
        • If two users submit simultaneously → exactly one succeeds; other fails gracefully
    → Run locked → All payslips immutable
    ↓
If correction needed post-finalisation:
    → Admin initiates Reversal (A-15)
    → New reversal record created
    → Original payslip untouched
```

### 5.6 Performance Review Flow

```
Admin creates review cycle (A-20):
    → Defines: start date, end date, self-review deadline, manager-review deadline
    ↓
Manager sets goals per employee at cycle start (M-09):
    → Typically 3–5 goals per employee
    ↓
Self-review period:
    Employee submits self-rating + comments (E-11)
    Employee may propose additional goals during this window — Manager reviews
    Editable until self-review deadline
    ↓
Manager-review period:
    Manager submits rating + comments (M-10)
    Editable until manager-review deadline
    ↓
Admin reviews rating distribution (A-22) and missing reviews (A-23)
    ↓
Admin closes the cycle (A-20):
    → Final ratings locked; no further edits by anyone
    → If manager changed mid-cycle: both old and new manager recorded on audit trail
```

### 5.7 Manager Change Flow

```
Admin changes employee's reporting manager
    ↓
New manager:
    • Takes ownership of ALL future approvals from change date
    • Can see all direct reports' pending future requests

Old manager:
    • Retains ownership of all PENDING requests submitted BEFORE change date
    • Must approve or reject those requests

If old manager has EXITED the company:
    • All their pending approval requests route to Admin
    • Admin can decide directly or reassign to another manager
    ↓
For performance reviews mid-cycle:
    • New manager submits the rating
    • System records BOTH old and new manager on review record for audit
```

---

## 6. Business Logic & Rules

### 6.1 Critical Rules (Non-Negotiable)

| Rule ID | Rule | Module |
|---|---|---|
| BL-001 | HR is not a separate role. The HR team uses Admin accounts. Every "HR only" rule means Admin only. | All |
| BL-002 | Each entity has a country; country drives the fiscal calendar. v1 ships India only (April–March). Multi-entity support deferred. | All |
| BL-003 | Fiscal calendar for India is always April–March. Not configurable. Does not depend on system clock. | Payroll |
| BL-004 | Roles stack: every user is an Employee. Manager and PayrollOfficer are additional capabilities; Admin is a system role plus Employee. | All |
| BL-005 | Subordinate = anyone in the manager's reporting tree, recursively. No circular chains allowed. | Users |
| BL-006 | Status transitions: Active = default on creation. On-notice = Admin manual when notice served. Exited = Admin sets on last working day. **On-leave = system-set automatically while approved leave is in progress**. | Users |
| BL-007 | Historical records are NEVER deleted. Exited employees' full history retained permanently. | All |
| BL-008 | Re-joining employees always get a new employee record and a new EMP code. Old record stays. | Users |
| BL-009 | Two leave requests from the same employee cannot overlap in dates. System blocks the second. | Leave |
| BL-010 | Leave + regularisation for the same period → second submission rejected with a SPECIFIC conflict error (not generic). | Leave/Attendance |
| BL-011 | No half-day leave. All leave is in full-day units. Three late marks in a calendar month deduct 1 full day from annual balance; each additional late = 1 more day. | Leave / Attendance |
| BL-012 | Sick leave does NOT carry forward on January 1 reset. Resets to zero. | Leave |
| BL-013 | Annual and Casual carry forward up to a cap configurable per leave type. Defaults: Annual = 10 days, Casual = 5 days. | Leave |
| BL-014 | Maternity and Paternity are **event-based** (not annual quotas). One allocation per event; once consumed, that allocation is closed. They neither reset nor carry forward. | Leave |
| BL-015 | Maternity leave approved by Admin only (not manager). Up to 26 weeks per event (configurable). | Leave |
| BL-016 | **Paternity leave approved by Admin only** (same flow as maternity). Up to **10 working days per event, single block, claimed within 6 months of the child's birth** (configurable). | Leave |
| BL-017 | A manager with no reporting manager — Admin approves their leave. | Leave |
| BL-018 | Leave approval escalation: if manager does not act within **5 working days** (default; configurable) → escalates to Admin. No auto-approval. | Leave |
| BL-019 | Leave cancellation: **before start — employee may cancel themselves; after start — only Manager or Admin** (partial-day restoration needs review). | Leave |
| BL-020 | Balance restoration: cancelled before start → full restore. Cancelled after start → remaining days only restored. | Leave |
| BL-021 | Balance deduction happens immediately on approval (not on leave start date). | Leave |
| BL-022 | Manager exit → pending approval requests **route to Admin** (decides directly or reassigns). | Leave/Attendance |
| BL-022a | A Manager's **My Team** screen retains a read-only "Past Team Members" view of employees who previously reported to them (reassigned to a different manager or exited). The Manager can no longer approve / reject for past members — those rights moved with the reporting line on the change date — but the historical record stays visible for audit (BL-007 retention, BL-042 review audit trail). | Users / Manager |
| BL-023 | Attendance records are **auto-generated at midnight** for every active employee with default status = absent; later overridden by check-in / approved leave / weekend / holiday. | Attendance |
| BL-024 | Check-out is mandatory once a check-in has been recorded. | Attendance |
| BL-025 | Hours worked = checkout time − check-in time (auto-calculated). | Attendance |
| BL-025a | Standard daily working hours is configurable by Admin via A-19 (default 8h). Used purely for display (e.g., "remaining hours" on the check-in panel and progress bars on attendance views). It does **not** drive deductions, overtime, or payroll — those remain governed by BL-025/BL-027/BL-028. | Attendance |
| BL-026 | Status derivation priority: On-leave > Weekly-off/Holiday > Present > Absent. | Attendance |
| BL-027 | Late mark = check-in after configured threshold (default 10:30 AM). | Attendance |
| BL-028 | 3 late marks in a calendar month → 1 full day deducted from annual leave. Each additional = 1 more day. | Attendance |
| BL-029 | Regularisation ≤ 7 days old → manager approves. >7 days → Admin only. | Attendance |
| BL-030 | Salary structure changes apply from next payroll run only. Not retroactive. | Payroll |
| BL-031 | Finalised payslips are immutable. Cannot be edited by anyone. | Payroll |
| BL-032 | Payroll reversal creates a new reversal record. Original payslip never modified or deleted. | Payroll |
| BL-033 | Only Admin can initiate a payroll reversal. | Payroll |
| BL-034 | Concurrent payroll finalisation: exactly one succeeds; the other fails gracefully. | Payroll |
| BL-035 | LOP formula: (Basic Salary + Allowances) ÷ Number of Working Days × Number of LOP Days. | Payroll |
| BL-036 | Mid-month joiner or exit: salary pro-rated based on days actually worked. | Payroll |
| BL-036a | **Tax (v1): manual entry by PayrollOfficer per payslip.** System shows a reference figure from a standard formula but the value is editable. Configurable Indian slab engine deferred to v2. | Payroll |
| BL-037 | Mid-cycle joiners (performance): skipped for that cycle; included from next full cycle. | Performance |
| BL-038 | Goals: Manager creates at cycle start (typically 3–5 per employee). **Employee may propose additional goals during the self-review window.** Each = Met / Partially Met / Missed. | Performance |
| BL-039 | Self-rating editable until self-review deadline. Not after. | Performance |
| BL-040 | Manager rating editable until manager-review deadline. Not after. | Performance |
| BL-041 | Once Admin closes cycle: final rating locked; no changes by anyone. | Performance |
| BL-042 | Manager change mid-cycle: new manager rates; both old and new manager recorded for audit. | Performance |
| BL-043 | Notifications are system-generated only. They are produced by qualifying events (leave / regularisation / payroll / performance / status / configuration changes). Users cannot author free-form notifications. | Notifications |
| BL-044 | Notification visibility is strictly role-scoped: Admin = org-wide events, Manager = team-scoped events, Employee = personal events, PayrollOfficer = payroll-pipeline events. No cross-role exposure. | Notifications |
| BL-045 | Notifications are retained for **90 days** (default; configurable by Admin). Audit-relevant events (approvals, payroll runs, reversals, status changes) remain permanently in the system audit log regardless of notification retention. | Notifications |
| BL-046 | v1 ships **in-app notifications only**. No email, SMS, push, or third-party delivery channels. | Notifications |
| BL-047 | The audit log is **system-generated and append-only**. No user — Admin included — can edit or delete an audit entry. Every approval, rejection, cancellation, finalisation, reversal, status change, and configuration change is captured against a specific user and timestamp. | All |
| BL-048 | Audit coverage spans **every module**: user creation / hierarchy changes, leave decisions, attendance corrections, payroll runs and reversals, and review-cycle actions (creation, goal-setting, ratings, closure). | All |

---

## 7. Use Cases

### 7.1 Auth & User Management

#### UC-001: Create Employee
- **Actor:** Admin
- **Precondition:** Admin is logged in
- **Flow:**
  1. Admin navigates to Employee Directory (A-02) → clicks Create Employee
  2. Fills: full name, email, role, department, employment type, reporting manager, salary structure
  3. System validates: no circular hierarchy with selected manager; email is unique
  4. System generates EMP code (EMP-YYYY-NNNN)
  5. Account created in Inactive state
  6. System sends invitation email with first-login link
- **Postcondition:** New employee record exists; account inactive until password set
- **Error cases:** Circular reporting chain detected → block creation with specific error

#### UC-002: First Login / Activate Account
- **Actor:** Employee (any role)
- **Precondition:** Admin has created account; employee received invitation
- **Flow:**
  1. Employee opens first-login link → Set Password page
  2. Sets a new password meeting requirements
  3. Account activated
  4. Redirected to role-appropriate dashboard
- **Postcondition:** Account is Active; employee can now log in normally

#### UC-003: Change Reporting Manager
- **Actor:** Admin
- **Flow:**
  1. Admin opens employee detail (A-04) → changes reporting manager
  2. System validates: new assignment does not create a circular chain
  3. System confirms: new manager takes future approvals; old manager retains pending requests
  4. If old manager has exited: pending requests transfer to new manager
- **Postcondition:** Reporting hierarchy updated; approval ownership correctly transferred

#### UC-004: Exit Employee
- **Actor:** Admin
- **Flow:**
  1. Admin changes employee status to Exited
  2. System retains all records permanently
  3. Employee can no longer log in
  4. If employee was a manager: pending approvals transfer to new manager of their direct reports
- **Postcondition:** Record retained; access revoked; pending approvals handled

---

### 7.2 Leave Management

#### UC-005: Apply for Leave
- **Actor:** Employee
- **Preconditions:** Employee is active; sufficient leave balance (for balance-based types)
- **Flow:**
  1. Employee opens Apply for Leave form (E-03)
  2. Selects leave type, start date, end date, enters reason
  3. System validates:
     - No overlap with existing approved/pending leave
     - No overlap with existing regularisation request for same dates
     - For Annual/Sick/Casual/Unpaid: sufficient balance exists
     - For Maternity/Paternity: employee meets eligibility
  4. Request submitted; status = Pending
  5. Routed to appropriate approver
- **Postcondition:** Leave request in Pending state; awaiting approval

#### UC-006: Approve / Reject Leave Request
- **Actor:** Manager (Annual / Sick / Casual / Unpaid) or Admin (Maternity / Paternity / escalated / Manager-with-no-manager)
- **Flow:**
  1. Approver opens Leave Approval Queue (M-03 / A-06)
  2. Views request details: employee, dates, leave type, current balance
  3. Approves or Rejects with comments
  4. **On Approve:** balance deducted immediately; employee notified
  5. **On Reject:** no balance change; employee notified
- **Postcondition:** Leave status = Approved or Rejected

#### UC-007: Cancel Leave
- **Actor:** Employee (only before start), Manager or Admin (any time)
- **Flow:**
  1. Initiator opens the leave request (approved or pending) and clicks Cancel
  2. System checks: has the leave start date passed?
     - **Not yet started** — Employee, Manager, or Admin may cancel → full balance restored
     - **Already started** — only Manager or Admin may cancel; Employee self-cancellation
       is blocked with a clear message → only remaining unused days restored
- **Postcondition:** Leave cancelled; balance partially or fully restored

#### UC-008: Leave Escalation
- **Actor:** System (automatic trigger)
- **Trigger:** Manager has not acted on a leave request within **5 working days** (default; configurable)
- **Flow:**
  1. System detects inaction past the 5-working-day window
  2. Request moved to Admin's approval queue
  3. Status updates to Escalated
  4. Admin approves or rejects (never auto-approved)
- **Postcondition:** No request is ever left without an owner

#### UC-009: Annual Leave Reset (January 1)
- **Actor:** System (scheduled job)
- **Flow:**
  1. On January 1, system processes all active employees
  2. Annual leave: carries forward up to the Annual cap (default 10 days); excess truncated
  3. Casual leave: carries forward up to the Casual cap (default 5 days); excess truncated
  4. Sick leave: reset to zero (no carry-forward)
  5. Maternity/Paternity: no action (event-based, no balances)
- **Postcondition:** All balances updated for new calendar year

---

### 7.3 Attendance

#### UC-010: Daily Check-In / Check-Out
- **Actor:** Employee
- **Precondition:** System has auto-generated today's attendance row at midnight (default status = absent)
- **Flow:**
  1. Employee opens Check-In/Out page (E-06) and checks in
  2. System updates today's row: status → present, records check-in time
  3. If check-in time > late threshold → late mark recorded
  4. Late mark count in month checked:
     - Count reaches 3 → 1 day deducted from annual leave
     - Each count beyond 3 → 1 additional day deducted
  5. End of day: employee checks out → hours worked auto-calculated
- **Postcondition:** Daily attendance record complete; rows for non-checked-in active employees remain "absent" unless overridden by approved leave / weekend / holiday

#### UC-011: Submit Regularisation Request
- **Actor:** Employee
- **Flow:**
  1. Employee opens Regularisation form (E-07), selects a past date
  2. System checks: no approved leave or pending leave for that date → proceed
  3. If leave exists for that date → reject with specific conflict error
  4. Request routed: ≤7 days → Manager; >7 days → Admin
  5. Approver reviews and approves/rejects
  6. On approval → attendance record corrected; original record preserved in audit log
- **Postcondition:** Attendance record corrected (or request rejected)

---

### 7.4 Payroll

#### UC-012: Initiate and Finalise Monthly Payroll
- **Actor:** Admin / PayrollOfficer
- **Precondition:** No existing finalised run for the month
- **Flow:**
  1. Initiate run for target month (A-12 / P-03) → status = Draft
  2. System calculates for each employee:
     - Gross = Basic + Allowances
     - LOP deduction = (Gross) ÷ Working Days × LOP Days
     - Pro-ration for joiners/exits mid-month
     - **Tax: standard reference figure shown; PayrollOfficer enters final tax manually per payslip**
     - Net pay (recomputed when tax is entered/edited)
  3. Run moves to Review → Admin/PayrollOfficer reviews each payslip and confirms tax entries
  4. Finalise: two-step confirmation modal displays full summary
  5. On submit: concurrent lock check → exactly one submission proceeds; other fails gracefully
  6. Status = Finalised → all payslips locked and immutable
- **Postcondition:** Month's payroll finalised and locked

#### UC-013: Reverse Payroll
- **Actor:** Admin only
- **Precondition:** A finalised payroll run exists
- **Flow:**
  1. Admin opens the finalised run (A-14) → clicks Reverse
  2. Destructive confirmation modal: states consequences clearly
  3. Admin confirms → system creates a new reversal record (separate entry)
  4. Original payslips remain untouched and still immutable
- **Postcondition:** Reversal record created; original run unchanged

#### UC-014: Enter Tax on Payslip (v1)
- **Actor:** PayrollOfficer (with Admin oversight)
- **Flow:**
  1. PayrollOfficer opens a payslip in the active payroll run (P-04)
  2. The system displays a reference tax figure derived from a standard formula
     (gross taxable income × flat reference rate)
  3. PayrollOfficer reviews and enters the final tax amount manually
  4. Net pay updates automatically
- **Postcondition:** Tax is captured on the payslip; locked once the run is finalised
- **Note:** A configurable Indian income tax slab engine is deferred to v2.

---

### 7.5 Performance Reviews

#### UC-015: Create Review Cycle
- **Actor:** Admin
- **Flow:**
  1. Admin opens Performance Cycle Management (A-20) → Create Cycle
  2. Sets: start date, end date, self-review deadline, manager-review deadline
  3. System validates dates are logical (start < end, deadlines within cycle window)
  4. Cycle created → status = Active
  5. Employees who joined after cycle start are marked as Mid-Cycle Joiner → skipped
- **Postcondition:** Cycle active; eligible employees included; mid-cycle joiners excluded

#### UC-016: Set Goals for Employee
- **Actor:** Manager (primary), Employee (may propose during self-review)
- **Flow:**
  1. Manager opens Goal Setting form (M-09) for an employee in active cycle
  2. Manager adds goals at cycle start (typically 3–5; name, description, expected outcome)
  3. During the self-review window, Employee may propose additional goals; Manager reviews
     and accepts/edits/rejects
  4. At cycle end, Manager marks each goal: Met / Partially Met / Missed
- **Postcondition:** Goals recorded and linked to employee-cycle

#### UC-017: Submit Self-Rating
- **Actor:** Employee
- **Precondition:** Active cycle; before self-review deadline
- **Flow:**
  1. Employee opens Self-Rating form (E-11)
  2. Submits rating and written comments
  3. Can edit until self-review deadline; locked after
- **Postcondition:** Self-rating recorded

#### UC-018: Submit Manager Rating
- **Actor:** Manager
- **Precondition:** Active cycle; before manager-review deadline
- **Flow:**
  1. Manager opens Manager Rating form (M-10) for a direct report
  2. Submits rating (1–5) and comments
  3. Can edit until manager-review deadline; locked after
  4. If manager changed mid-cycle: new manager submits; both old and new manager recorded
- **Postcondition:** Manager rating recorded with full audit trail

#### UC-019: Close Review Cycle
- **Actor:** Admin
- **Flow:**
  1. Admin opens cycle detail (A-21) → clicks Close Cycle
  2. Confirmation modal: consequences stated
  3. Admin confirms → all final ratings locked; no further edits by anyone
- **Postcondition:** Cycle closed; ratings immutable

---

## 8. Do's and Don'ts

### 8.1 System-Level Do's

| # | Do |
|---|---|
| D-01 | Always retain all historical records permanently — never delete payslips, attendance, leave, or review records |
| D-02 | Always validate circular hierarchy before any manager assignment change |
| D-03 | Always route maternity leave to Admin, not manager |
| D-04 | Always enforce the concurrent payroll finalisation guard (exactly one succeeds) |
| D-05 | Always create a new reversal record when correcting a finalised payroll |
| D-06 | Always use the specific conflict error message (not a generic error) when leave and regularisation overlap |
| D-07 | Always deduct leave balance on approval (not on leave start date) |
| D-08 | Always restore only remaining unused days when leave is cancelled after it has started |
| D-09 | Always follow the April–March fiscal calendar for all payroll cycles |
| D-10 | Always apply salary structure changes from the next payroll run, not retroactively |
| D-11 | Always record both old and new manager on a review when manager changes mid-cycle |
| D-12 | Always skip mid-cycle joiners for the current performance cycle |
| D-13 | Always calculate hours worked as checkout − check-in (system-calculated, not manual) |
| D-14 | Always route pending approvals to Admin when the old manager has exited (Admin decides directly or reassigns) |
| D-15 | Always require two-step confirmation for destructive actions (payroll finalisation, reversal, cycle close) |
| D-16 | Always display the consequence of a destructive action clearly in the confirmation modal |
| D-17 | Always generate a new EMP code for re-joining employees (never reuse old codes) |
| D-18 | Always allow Employee to cancel a leave **before** it starts; after start, only Manager or Admin may cancel |
| D-19 | Always escalate un-actioned leave requests to Admin after **5 working days** (default; configurable) |
| D-20 | Always enforce that check-out is mandatory once check-in is recorded |
| D-21 | Always surface qualifying events as in-app notifications and reflect unread count via the notification bell on every page header |
| D-22 | Always scope each notification to the role that owns the underlying event — never expose another role's data through a notification |

---

### 8.2 System-Level Don'ts

| # | Don't |
|---|---|
| DN-01 | **Don't** allow self-registration — all accounts must be created by Admin |
| DN-02 | **Don't** auto-change employee status for active / on-notice / exited — those are Admin-only manual transitions. (Exception: on-leave is system-set automatically while approved leave is in progress.) |
| DN-03 | **Don't** auto-approve escalated leave requests — escalated requests stay pending until Admin acts |
| DN-04 | **Don't** allow two overlapping leave requests from the same employee |
| DN-05 | **Don't** use a generic validation error for the leave + regularisation conflict — always use the specific conflict message |
| DN-06 | **Don't** allow half-day leave — leave is always in full-day units |
| DN-07 | **Don't** carry forward sick leave on January 1 reset |
| DN-08 | **Don't** track a balance for Maternity or Paternity leave — they are event-based, one allocation per event |
| DN-09 | **Don't** auto-deduct late marks on the same day — deduct when the 3rd (and each additional) mark threshold is crossed in a calendar month |
| DN-10 | **Don't** edit or delete a finalised payslip — corrections go through the reversal record process |
| DN-11 | **Don't** apply salary structure changes retroactively to previous payroll runs |
| DN-12 | **Don't** allow anyone other than Admin to initiate a payroll reversal |
| DN-13 | **Don't** allow final ratings to be edited after Admin closes a review cycle |
| DN-14 | **Don't** include mid-cycle joiners in the current performance review cycle |
| DN-15 | **Don't** let a manager report (directly or indirectly) to any of their own subordinates |
| DN-16 | **Don't** create attendance records on check-in only — the system pre-generates them at midnight for every active employee with default status = absent |
| DN-17 | **Don't** reuse an EMP code — even after exit, the code is retired permanently |
| DN-18 | **Don't** expose one role's navigation items or data to another role — strict role-based isolation |
| DN-19 | **Don't** allow employees to regularise attendance for a date where an approved leave already exists (without the specific conflict error) |
| DN-20 | **Don't** allow payroll to run on a non-April–March calendar — the fiscal year is fixed and not configurable |
| DN-21 | **Don't** ship the system without carry-forward defaults — defaults are Annual = 10 days, Casual = 5 days; Admin can change them |
| DN-22 | **Don't** force a fixed goal count — typical is 3–5 per employee per cycle; employees may also propose additional goals during the self-review window |
| DN-23 | **Don't** allow employee self-rating edits after the self-review deadline |
| DN-24 | **Don't** allow manager rating edits after the manager-review deadline |
| DN-25 | **Don't** delete an employee's records when they exit — retain everything permanently |
| DN-26 | **Don't** allow free-form / user-authored notifications — notifications are system-generated only, produced by qualifying events |
| DN-27 | **Don't** ship email, SMS, push, or third-party notification delivery in v1 — in-app only |

---

## 9. Non-Functional Requirements

### 9.1 UI Design System

#### Colour Palette

| Colour Name | Hex | Usage |
|---|---|---|
| Deep Forest Green | #1C3D2E | Primary CTAs, active nav, section headers |
| Emerald | #2D7A5F | Hover states, links, sub-headings |
| Mint | #C8E6DA | Info boxes, table row hovers |
| Soft Mint Accent | #E4F1EB | Table row alternates |
| Deep Charcoal | #1A2420 | Page titles, headlines only |
| Warm Slate | #4A5E57 | Body text, metadata |
| Off-White | #F6F8F7 | Page background |
| White | #FFFFFF | Card backgrounds, input fields |
| Deep Crimson | #C0392B | Error states, destructive buttons |
| Rich Green | #1A7A4A | Approved states, success |
| Warm Umber | #A05C1A | Pending / awaiting action states |

#### Status Badge Colours

| Status | Background | Text |
|---|---|---|
| Pending / Awaiting | #FAECD4 | #A05C1A |
| Approved | #D4F0E0 | #1A7A4A |
| Rejected | #FAE0DD | #C0392B |
| Active / On Leave | #C8E6DA | #1C3D2E |
| Exited | #E4EBE8 | #4A5E57 |
| Finalised | #D4F0E0 | #1A7A4A (+ lock icon) |
| Locked | #E4EBE8 | #1A2420 (+ lock icon) |
| On Notice | #FAECD4 | #A05C1A |
| Draft / In Progress | #FAECD4 | #A05C1A |

#### Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| H1 Page Title | Poppins | 32px | Bold 700 |
| H2 Section Heading | Poppins | 24px | Semi-Bold 600 |
| H3 Sub-heading | Inter | 18px | Semi-Bold 600 |
| Body Text | Inter | 16px | Regular 400 |
| Label / Meta | Inter | 13px | Medium 500 |
| Button Text | Inter | 14px | Semi-Bold 600 |
| Table Data | Inter | 14px | Regular 400 |

### 9.2 Layout & Responsiveness

| Breakpoint | Layout |
|---|---|
| 0–480px | Single column; bottom nav; stacked tiles; 16px margins |
| 481–767px | Single column; larger tap targets; 24px margins |
| 768–1023px | 2-column grids; sidebar hidden; 32px margins |
| 1024–1279px | Full sidebar; 2–3 column layouts; 48px margins |
| 1280–1439px | Full layout; 4-column dashboard tiles |
| 1440px+ | Max container 1280px, centred |

- **Sidebar:** 240px fixed desktop; collapses to 60px icon-only below 1024px
- **Top bar:** 60px desktop, 56px mobile; role badge with role-specific colour
- **Spacing base unit:** 8px — all spacing in multiples of 8

### 9.3 Accessibility

- WCAG AA minimum; AAA target where achievable
- All text meets minimum 4.5:1 contrast ratio
- All interactive elements accessible via Tab key
- Visible focus state: 2px Deep Forest Green outline on all backgrounds
- ARIA labels on all icon-only buttons
- ARIA live regions for dynamic updates (leave balance, payroll status, form errors)
- Semantic HTML: `header`, `nav`, `main`, `section` used correctly
- All data tables: correct `scope` attributes on header cells
- Date pickers fully keyboard-operable
- `prefers-reduced-motion` respected — animations disabled when set
- Touch targets minimum 44px on all mobile interactive elements

### 9.4 Interaction & Animation

- Micro-interactions: 150–250ms; page transitions: 300ms
- Easing: `ease-in-out` on all transitions
- Skeleton screens for all loading states (dashboards, tables, employee lists)
- Button loading: spinner replaces text; button non-interactive during submission
- Every destructive action (payroll reversal, cycle close, reject) requires a two-step modal with consequence clearly stated
- No blank screens — all empty states show a centred message

### 9.5 Performance

- Large data tables: paginated — max 50 rows per request
- Payslip PDFs: generated server-side
- Critical CSS inlined for faster first paint on dashboard screens
- Web fonts loaded with `font-display: swap`

### 9.6 Browser & Device Support

- **Desktop:** Chrome, Firefox, Safari, Edge — last 2 major versions
- **Mobile:** iOS Safari 14+, Chrome for Android — last 2 major versions
- **Minimum viewport:** 320px — no content clipped at this size
- **Graceful degradation:** core actions (leave request, check-in, approval) work without JavaScript

### 9.7 Data Integrity

- Every action produces a traceable audit record
- The audit log is **system-generated and append-only** — no user can edit or delete an audit entry, including Admin
- No record is ever deleted from the system. Exited employees retain all records permanently — payslips, leave history, attendance, reviews
- All records are associated with a specific user, timestamp, and action type
- Audit coverage spans every module: user / hierarchy changes, leave decisions, attendance corrections, payroll runs and reversals, and review-cycle actions
- Concurrent writes protected (payroll finalisation, hierarchy changes)

---

## 10. Out of Scope (Future Phases)

The following are explicitly out of scope for v1 and tracked as future-phase work. Where the architecture has already been prepared to absorb them without redesign, that is called out.

| Feature | Status | Notes |
|---|---|---|
| **Configurable Indian tax slab engine** | Deferred to v2 | v1 uses manual tax entry per payslip with a reference formula; the slab engine replaces this without changing the payslip data model |
| **Multi-country support** | Future phase | Country is already modelled at the **entity** level — additional fiscal calendars and per-country payroll rules can be added without redesign |
| **Half-day leave** | Future phase | Leave granularity is currently full-day only. The design can be extended to support half-day units |
| **Mobile application** | Future phase | Dedicated native apps for employee self-service. v1 is web-only |
| **Third-party integrations** | Future phase | Connectors to accounting / ERP / external payroll engines |
| **AI and analytics** | Future phase | AI-driven insights, anomaly detection, advanced HR reporting |
| **Email / SMS / push notification delivery** | Future phase | v1 ships in-app notifications only |
| Employee self-registration | **By design — never** | Admin-only account creation is intentional and not on any roadmap |
| User-authored notifications / broadcasts | **By design — never** | Notifications are system-generated only |
| Time-of-day demo dock on Check In / Out + Dashboard heroes | **Prototype-only — strip before ship** | A small "🌅 Morning · ☀️ Day · 🌇 Evening · 🌙 Night · ⟲ Live" pill (`#nx-tod-demo`) lets reviewers preview the four hero scenes manually. Lives on every role's dashboard greeting hero **and** the Check In / Out hero. Production UI relies only on the auto wall-clock swap (see [Design Document § 4 — Time-of-day Hero Scene](./hrms_design_document.md)) and must not include the demo controls |
| Check-in state preview dock on employee Check In / Out hero | **Prototype-only — strip before ship** | A small "⏰ Ready · ✓ Working · 🌙 Out" pill (`#nx-state-demo`) on the employee `checkin.html` page only, lets reviewers toggle between the three panel states without manipulating localStorage. Production UI picks the panel from today's attendance row (no check-in yet → Ready; check-in time present and no check-out → Working; check-out time present → Confirm) and must not include the demo controls |

---

## 11. Admin-Configurable Settings

| Setting | Description | Default |
|---|---|---|
| Leave carry-forward cap (Annual) | Max days that roll over for Annual leave | **10 days** |
| Leave carry-forward cap (Casual) | Max days that roll over for Casual leave | **5 days** |
| Late check-in threshold | Time after which check-in = late mark | 10:30 AM |
| Leave escalation period | Working days before un-actioned leave escalates to Admin | **5 working days** |
| Maternity leave duration | Maximum weeks for maternity leave per event | 26 weeks |
| Paternity leave duration | Maximum working days for paternity leave per event | **10 working days** (single block; must be claimed within 6 months of birth) |
| Standard tax reference rate | Flat reference rate used to suggest a tax figure on payslips (PayrollOfficer can override) | Set by Admin |
| Leave quotas | Days per leave type per employment type | Admin-set per (employment type × leave type) |
| Performance review cycle dates | Start date, end date, self-review deadline, manager-review deadline | Set per cycle by Admin |
| Notification retention period | Days an in-app notification is retained before pruning. Audit-relevant events remain in the audit log regardless | **90 days** |

**Fixed (Non-Configurable) by Design in v1:**
- Country: India (entity-driven; v1 ships India only — multi-entity deferred)
- Fiscal calendar: April 1 to March 31 (driven by the India entity)
- Employee code format: always EMP-YYYY-NNNN
- Sick leave carry-forward: always zero (never carries forward)
- Payroll frequency: always monthly
- Performance cycle frequency: always twice per year (half-yearly)
- Half-day leave: not supported (full-day units only)
- Tax engine: not in v1 — manual entry by PayrollOfficer per payslip

---

## § 7  Leave Encashment Business Rules (BL-LE-01..14)

These rules govern the Leave Encashment feature added in v1.1.

| Rule ID | Category | Description |
|---------|----------|-------------|
| BL-LE-01 | Eligibility | Only **Annual** (Earned) leave may be encashed. Sick, Casual, Maternity, Paternity, and Compensatory leave types are ineligible. |
| BL-LE-02 | Limit | At AdminFinalise the server clamps `daysApproved` to `floor(daysRemaining × maxPercent ÷ 100)`. Default `maxPercent = 50`. The employee's `daysRequested` is advisory; the server is the source of truth. |
| BL-LE-03 | Quota | An employee may have at most **one** encashment in status `ManagerApproved`, `AdminFinalised`, or `Paid` per calendar year. Multiple `Pending` or `Rejected`/`Cancelled` rows are allowed. The constraint is enforced at the application layer (MySQL cannot express a partial unique index). |
| BL-LE-04 | Window | Encashment requests may only be submitted within a configurable window. Default: **December 1 to January 15** of the following year (crosses the calendar year boundary). Configurable via `ENCASHMENT_WINDOW_START_MONTH`, `ENCASHMENT_WINDOW_END_MONTH`, `ENCASHMENT_WINDOW_END_DAY` in the `configuration` table. Submissions outside the window return `409 ENCASHMENT_OUT_OF_WINDOW`. |
| BL-LE-05 | Routing | Encashment approval mirrors the leave routing for Annual leave. If the employee has an Active reporting Manager, the request goes to that Manager first (`Pending → ManagerApproved → AdminFinalised`). If there is no Manager, or the Manager is Exited/On-Leave, the request routes directly to Admin. |
| BL-LE-06 | Balance | The Annual leave balance (`LeaveBalance.daysRemaining` and `daysEncashed`) is decremented **at AdminFinalise**, not at submit time. If an `AdminFinalised` encashment is subsequently cancelled, the balance is restored in the same transaction. Balance is NOT restored on payslip reversal (BL-LE-11). |
| BL-LE-07 | Rate | `ratePerDayPaise = (basicPaise + daPaise) ÷ workingDaysInPayingMonth`. DA is optional; if `daPaise` is null or zero it is treated as zero. At AdminFinalise an approximate rate is locked using `APPROX_WORKING_DAYS = 26`. At payroll-engine time the actual working-days count for the paying month is used and the locked rate/amount are updated to the actual values. |
| BL-LE-08 | Snapshot | `ratePerDayPaise` and `totalAmountPaise` are locked on the `LeaveEncashment` row at AdminFinalise. These serve as the committed liability. The payroll engine may update them to the actual paying-month values when it marks the encashment `Paid`. |
| BL-LE-09 | Payroll | During monthly payroll finalisation the engine queries `AdminFinalised` encashments where `year = run.year - 1` and `status = AdminFinalised`. Each qualifying encashment is included in the employee's payslip: `encashmentPaise` is added to `grossPaise` before tax. The encashment is marked `Paid` (with `paidInPayslipId`) inside the same transaction as payslip creation. |
| BL-LE-10 | Audit | Every state transition on a `LeaveEncashment` row writes an append-only `audit_log` entry with actor, timestamp, action (e.g. `leave.encashment.submit`, `leave.encashment.approve`, `leave.encashment.finalise`, `leave.encashment.pay`, `leave.encashment.reject`, `leave.encashment.cancel`), before snapshot, and after snapshot. |
| BL-LE-11 | Reversal | When a payslip that carried an encashment (`encashmentId != null`) is reversed, the reversal payslip carries a **negative** `encashmentPaise`. The encashment record receives a `leave.encashment.payment.reverse` audit entry. The Annual leave balance is NOT restored — the encashment is considered consumed. |
| BL-LE-12 | Tax | Encashment payout is added to `grossPaise` before tax computation. It is therefore taxable income in the month it is paid. Tax calculation remains manual in v1 (BL-036a applies). |
| BL-LE-13 | Exited | An employee in `Exited` status cannot submit an encashment request. Admin cannot finalise an encashment if the employee's status has transitioned to `Exited` between submission and finalisation. Both checks return `409 VALIDATION_FAILED` with `ruleId: BL-LE-13`. |
| BL-LE-14 | Escalation | Encashment requests in `Pending` or `ManagerApproved` status older than the configured `escalationPeriodDays` (default 5 working days) are flipped to `Escalated` status and a notification is sent to all Admin users. The sweep runs hourly alongside the leave escalation sweep. NEVER auto-approves. |

### Configuration keys (Leave Encashment)

| Key | Default | Type | Description |
|-----|---------|------|-------------|
| `ENCASHMENT_WINDOW_START_MONTH` | `12` | int | Month number (1-12) when the submission window opens |
| `ENCASHMENT_WINDOW_END_MONTH` | `1` | int | Month number when the submission window closes |
| `ENCASHMENT_WINDOW_END_DAY` | `15` | int | Day of month (inclusive) when the window closes |
| `ENCASHMENT_MAX_PERCENT` | `50` | int | Maximum percentage of remaining Annual balance that can be encashed |

---

*End of Document*  
*Version 1.1 — May 2026 — Nexora Technologies Pvt. Ltd.*
