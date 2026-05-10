# Nexora HRMS — Process Flows

This document walks through every major business process in the HRMS, with proper flowcharts, sequence diagrams, state diagrams, and step-by-step explanations. The final section answers the question of how the **Admin/HR** themselves are handled (since every role is also an Employee).

> **Diagrams use Mermaid.** They render natively in GitHub, GitLab, VS Code (Mermaid extension), Notion, Obsidian, and most modern markdown viewers.
>
> **Diagram conventions:**
> - **Stadium** `( … )` — Start / End
> - **Rectangle** `[ … ]` — Process step
> - **Diamond** `{ … }` — Decision
> - **Parallelogram** `[/…/]` — Input / Output
> - **Hexagon** `{{ … }}` — System action
> - **Cylinder** `[( … )]` — Persisted record
> - **Colour coding:** mint = employee action · forest = admin · emerald = manager · umber = system · crimson = error / block · sage = neutral

---

## Table of Contents

1. [Role Model — "Every Role Is An Employee"](#1-role-model--every-role-is-an-employee)
2. [Employee Registration & Onboarding](#2-employee-registration--onboarding)
3. [Daily Attendance](#3-daily-attendance)
4. [Leave Management](#4-leave-management)
5. [Monthly Payroll](#5-monthly-payroll)
6. [Performance Reviews — Half-Yearly Cycles](#6-performance-reviews--half-yearly-cycles)
7. [Admin Self-Service — How HR Handles HR](#7-admin-self-service--how-hr-handles-hr)
8. [Edge Cases & Operational Rules](#8-edge-cases--operational-rules)
9. [Notifications](#9-notifications)
10. [Account Access — First Login & Forgot Password](#10-account-access--first-login--forgot-password)
11. [Audit Log](#11-audit-log)

---

## 1. Role Model — "Every Role Is An Employee"

Four roles exist in the system. Each Manager, PayrollOfficer, and Admin sits on top of an underlying **Employee record** and is subject to the same leave, attendance, and payroll rules (BL-004).

```mermaid
flowchart TB
    EMP[("Employee Record<br/>EMP-YYYY-NNNN<br/>name · email · salary<br/>employment type")]

    EMP -->|stacks on| ADMIN[["Admin capability<br/>full system access<br/>= HR"]]
    EMP -->|stacks on| MGR[["Manager capability<br/>team approvals"]]
    EMP -->|stacks on| PO[["PayrollOfficer capability<br/>payroll runs"]]
    EMP -->|stacks on| EE[["Plain Employee<br/>self-service only"]]

    ADMIN -.->|sees| ADASH[/"Admin Dashboard<br/>+ My Leave / Attendance<br/>/ Payslips / Reviews"/]
    MGR   -.->|sees| MDASH[/"Manager Dashboard<br/>+ My Leave / Attendance<br/>/ Payslips / Review"/]
    PO    -.->|sees| PDASH[/"Payroll Dashboard<br/>+ My Leave / Attendance<br/>/ Payslips / Review"/]
    EE    -.->|sees| EDASH[/"Employee Dashboard"/]

    classDef rec fill:#E4F1EB,stroke:#1C3D2E,stroke-width:2px,color:#1A2420;
    classDef cap fill:#C8E6DA,stroke:#2D7A5F,stroke-width:1.5px,color:#1A2420;
    classDef ui  fill:#F6F8F7,stroke:#C0CEC8,stroke-width:1px,color:#4A5E57;
    class EMP rec;
    class ADMIN,MGR,PO,EE cap;
    class ADASH,MDASH,PDASH,EDASH ui;
```

**Implication.** Admin Priya Sharma still has leave balances, attendance records, and a payslip every month. PayrollOfficer Demo User must apply for leave like anyone else. A Manager who has no reporting manager needs Admin to approve their own leave (BL-017).

---

## 2. Employee Registration & Onboarding

Only Admin can create employees. There is no self-registration (DN-01).

### 2.1 Account creation flow

```mermaid
flowchart TD
    Start([Start]) --> A[/"Admin opens<br/>A-03 Create Employee"/]
    A --> B[/"Fill: name, email, role,<br/>department, employment type,<br/>reporting manager,<br/>salary structure"/]
    B --> C{Email<br/>unique?}
    C -- No --> E1[Reject:<br/>email already exists]:::err
    C -- Yes --> D{Reporting manager<br/>creates a circular chain?<br/>BL-005}
    D -- Yes --> E2[Reject:<br/>circular hierarchy<br/>DN-15]:::err
    D -- No --> F{{System generates<br/>EMP-YYYY-NNNN<br/>never reused}}:::sys
    F --> G[("Account created<br/>status = INACTIVE")]:::rec
    G --> H{{Send invitation email<br/>with first-login link}}:::sys
    H --> I([Onboarding pending])

    E1 --> END1([End — not created])
    E2 --> END1

    classDef err fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

### 2.2 First-login activation

```mermaid
sequenceDiagram
    autonumber
    actor E as Employee
    participant M as Email
    participant S as System
    participant DB as Account DB

    Note over S,DB: Status = Inactive after creation
    M->>E: Invitation link (Auth-02)
    E->>S: Click link → Set Password page
    E->>S: Submit new password
    S->>S: Validate password policy
    S->>DB: Persist password hash<br/>Update status → Active
    S-->>E: Redirect to role-appropriate dashboard
    Note over E,S: Account is now usable
```

### 2.3 Employee status lifecycle

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Active : Admin creates<br/>employee

    Active --> OnLeave : System auto-set<br/>(approved leave starts)
    OnLeave --> Active : System auto-clear<br/>(leave ends)

    Active --> OnNotice : Admin (manual)<br/>notice served
    OnNotice --> Exited : Admin (manual)<br/>last working day
    Active --> Exited : Admin (manual)<br/>direct exit

    Exited --> [*] : All records<br/>retained permanently
    note right of OnLeave
        Both On-leave transitions
        are system-set (BL-006).
        Active is also automatic:
        default on creation, and
        restored when leave ends.
    end note
    note right of Exited
        EMP code never reused
        even on rejoin (DN-17)
    end note
```

**Key rules**

| Rule | What it means |
|---|---|
| EMP code | Always `EMP-YYYY-NNNN`. Never reused — even after exit + rejoin (BL-008, DN-17). |
| Default status | `Active` on creation; `Inactive` only until first password set. |
| No circular reporting | Manager cannot directly or indirectly report to a subordinate (BL-005, DN-15). |
| Re-joiners | Get a brand-new record + new EMP code; old record preserved (BL-007/008). |

---

## 3. Daily Attendance

### 3.1 Midnight pre-generation job

```mermaid
flowchart LR
    T([00:00 daily<br/>cron]):::sys --> L[For every<br/>Active employee]
    L --> R[("Insert attendance row<br/>date = today<br/>status = Absent<br/>BL-023")]:::rec
    R --> D([Done])

    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

> Records are pre-generated at midnight, **not** on check-in (DN-16). Missing check-ins automatically appear as "absent" without a separate scan.

### 3.2 Status derivation cascade (BL-026)

The pre-generated row's status is overridden by the highest-priority condition that applies:

```mermaid
flowchart TD
    Start([Resolve status<br/>for date D]) --> Q1{Approved leave<br/>covers D?}
    Q1 -- Yes --> S1[Status = On-leave]:::leave
    Q1 -- No --> Q2{D is weekend<br/>or public holiday?}
    Q2 -- Yes --> S2[Status = Weekly-off<br/>or Holiday]:::off
    Q2 -- No --> Q3{Check-in<br/>recorded for D?}
    Q3 -- Yes --> Q4{Check-in time<br/>after threshold?<br/>default 10:30 AM}
    Q4 -- Yes --> S3[Status = Present<br/>+ LATE mark]:::late
    Q4 -- No --> S4[Status = Present]:::present
    Q3 -- No --> S5[Status = Absent<br/>default — BL-023]:::absent

    classDef leave   fill:#C8E6DA,stroke:#1C3D2E,color:#1A2420;
    classDef off     fill:#E4EBE8,stroke:#4A5E57,color:#1A2420;
    classDef present fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef late    fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef absent  fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
```

### 3.3 Check-in / Check-out (with late-mark logic)

```mermaid
flowchart TD
    In([Employee clicks Check-In at T1]) --> Mark[/"Status = Present<br/>checkInTime = T1"/]:::sys
    Mark --> Late{"T1 > late threshold?<br/>(default 10:30 AM)"}
    Late -- No --> Work[("Working")]:::ok
    Late -- Yes --> AddMark[/"Add late mark"/]:::sys
    AddMark --> Count{"3rd late mark<br/>this month?"}
    Count -- No --> Work
    Count -- Yes --> Deduct[/"Deduct 1 full day from Annual<br/>BL-028 · notify employee"/]:::err
    Deduct --> Work
    Work --> Out([Employee clicks Check-Out at T2])
    Out --> Save[/"checkOutTime = T2<br/>hoursWorked = T2 − T1 · BL-025"/]:::sys

    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef err fill:#F4D4D8,stroke:#A41E2A,color:#1A2420;
```

**Late penalty (BL-028)**

| Late marks in calendar month | Deduction from Annual leave |
|---|---|
| 1, 2 | none |
| 3 | **1 full day** |
| 4 | +1 full day (running total: 2) |
| 5 | +1 full day (running total: 3) |
| n (≥3) | n − 2 days |

> Half-day deductions do not exist (BL-011, DN-06).

### 3.4 Regularisation flow (correcting a past day)

```mermaid
flowchart TD
    Start([Employee submits<br/>regularisation for date D]) --> V{Approved leave<br/>covers D?}
    V -- Yes --> Block[/"Reject with SPECIFIC<br/>conflict error<br/>BL-010 / DN-19"/]:::err
    V -- No --> Age{D is more than<br/>7 days old?}
    Age -- No --> Mgr[("Routes to<br/>Manager Queue M-06")]:::mgr
    Age -- Yes --> Adm[("Routes to<br/>Admin Queue A-10<br/>BL-029")]:::adm
    Mgr --> Decide{Approver<br/>decides}
    Adm --> Decide
    Decide -- Approve --> Apply{{"Apply correction<br/>NEW row created<br/>original preserved"}}:::sys
    Decide -- Reject --> Notif[/"Notify employee<br/>no change to record"/]
    Apply --> End([End])
    Notif --> End
    Block --> End

    classDef err fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
    classDef mgr fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
```

---

## 4. Leave Management

### 4.1 Leave types — at a glance

| Type | Quota model | Carry-forward (Jan 1) | Approver |
|---|---|---|---|
| Annual | Yearly, per employment type | Up to **10 days** (configurable) | Manager |
| Sick | Yearly, per employment type | **Resets to zero** (BL-012, DN-07) | Manager |
| Casual | Yearly, per employment type | Up to **5 days** (configurable) | Manager |
| Unpaid | No quota; deducted from gross pay | n/a | Manager |
| Maternity | Event-based, up to **26 weeks per event** | n/a (BL-014) | **Admin only** (BL-015) |
| Paternity | Event-based, up to **10 working days per event**, single block, within 6 months of birth | n/a (BL-014) | **Admin only** (BL-016) |

### 4.2 Apply → Validate → Route → Decide (swim-lane)

```mermaid
flowchart TD
    Start([Employee submits leave]) --> V{Validation}
    V -- "Overlap with leave/reg<br/>OR insufficient balance" --> Block[/"Reject with named conflict<br/>BL-009 / BL-010"/]:::err
    V -- "Pass" --> Route{Leave type?}
    Route -- "Maternity / Paternity" --> Adm([Admin Queue A-06]):::adm
    Route -- "Other" --> HasMgr{"Reporting manager?"}
    HasMgr -- Yes --> Mgr([Manager Queue M-03]):::mgr
    HasMgr -- No --> Adm
    Mgr & Adm --> SLA{"Approver acts in<br/>5 working days?"}
    SLA -- No --> Esc[/"Escalate to Admin<br/>BL-018 — no auto-approval"/]:::adm
    SLA -- Yes --> D{Decision}
    Esc --> D
    D -- Reject --> Notify[/"Notify employee"/]
    D -- Approve --> Effect[/"Deduct balance (BL-021)<br/>+ flip status on start/end (BL-006)"/]:::sys

    classDef err fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
    classDef mgr fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
```

### 4.3 Cancellation rules (BL-019, BL-020)

```mermaid
flowchart TD
    Start([Cancel request<br/>initiated]) --> Q{Has the leave<br/>already started?}
    Q -- No --> P1["Allowed: Employee, Manager, or Admin"]:::ok
    P1 --> R1{{"Restore FULL balance"}}:::sys
    Q -- Yes --> P2["Only Manager or Admin allowed<br/>employee self-cancel BLOCKED — D-18"]:::block
    P2 --> R2{{"Restore only<br/>REMAINING unused days"}}:::sys
    R1 --> End([End])
    R2 --> End

    classDef ok    fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef block fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
    classDef sys   fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
```

### 4.4 Annual reset on January 1

```mermaid
flowchart LR
    T([Jan 1 00:00<br/>scheduled job]):::sys --> Loop[For every<br/>Active employee]
    Loop --> A[Annual:<br/>carry forward up to 10 days<br/>excess truncated]
    Loop --> C[Casual:<br/>carry forward up to 5 days<br/>excess truncated]
    Loop --> Sk[("Sick:<br/>RESET TO ZERO<br/>BL-012, DN-07")]:::reset
    Loop --> MP[("Maternity / Paternity:<br/>NO ACTION<br/>event-based, no balance")]

    classDef sys   fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef reset fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
```

---

## 5. Monthly Payroll

Payroll runs once per month for every employee. The fiscal calendar is fixed at **April → March** (BL-002, BL-003).

### 5.1 Run state machine

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Draft : Admin / PayrollOfficer<br/>initiates run
    Draft --> Processing : System computes<br/>gross, LOP, proration,<br/>reference tax
    Processing --> Review : All payslips ready
    Review --> Review : PayrollOfficer enters<br/>final tax per payslip<br/>(BL-036a)
    Review --> Finalised : Two-step confirm<br/>concurrent guard<br/>(BL-034)
    Finalised --> Reversed : Admin reverses<br/>creates new<br/>reversal record<br/>(BL-032 / 033)
    Finalised --> [*] : Locked permanently<br/>payslips immutable<br/>(BL-031)
```

### 5.2 End-to-end run flow

```mermaid
flowchart TD
    A([Admin / PO initiates run for month M]):::adm --> Draft[("Status = Draft")]:::rec
    Draft --> Calc[/"System computes per Active employee:<br/>Gross · LOP (BL-035) · proration (BL-036) · reference tax"/]:::sys
    Calc --> Review[("Status = Review")]:::rec
    Review --> PO[/"PayrollOfficer enters FINAL tax<br/>per payslip — BL-036a"/]:::po
    PO --> Final[/"Click Finalise · 2-step confirm"/]
    Final --> Lock{"Concurrent guard<br/>BL-034"}
    Lock -- This wins --> Done[("Finalised — all payslips<br/>IMMUTABLE · BL-031")]:::rec
    Lock -- Lost --> Fail[/"'Already finalised by X at HH:MM'<br/>fail gracefully"/]:::err

    classDef adm  fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef po   fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef sys  fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef rec  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef err  fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
```

### 5.3 Manual tax entry (v1 — BL-036a)

```mermaid
sequenceDiagram
    autonumber
    actor PO as PayrollOfficer
    participant UI as Payslip P-04
    participant SYS as System
    participant DB as Run DB

    PO->>UI: Open payslip
    UI->>SYS: Fetch gross taxable income
    SYS->>UI: Show reference =<br/>gross × flat reference rate
    UI-->>PO: Display reference + editable tax field
    PO->>UI: Type final tax amount<br/>(may differ from reference)
    UI->>SYS: Save tax
    SYS->>DB: Persist tax
    SYS->>SYS: Recompute Net Pay
    SYS-->>UI: Updated Net Pay
    Note over PO,DB: Slab engine deferred to v2
```

### 5.4 Reversal flow (Admin only — BL-032 / BL-033)

```mermaid
flowchart TD
    Start([Correction needed<br/>after finalisation]) --> Who{Initiator}
    Who -- Admin --> Open[/"Open finalised run A-14<br/>click Reverse"/]
    Who -- Anyone else --> Block[/"BLOCKED — BL-033"/]:::err
    Open --> Modal[/"Destructive confirmation modal<br/>states consequences clearly<br/>D-15 / D-16"/]
    Modal --> Conf[Admin confirms]
    Conf --> NewRec[("Create NEW reversal record<br/>original payslip NEVER edited<br/>BL-032 / DN-10")]:::rec
    NewRec --> Hist[("Visible in<br/>Reversal History A-24")]:::rec
    Hist --> End([End])
    Block --> End

    classDef err fill:#FAE0DD,stroke:#C0392B,color:#1A2420;
    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

### 5.5 Salary structure changes (BL-030 / DN-11)

> Edits to an employee's salary apply from the **next** payroll run only. Already-finalised payslips remain immutable.

```mermaid
flowchart LR
    A([Admin edits salary<br/>on Employee record]) --> B[/"New basic / allowances<br/>saved as effective from<br/>next run start"/]:::adm
    B --> C{"Run for current month<br/>already finalised?"}
    C -- Yes --> D["Current month payslip<br/>UNCHANGED — immutable<br/>BL-031"]:::ok
    C -- No, run is Draft / In Progress --> E["Apply new structure<br/>when run is computed"]:::sys
    D --> N([Next month's run<br/>uses new structure])
    E --> N

    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

> **Never retroactive.** A mid-month raise does not regenerate or top up an already-finalised payslip; the change is visible from the next monthly run only. Adjustments for the gap (if any) are handled procedurally outside the system.

---

## 6. Performance Reviews — Half-Yearly Cycles

### 6.1 The two cycles per fiscal year

```mermaid
gantt
    title Two performance review cycles per fiscal year
    dateFormat  YYYY-MM-DD
    axisFormat  %b
    section FY 2026-27
    Cycle 1 (Apr–Sep)   :active, c1, 2026-04-01, 2026-09-30
    Cycle 2 (Oct–Mar)   :        c2, 2026-10-01, 2027-03-31
    section Within Cycle 1
    Self-review window  :crit, sw, 2026-08-01, 2026-09-15
    Manager-review window :crit, mw, 2026-09-01, 2026-09-30
```

### 6.2 Cycle lifecycle (state diagram)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Draft : Admin sets dates<br/>A-20 / UC-015
    Draft --> Active : Cycle starts<br/>(start date reached)

    state Active {
        [*] --> GoalsOpen : Manager creates<br/>3–5 goals per employee
        GoalsOpen --> SelfWindow : Self-review<br/>window opens
        SelfWindow --> SelfWindow : Employee edits<br/>(BL-039)
        SelfWindow --> SelfLocked : self-review deadline<br/>passes (DN-23)
        SelfLocked --> MgrWindow : Manager-review<br/>window opens
        MgrWindow --> MgrWindow : Manager edits<br/>(BL-040)
        MgrWindow --> MgrLocked : manager-review deadline<br/>passes (DN-24)
    }

    Active --> Closed : Admin closes cycle<br/>UC-019
    Closed --> [*] : Final ratings<br/>LOCKED PERMANENTLY<br/>(BL-041 / DN-13)
```

### 6.3 End-to-end cycle flow (swim-lane)

```mermaid
flowchart LR
    A1[/"Admin creates cycle<br/>(start, end, deadlines)"/]:::adm --> Skip{{"System skips mid-cycle<br/>joiners · BL-037"}}:::sys
    Skip --> M1[/"Manager sets 3–5 goals"/]:::mgr
    M1 --> E1[/"Employee submits self-rating<br/>+ may propose extra goals"/]:::emp
    E1 --> M2[/"Manager submits rating<br/>1–5 + goal scoring"/]:::mgr
    M2 --> A2[/"Admin reviews distribution<br/>+ chases missing reviews"/]:::adm
    A2 --> A3[/"Admin closes cycle"/]:::adm
    A3 --> Lock[("Final ratings LOCKED<br/>BL-041")]:::rec

    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef mgr fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef emp fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef sys fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef rec fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

### 6.4 What a review captures

| Field | Filled by | Editable until |
|---|---|---|
| Goals (3–5 typical) | Manager (Employee may propose extra in self-review window) | Cycle end |
| Goal status (Met / Partial / Missed) | Manager | Cycle end |
| Self-rating + comments | Employee | Self-review deadline |
| Manager rating (1–5) + comments | Manager | Manager-review deadline |
| Final rating | Locked at cycle close (typically equal to manager rating) | Locked when Admin closes cycle |

### 6.5 Manager change mid-cycle (BL-042)

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant SYS as System
    participant REV as Review Record
    actor M1 as Old Manager (Anita)
    actor M2 as New Manager (Rajan)

    Note over REV: Cycle is in progress
    A->>SYS: Reassign Employee X<br/>to new manager
    SYS->>REV: previousManager = Anita<br/>currentManager = Rajan
    Note over REV: Both names retained for audit
    M2->>REV: Submit manager rating<br/>(only Rajan can rate)
    REV-->>A: Audit trail shows BOTH<br/>Old + New manager
```

---

## 7. Admin Self-Service — How HR Handles HR

How are Admin / Manager / PayrollOfficer themselves handled? The principle: every role stacks on top of an Employee record (BL-004), so Admin Priya Sharma is an employee with the **same** flows — except where her chain rolls up to Admin itself.

### 7.0 Quick map — who handles Admin's Leave / Attendance / Payslip / Review

```mermaid
flowchart TD
    A([Admin needs to:]):::adm
    A --> L[Leave]:::adm
    A --> R[Regularisation]:::adm
    A --> P[Payslip]:::adm
    A --> V[Review]:::adm

    L --> LQ[("Admin Queue A-06<br/>peer Admin decides · BL-017")]:::adm
    R --> RAge{"Age ≤ 7 days?"}
    RAge -- Yes --> RM[Admin's manager · else Admin Queue]:::mgr
    RAge -- No --> RA[("Admin Queue A-10 · BL-029")]:::adm
    P --> PRun[("Generated in monthly run<br/>· locked when finalised")]:::pay
    V --> VHas{"Has manager?"}
    VHas -- Yes --> VM[Manager rates · §6 flow]:::mgr
    VHas -- No --> VP[Self-rate / peer Admin / exclude]:::adm

    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef mgr fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef pay fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

| Flow | Who handles |
|---|---|
| **Leave** | Admin Queue → peer Admin (or self if sole Admin); audit-logged |
| **Attendance regularisation** | ≤7 days: reporting manager (if any); >7 days: Admin Queue → peer Admin |
| **Payslip** | Generated in the same monthly run; PayrollOfficer enters tax; Admin or PO finalises; locked permanently |
| **Performance review** | Reporting manager (if any) → standard §6 flow; if no manager: procedural — self / peer Admin / skip |

The detailed flows for each are in §7.1 – §7.5 below.

### 7.1 Admin's own attendance

```mermaid
flowchart LR
    A([Admin Priya logs in]) --> B[/"Same Check-In page<br/>as everyone else"/]
    B --> C[("Attendance row updated<br/>same midnight cron applies<br/>BL-023")]
    C --> D{Late mark?}
    D -- Yes --> E["Same penalty<br/>3 lates → 1 full day<br/>deducted (BL-028)"]
    D -- No --> F([End])
    E --> F
```

> No special handling. The Admin sidebar carries **My Attendance**, **My Leave**, **My Payslips**, **My Reviews** alongside admin actions. Same for Manager and PayrollOfficer.

### 7.2 Admin's leave approval

```mermaid
flowchart TD
    Start([Admin Priya<br/>submits leave]) --> Q{Priya has a<br/>reporting manager?}
    Q -- Yes --> Mgr[("Routes to that<br/>manager's queue<br/>standard flow §4.2")]:::mgr
    Q -- No — typical for Admin --> Adm[("Routes to<br/>Admin Queue A-06<br/>BL-017")]:::adm
    Adm --> Who{Who acts?}
    Who -- "Peer Admin" --> Decide
    Who -- "Self-approve (sole Admin case)" --> Decide
    Decide{{"Approve / Reject<br/>action timestamped<br/>+ initiator audit-logged"}}:::sys
    Mgr --> Decide

    classDef mgr fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
```

**Why this works.** The HR team typically has multiple Admin accounts (BL-001 — HR = Admin). When Admin Priya's leave hits the queue, a peer Admin can approve it. If she's the sole Admin, she may approve her own request — but every action is timestamped and auditable (D-04 / §9.7).

### 7.3 Admin's regularisation

Same age-based routing as anyone else (BL-029):

| Days old | Routed to |
|---|---|
| ≤ 7 days | Admin's reporting Manager (if any) |
| > 7 days | Admin Queue A-10 — peer Admin acts on it |

If Admin has no reporting manager, **all** their regularisations go directly to the Admin queue.

```mermaid
flowchart TD
    Start([Admin submits regularisation<br/>for date D]) --> Age{"Age = today − D<br/>> 7 days?"}
    Age -- "No (≤ 7 days)" --> Mgr{Admin has<br/>reporting manager?}
    Age -- "Yes (> 7 days)" --> Queue["Admin Queue A-10<br/>peer Admin decides"]:::adm
    Mgr -- Yes --> RM["Mgr approves / rejects<br/>standard manager flow"]:::mgr
    Mgr -- No --> Queue
    RM --> Done([Decision recorded<br/>+ audit entry])
    Queue --> Done

    classDef mgr fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

### 7.4 Admin's payroll

Admin's payslip is generated as part of the same monthly run as everyone else.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin (Priya)
    actor PO as PayrollOfficer
    participant SYS as System
    participant DB as Payroll DB

    Note over SYS: Monthly run covers ALL Active employees, incl. Admin
    SYS->>SYS: Compute gross, LOP, pro-ration<br/>for every employee (incl. Priya)
    PO->>SYS: Open Priya's payslip<br/>enter manual tax (BL-036a)
    SYS->>DB: Persist tax + Net Pay

    A->>SYS: Click Finalise (A-14)
    Note over SYS: Concurrent guard (BL-034)
    SYS->>DB: Lock run + ALL payslips (incl. Priya's)
    DB-->>A: Status = Finalised
    Note over A,DB: Priya's payslip is now immutable too
```

> If Admin reverses their own payslip later: technically allowed (BL-033 says Admin-only — and Admin is themselves an Admin), but it creates a **separate** reversal record (BL-032), the original is never edited, and the action shows up in Reversal History A-24 with the Admin's name. Governance on top of the system is a procedural matter, not a system rule.

### 7.5 Admin's performance review

```mermaid
flowchart TD
    Start([Cycle starts]) --> Q{Does Admin have a<br/>reporting manager?}
    Q -- Yes --> M["That manager:<br/>• creates goals<br/>• submits manager rating<br/>standard flow §6.3"]
    Q -- No, reports to no-one --> Skip{Procedural option}
    Skip --> O1[Option A:<br/>Admin self-rates only<br/>self-rating becomes final]
    Skip --> O2[Option B:<br/>Peer Admin or company head<br/>submits manager rating]
    Skip --> O3[Option C:<br/>Admin excluded from cycle<br/>by Admin choice]
    M --> Close[("Final rating LOCKED<br/>when Admin closes cycle<br/>BL-041")]
    O1 --> Close
    O2 --> Close
    O3 --> Close
```

The system itself doesn't block any of A/B/C. It enforces the deadlines and locking rules from §6.

### 7.6 PayrollOfficer's own payroll

Two safeguards:

1. **Finalise is two-eyes.** P-05 has the same two-step modal as A-14 — the PO can review their own payslip but the run is locked by the same finalise step.
2. **Concurrent guard (BL-034).** If Admin and PayrollOfficer click Finalise simultaneously, exactly one wins; the other fails gracefully.

```mermaid
flowchart LR
    Run[("Monthly run<br/>includes PO's own payslip")]:::rec --> Tax[/"PO enters manual tax<br/>on own payslip · BL-036a"/]:::po
    Tax --> Final[/"Either PO or Admin<br/>clicks Finalise · 2-step confirm"/]
    Final --> Guard{{"Concurrent guard<br/>BL-034 — one wins"}}:::sys
    Guard --> Lock[("Run + all payslips IMMUTABLE<br/>including PO's own · BL-031")]:::rec

    classDef po  fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef sys fill:#C8E6DA,stroke:#2D7A5F,color:#1A2420;
    classDef rec fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

### 7.7 Manager-with-no-manager — chain rolls up to Admin

| Workflow | Manager-with-no-manager flows to... |
|---|---|
| Leave approval | Admin (BL-017) |
| Regularisation > 7 days | Admin (default) |
| Regularisation ≤ 7 days | Admin (no other manager exists) |
| Performance review | Admin handles goals & rating |
| Payslip review | PayrollOfficer + Admin in monthly run |

```mermaid
flowchart TD
    M([Manager — no reporting<br/>manager configured]) --> Need{What did<br/>Mgr submit?}
    Need -- Leave request --> L["BL-017: route to Admin Queue<br/>regardless of leave type"]:::adm
    Need -- Regularisation --> R["Both ≤7 and >7 days flow<br/>to Admin Queue<br/>(no other approver exists)"]:::adm
    Need -- Performance --> P["Admin sets Mgr's goals<br/>+ submits Mgr rating §6"]:::adm
    Need -- Payslip query --> PR["PayrollOfficer in run<br/>+ Admin signs off A-14"]:::adm
    L --> Q["Admin Queue A-06 / A-10"]:::adm
    R --> Q
    P --> Done([Cycle locked when<br/>Admin closes BL-041])
    PR --> Done2([Run finalised — locked])
    Q --> Done3([Decision + audit])

    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

> Net effect: a Manager who reports to no-one is treated by the system exactly the same as any other Employee whose chain ends at the Admin tier. Nothing falls through.

---

## 8. Edge Cases & Operational Rules

### 8.1 Manager change mid-cycle (BL-022 / D-14)

```mermaid
flowchart LR
    Reassign([Admin reassigns<br/>employee to new manager]) --> Future["Mgr B handles<br/>ALL future approvals"]:::ok
    Reassign --> Pending["Pending requests submitted<br/>BEFORE change date<br/>STAY with Mgr A"]:::warn
    Pending --> Q{Mgr A still active?}
    Q -- Yes --> Act["Mgr A approves / rejects<br/>those pending"]:::ok
    Q -- No (exited) --> Esc["Route to Admin<br/>Admin decides directly<br/>or reassigns to Mgr B"]:::adm

    classDef ok   fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef warn fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef adm  fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

**Past team members are still visible to the previous manager** for audit (BL-022a). Mgr A's *My Team* screen (M-02) retains a read-only **"Past Team Members"** tab listing every employee who used to report to them — whether reassigned to another manager or exited the company — so the historical reporting line stays visible even though Mgr A can no longer act on those people's leave / attendance / reviews.

### 8.2 Concurrent finalisation (BL-034)

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    actor P as PayrollOfficer
    participant SYS as System
    participant DB as Run DB

    par Race condition
        A->>SYS: Finalise run R
    and
        P->>SYS: Finalise run R
    end

    SYS->>DB: Acquire row-level lock on R
    DB-->>SYS: Lock acquired (one wins)
    Note over SYS: Only ONE submission proceeds
    SYS-->>A: ✓ Run finalised
    SYS-->>P: ✗ "Already finalised by<br/>Priya at 14:32:01"
```

### 8.3 Leave + regularisation conflict (BL-010 / DN-19)

The system rejects the **second** submission with a **specific** conflict error message — never a generic validation error. Example:

> *"An approved Annual Leave (L-2026-0118) already covers 28 May 2026. You cannot regularise a date already taken as approved leave. Cancel the leave first if the record needs correcting."*

```mermaid
flowchart TD
    Sub([User submits Leave OR Regularisation<br/>for date D]) --> Check{Existing record on D?}
    Check -- "None" --> OK[/"Accept submission<br/>continue normal flow"/]:::ok
    Check -- "Approved Leave on D" --> EReg{"Submission is<br/>regularisation?"}
    Check -- "Pending/Approved Reg on D" --> ELeave{"Submission is<br/>leave?"}

    EReg -- Yes --> RegBlock["BLOCK with NAMED conflict:<br/>'Approved leave L-… already covers D.<br/>Cancel the leave first.'"]:::err
    EReg -- No --> OK
    ELeave -- Yes --> LeaveBlock["BLOCK with NAMED conflict:<br/>'Regularisation R-… already covers D.<br/>Resolve the regularisation first.'"]:::err
    ELeave -- No --> OK

    RegBlock --> Cancel{User cancels<br/>existing leave?}
    Cancel -- Yes --> ReSub([Re-submit regularisation])
    Cancel -- No --> Stop([No action — D unchanged])
    LeaveBlock --> Stop

    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef err fill:#F4D4D8,stroke:#A41E2A,color:#1A2420;
```

> The error message **always** names the conflicting record by ID so the user knows exactly which leave / regularisation to deal with first.

### 8.4 Re-joining after exit (BL-008 / DN-17)

```mermaid
flowchart LR
    A[("Employee exits<br/>EMP-2024-0042")]:::rec --> B[("Old record retained<br/>with full history<br/>BL-007 / DN-25")]:::rec
    B --> C([Years later, rejoin]) --> D[("NEW record:<br/>EMP-2027-0312")]:::rec
    D --> E[("Old record stays<br/>code 0042 NEVER reused")]:::rec

    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

### 8.5 No half-day leave (BL-011 / DN-06)

All leave is full-day units only. Late-mark penalties also deduct full days, never half-days.

### 8.6 Audit and historical data (BL-047 / BL-048 / D-01 / §9.7)

| What | Rule |
|---|---|
| Payslips | Immutable once finalised. Never deleted. |
| Attendance corrections | Original record preserved; correction added as new entry. |
| Reversals | New reversal record; original payslip untouched. |
| Manager changes (review) | Both old and new manager recorded. |
| Exited employees | All records retained permanently. |
| Audit log entries | **System-generated and append-only.** No user — Admin included — can edit or delete an entry. |
| Audit coverage | Spans every module: user/hierarchy changes, leave decisions, attendance corrections, payroll runs and reversals, review-cycle actions. |

> Every action produces a traceable audit record with user, timestamp, and action type (§9.7). See §11 for the full audit-write flow.

---

## 9. Notifications

Every role has a dedicated `notifications.html` feed that is **role-scoped** — admins, managers, employees, and payroll officers each see only the events relevant to them. Notifications are not opt-in: they are a side-effect of system events.

### 9.1 Notification generation flow

```mermaid
flowchart LR
    Event([System event]) --> Resolve[/"Pick recipients<br/>by event type"/]:::sys
    Resolve --> Persist[(Persist notification<br/>+ link to source record)]:::rec
    Persist --> Bell["Header bell shows red dot<br/>until feed opened"]:::ok
    Persist -.-> Retain{{"Retained 90 days<br/>then archived"}}:::sys

    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

The "pick recipients by event type" step uses this lookup:

| Trigger | Recipient(s) |
|---|---|
| Leave submitted | Reporting manager (or Admin if none) |
| Leave approved / rejected / cancelled | Requesting employee |
| 5-day timeout (BL-018) | Admin (also auto-escalates) |
| Regularisation submitted | Manager (≤7 d) or Admin (>7 d) — BL-029 |
| Regularisation actioned | Employee |
| Late mark · 2nd in month | Employee — warning |
| Late mark · 3rd+ in month | Employee — penalty applied |
| Payroll run state change | PayrollOfficer + Admin |
| Payslip finalised | Employee |
| Payslip reversed | Affected employee + Admin |
| Cycle opened / closed | Managers + employees in scope |
| Self-review window 7 d / 1 d before deadline | Employee |
| Manager-review window 7 d / 1 d before deadline | Manager |
| Status change (Active / On-Notice / Exited / On-Leave) | Employee + Admin |
| Carry-forward applied (Jan 1) | Employee |
| Configuration change (A-19 / A-20) | All Admins |

### 9.2 Per-role coverage

| Role | What they see |
|---|---|
| **Employee** | Leave-status updates, late-mark warnings, payslip-ready, self-review windows, regularisation outcomes, carry-forward applied, status changes |
| **Manager** | Pending team approvals, review-deadline reminders, today's team-on-leave summary, escalations from their team |
| **Admin** | Escalations (BL-018), finalisation prompts, reversal events, configuration changes, status changes across the org |
| **PayrollOfficer** | Run finalisation prompts, tax-rate updates, LOP anomalies, reversal events affecting payroll |

### 9.3 Retention

Notifications retain for **90 days**. Audit-relevant events (approvals, payroll runs, reversals, status changes) are kept permanently in the audit log — see §11.

---

## 10. Account Access — First Login & Forgot Password

Two flows govern how a user gets into the system.

### 10.1 First login (post-creation)

```mermaid
flowchart TD
    Create([Admin creates employee · D-02]):::adm --> Mail[/"System emails temp credentials<br/>+ first-login link"/]:::sys
    Mail --> Visit([Employee opens first-login page])
    Visit --> Try[/"Enter temp credentials"/]
    Try --> V{Valid?}
    V -- No --> Retry[/"Reject · increment counter<br/>5 wrong = 15 min lockout"/]:::err
    V -- Yes --> Reset[/"Force password reset<br/>(≥8 chars, mixed)"/]:::sys
    Reset --> Save[("Hash · persist · clear temp flag")]:::rec
    Save --> Dash([Redirect to role dashboard]):::ok

    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef err fill:#F4D4D8,stroke:#A41E2A,color:#1A2420;
    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

### 10.2 Forgot password / account recovery

```mermaid
flowchart TD
    Start([User clicks 'Forgot password']) --> Form[/"Enter registered email<br/>or EMP code"/]
    Form --> Submit{System finds<br/>active user?}
    Submit -- No --> Generic["Show GENERIC success message:<br/>'If an account exists, an email was sent'<br/>(no enumeration leak)"]:::ok
    Submit -- Yes --> Token[("Generate single-use token<br/>+ 30 min expiry")]:::sys
    Token --> Mail["Email reset link to<br/>user's registered address"]:::sys
    Mail --> Click([User clicks link])
    Click --> Valid{Token valid<br/>+ unexpired?}
    Valid -- No --> Expired["Show: 'Link expired —<br/>request a new one'"]:::err
    Valid -- Yes --> Reset[/"New password form<br/>(≥8 chars, not last 3)"/]
    Reset --> Save[("Hash + persist<br/>invalidate token<br/>invalidate active sessions")]:::rec
    Save --> Login([Redirect to login])

    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef err fill:#F4D4D8,stroke:#A41E2A,color:#1A2420;
    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
```

> **Security choices.** The "we always show success" branch on a missing account prevents account enumeration. Tokens expire in 30 min and are single-use. A successful reset invalidates all active sessions for that user (forces re-login on every device).

---

## 11. Audit Log

Per BL-047 / BL-048, every state-changing action in the system writes an immutable audit entry. Admins can read the log via A-26, but **no user — including Admin — can edit or delete entries**.

### 11.1 Audit write flow

```mermaid
flowchart LR
    A([Any state-changing<br/>action in any module]) --> Hook{Captured by<br/>audit hook}
    Hook --> Build[/"Build entry:<br/>• actor (user, role, IP)<br/>• timestamp<br/>• action type<br/>• target record (id, module)<br/>• before / after snapshot"/]
    Build --> Persist[(Append to<br/>audit_log table<br/>append-only)]:::rec
    Persist --> Index["Index by: actor, target,<br/>timestamp, module"]:::sys
    Index --> Read["A-26 Audit Log page<br/>read-only view + filters"]:::adm
    Persist -.-> NoEdit{{"DB constraint:<br/>UPDATE / DELETE<br/>denied — even Admin"}}:::err

    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef sys fill:#FAECD4,stroke:#A05C1A,color:#1A2420;
    classDef adm fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef err fill:#F4D4D8,stroke:#A41E2A,color:#1A2420;
```

### 11.2 What gets logged

| Module | Actions captured |
|---|---|
| User & hierarchy | Create / activate / deactivate employee, change role, change reporting manager, status change (Active / On-Notice / Exited / On-Leave) |
| Leave | Submit, approve, reject, cancel, escalate, balance adjustment (carry-forward, late penalty) |
| Attendance | Check-in, check-out, late mark, regularisation submit / approve / reject |
| Payroll | Run create, compute, lock, finalise, reverse, manual tax entry, salary structure edit |
| Performance | Cycle open / close, goal create / edit, self-rating submit, manager rating submit, manager change mid-cycle |
| Configuration | Late threshold change (A-19), standard daily hours change (A-19 / BL-025a), holiday calendar edit, leave-policy edit, escalation timeout change |
| Authentication | Login success / failure, password reset, lockout, session invalidation |

### 11.3 Why correction events are recorded as new entries (not edits)

For attendance regularisations and payroll reversals, the **original** record is never mutated. Instead the system writes a separate correction / reversal record and links the two via the audit log. This preserves a complete history without losing any prior state.

```mermaid
flowchart LR
    Orig[("Original record<br/>e.g. payslip P-2026-04")] -->|"audit: 'reversed by'"| Rev[("New reversal record<br/>P-2026-04-R1")]:::rec
    Orig -. "never mutated<br/>BL-031 / BL-032" .- Lock{{Immutable}}:::ok

    classDef rec fill:#E4F1EB,stroke:#1C3D2E,color:#1A2420;
    classDef ok  fill:#D4F0E0,stroke:#1A7A4A,color:#1A2420;
```

---

## Appendix — Approver Cheat-Sheet

| Process | Standard approver | Special cases |
|---|---|---|
| Annual / Sick / Casual / Unpaid leave | Reporting Manager | No-manager → Admin · 5-day timeout → Admin (BL-018) |
| Maternity leave | **Admin only** | — (BL-015) |
| Paternity leave | **Admin only** | — (BL-016) |
| Regularisation ≤ 7 days | Reporting Manager | No-manager → Admin |
| Regularisation > 7 days | **Admin only** | — (BL-029) |
| Payroll finalisation | Admin or PayrollOfficer | Concurrent guard (BL-034) |
| Payroll reversal | **Admin only** | Always creates a new reversal record (BL-032 / 033) |
| Cycle creation / closure | **Admin only** | — |
| Goal-setting | Reporting Manager | Employee may propose during self-review window (BL-038) |
| Manager rating | Reporting Manager | Manager-change mid-cycle: new manager rates; both recorded (BL-042) |

---

*See [SRS_HRMS_Nexora.md](./SRS_HRMS_Nexora.md) for full requirements and rule IDs (BL-xxx / DN-xxx / D-xx).*
