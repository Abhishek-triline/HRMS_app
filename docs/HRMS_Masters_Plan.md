# Masters Page (Admin) — Implementation Plan

**Status:** **DRAFTED — NOT YET STARTED.** This document captures the scope, schema impact, API surface, and frontend design for a unified Masters management page on the Admin panel. No code, schema, or contract change has been made.
**Authoring rule:** Same as the Leave Encashment plan — every decision lands here first; implementation only after sign-off.

---

## 1. Requirement (verbatim, owner)

> Add a new tab Masters for admin panel only after Configuration in the sidebar. It should show all our master tables that will be editable and we can add new rows / delete — basically the modern industry flow for the master tables.

---

## 2. Interpretation & Decisions

### 2.1 What counts as a "master table" in v2

There are six lookup tables today:

| Table | Schema model | Seeded with frozen IDs? | Code branches on the ID? |
|---|---|---|---|
| Roles | `Role` | ✅ 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin | ✅ Yes (≈140 references) |
| Employment Types | `EmploymentType` | ✅ 1=Permanent, 2=Contract, 3=Probation, 4=Intern | ✅ Yes (leave-quota allocation, payroll proration) |
| Genders | `Gender` | ✅ 1=Male, 2=Female, 3=Other, 4=PreferNotToSay | ⚠️ Used in form validation; low risk |
| Leave Types | `LeaveType` | ✅ 1=Annual, 2=Sick, 3=Casual, 4=Unpaid, 5=Maternity, 6=Paternity | ✅ Yes (≈21 references — carry-forward reset, Admin-only routing, balance rules) |
| Departments | `Department` | ❌ Free-form, grows over time | ❌ No ID branches |
| Designations | `Designation` | ❌ Free-form, grows over time | ❌ No ID branches |

The `AuditModule` table is also a master but is purely a label store for the audit log — no UI surface needed in v1; admin can read it via the audit-log filter.

### 2.2 Why full CRUD is not safe across the board

Allowing **delete** or **add** on the frozen-ID tables would silently break business rules tied to those IDs. Concretely:

- Delete role "Admin" → `requireRole(RoleId.Admin)` still evaluates against the integer 4. The row is gone; the gate still checks 4; no admin can authorise anything.
- Delete leave type "Sick" → carry-forward job branches `if (leaveTypeId === LeaveTypeId.Sick)` against the integer 2. The row is gone; carry-forward silently ignores it.
- Add a new role "Director" with no capability mapping → user with `roleId=5` fails every `requireRole(...)` gate. They can log in but have no working surface.

**Rename is always safe** because the ID never changes. Only the display label updates.

### 2.3 v1 scope decision (sign-off pending)

| Master | Add row | Rename | Delete | UI affordance |
|---|---|---|---|---|
| **Department** | ✅ | ✅ | ✅ (with in-use guard) | Editable table |
| **Designation** | ✅ | ✅ | ✅ (with in-use guard) | Editable table |
| **Role** | ❌ | ✅ | ❌ | Rename-only; Add/Delete buttons disabled with tooltip *"System-managed — rules depend on this row's ID. Rename the label only."* |
| **Employment Type** | ❌ | ✅ | ❌ | Same |
| **Gender** | ❌ | ✅ | ❌ | Same |
| **Leave Type** | ❌ | ✅ | ❌ | Rename-only. Carry-forward caps and event-based flags remain on `/admin/leave-config`. |

This is the **"safe Masters"** mode — ship-able without touching any business-rule code path.

### 2.4 Future: full-CRUD capability-flag refactor (deferred)

To enable Add/Delete on the frozen tables, the system must stop branching on IDs and start branching on capability flags persisted on the master row. Outline (separate effort, ~1–2 weeks):

- Schema changes:
  - `Role` → add `scope` enum (`admin` / `manager` / `payroll_officer` / `employee`) **or** a set of boolean capability columns (`canApproveLeave`, `canRunPayroll`, `isAdmin`, etc.).
  - `LeaveType` → add `resetsAnnually: bool`, `routesToAdmin: bool` (the latter is partly `requiresAdminApproval` already). Replace ID checks with these flags.
  - `EmployeeStatus` lifted to a real master with `isTerminal: bool`, `isSystemSet: bool` (currently the integer enum `EmployeeStatus`).
- Refactor every code site that compares `xxxId === ENUM_VALUE` to read the flag instead — roughly 237 grep hits in the API.
- Add capability-assignment UI to the Masters page for each frozen master.
- Re-test every role-gated route, every leave-routing path, every payroll-status transition, every onboarding/exit flow.

Logged here so the work isn't forgotten; not part of this plan's deliverable.

---

## 3. Backend (API + Contracts)

### 3.1 Contract additions (`packages/contracts/src/employees.ts`)

```ts
// Already exists:
//   CreateDepartmentRequestSchema    { name: string }
//   CreateDesignationRequestSchema   { name: string }

// New:
export const UpdateMasterNameRequestSchema = z.object({
  name: z.string().min(1).max(64).trim(),
});
export type UpdateMasterNameRequest = z.infer<typeof UpdateMasterNameRequestSchema>;
```

Single shared rename schema — same shape for every master.

### 3.2 Error codes (`packages/contracts/src/errors.ts`)

Add:

```ts
export const ErrorCode = {
  ...
  MASTER_IN_USE: 'MASTER_IN_USE',   // 409 — delete blocked because rows reference it
  MASTER_NAME_TAKEN: 'MASTER_NAME_TAKEN', // 409 — unique-name conflict on create/rename
  MASTER_FROZEN: 'MASTER_FROZEN',   // 403 — attempted Add/Delete on Role/EmpType/Gender/LeaveType
};
```

### 3.3 Endpoint catalogue

Base path stays `/masters` (under `apps/api/src/modules/employees/masters.routes.ts`).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/masters/departments` | any signed-in | List active (already exists) |
| POST | `/masters/departments` | Admin | Create (already exists; keep idempotency) |
| PATCH | `/masters/departments/:id` | Admin | Rename — validate unique, audit |
| DELETE | `/masters/departments/:id` | Admin | Soft-delete (set `status=2`); 409 `MASTER_IN_USE` if `employee.count({ departmentId }) > 0` |
| GET | `/masters/designations` | any signed-in | (exists) |
| POST | `/masters/designations` | Admin | (exists) |
| PATCH | `/masters/designations/:id` | Admin | Rename |
| DELETE | `/masters/designations/:id` | Admin | Soft-delete; 409 if in use |
| GET | `/masters/roles` | any signed-in | (exists) |
| PATCH | `/masters/roles/:id` | Admin | Rename only |
| GET | `/masters/employment-types` | any signed-in | (exists) |
| PATCH | `/masters/employment-types/:id` | Admin | Rename only |
| GET | `/masters/genders` | any signed-in | (exists) |
| PATCH | `/masters/genders/:id` | Admin | Rename only |
| GET | `/masters/leave-types` | any signed-in | **New** — list active leave types (currently the FE reads a static map) |
| PATCH | `/masters/leave-types/:id` | Admin | Rename only |

Per-route rules:

- `DELETE` is soft (`status = 2`) — never hard-delete. Keeps historical references intact for audit. Active list endpoints already filter `status = 1`.
- Every mutation is wrapped in `prisma.$transaction` with an audit row (`masters.<table>.created` / `.renamed` / `.deactivated`).
- `MASTER_FROZEN` is returned if someone sends DELETE or POST to a frozen-table endpoint — but those routes simply won't be registered, so a 404 is the more natural outcome. Decision: don't add the endpoints; UI never sends the request.

### 3.4 In-use guard for delete

| Master | Tables that reference it |
|---|---|
| Department | `employee.departmentId` |
| Designation | `employee.designationId` |

The DELETE handler runs the count query inside the same transaction; if `count > 0`, returns 409 with `{ inUseCount: N }` so the UI can say "Cannot delete — 4 employees are still in this department."

### 3.5 Audit actions

| Action key | Trigger |
|---|---|
| `masters.department.created` | POST /masters/departments |
| `masters.department.renamed` | PATCH /masters/departments/:id |
| `masters.department.deactivated` | DELETE /masters/departments/:id |
| `masters.designation.created` | POST /masters/designations |
| `masters.designation.renamed` | PATCH /masters/designations/:id |
| `masters.designation.deactivated` | DELETE /masters/designations/:id |
| `masters.role.renamed` | PATCH /masters/roles/:id |
| `masters.employment_type.renamed` | PATCH /masters/employment-types/:id |
| `masters.gender.renamed` | PATCH /masters/genders/:id |
| `masters.leave_type.renamed` | PATCH /masters/leave-types/:id |

`before` / `after` payload: `{ id, name }`.

---

## 4. Frontend

### 4.1 Route

`apps/web/src/app/(admin)/admin/masters/page.tsx`

### 4.2 Sidebar nav

Insert after `Configuration` in `adminNav` (`apps/web/src/components/layout/roleNavConfig.ts`):

```ts
{ type: 'link', label: 'Configuration',  href: '/admin/configuration',   iconPath: ICONS.configuration },
{ type: 'link', label: 'Masters',        href: '/admin/masters',         iconPath: ICONS.masters },   // ← new
```

New icon entry `ICONS.masters` — pick a database / spreadsheet glyph from the existing icon library (no new SVG asset required if Heroicons-style outline is used inline).

### 4.3 Page layout

Single page, tabbed:

```
┌─────────────────────────────────────────────────────────┐
│ Masters                                                  │
│ Manage organisation lookup tables.                       │
├─────────────────────────────────────────────────────────┤
│ [ Departments ] [ Designations ] [ Roles ] [ Emp Types ] │
│ [ Genders ] [ Leave Types ]                              │
├─────────────────────────────────────────────────────────┤
│ + Add Department          (only on Departments / Desig.) │
│                                                          │
│ ┌───┬─────────────────────────┬──────────┬────────────┐ │
│ │ # │ Name                    │ In use   │ Actions    │ │
│ ├───┼─────────────────────────┼──────────┼────────────┤ │
│ │ 1 │ Engineering             │ 12 emp   │ ✎  🗑      │ │
│ │ 2 │ HR                      │ 3 emp    │ ✎  🗑      │ │
│ │ 3 │ Finance                 │ 0 emp    │ ✎  🗑      │ │
│ └───┴─────────────────────────┴──────────┴────────────┘ │
└─────────────────────────────────────────────────────────┘
```

For Roles / EmpTypes / Genders / LeaveTypes:

- No `+ Add` button.
- Edit (`✎`) opens inline rename; Delete (`🗑`) is rendered as a disabled grey icon with a tooltip *"System-managed — cannot delete."*

For Departments / Designations:

- `+ Add` button at top-right opens a small modal with a single `name` field.
- Edit opens inline rename.
- Delete prompts a confirmation dialog. If the server returns `MASTER_IN_USE`, the dialog converts to an error state showing the count.

### 4.4 Components

| Component | Path | Role |
|---|---|---|
| `MasterTabBar` | `features/masters/components/MasterTabBar.tsx` | Tab switcher; URL-driven `?tab=departments` etc. |
| `MasterTable` | `features/masters/components/MasterTable.tsx` | Generic table with rename / delete / in-use count props |
| `AddMasterRowModal` | `features/masters/components/AddMasterRowModal.tsx` | Single-field modal, used by Departments & Designations |
| `RenameMasterRowModal` | `features/masters/components/RenameMasterRowModal.tsx` | Single-field modal |
| `DeleteMasterRowDialog` | `features/masters/components/DeleteMasterRowDialog.tsx` | Confirm + `MASTER_IN_USE` error rendering |

### 4.5 Hooks

`apps/web/src/lib/hooks/useMasters.ts` — one file holding:

- `useMasterList(table: MasterTable)` — query
- `useCreateMaster(table)` — mutation, invalidates `qk.masters.list(table)`
- `useRenameMaster(table)` — mutation
- `useDeleteMaster(table)` — mutation

Where `MasterTable = 'departments' | 'designations' | 'roles' | 'employment-types' | 'genders' | 'leave-types'`.

### 4.6 Query keys

```ts
masters: {
  list: (table: MasterTable) => ['masters', table] as const,
}
```

### 4.7 Empty / loading / error states

- Loading: 4-row table skeleton (consistent with other admin tables).
- Empty: "No rows yet — click + Add" for Departments / Designations; for the frozen tables this case shouldn't happen (seed guarantees rows).
- Mutation errors: toast with the server's message; rename modal preserves input on failure.

### 4.8 Accessibility / UX details

- Disabled buttons get `aria-disabled="true"` plus a `title` tooltip, never just a `disabled` attribute alone.
- Confirm-delete dialog is keyboard-trappable (matches existing modal pattern in `Modal.tsx`).
- Tab change resets focus to the new table caption.

---

## 5. Test plan

| Test | Outcome |
|---|---|
| Admin creates a new Department | Row appears; audit row written; nav dropdowns refresh |
| Admin creates a Department with an existing name | 409 `MASTER_NAME_TAKEN`; modal shows error inline |
| Admin renames "Engineering" → "Eng" | Update visible everywhere it's referenced (employee detail, dropdowns) |
| Admin deletes an unused Department | Row hidden from active list; still visible in audit |
| Admin deletes a Department with 4 employees | 409 `MASTER_IN_USE { inUseCount: 4 }`; dialog shows the count |
| Admin renames role "Admin" | Label updates; `requireRole(RoleId.Admin)` continues to work (ID unchanged) |
| Admin attempts DELETE on `/masters/roles/4` via API directly | 404 (endpoint not registered) |
| Non-Admin (Manager) hits PATCH `/masters/departments/1` | 403 — role guard fails |
| Audit log filter for `masters.*` actions | Shows the full mutation history with actor / IP |

Add these to `HRMS_Test_Cases.md` once implementation starts.

---

## 6. Migration / rollout

- **No schema migration required** — every needed column already exists (`status` column on all master tables supports soft-delete).
- **No data backfill required** — seeds remain unchanged.
- **Backward-compatible** — existing `GET /masters/...` consumers (employee form, etc.) keep working untouched.

---

## 7. Out of scope (deferred)

- Add/Delete on Roles, Employment Types, Genders, Leave Types — requires the capability-flag refactor in §2.4.
- A dedicated "Audit Modules" master page — low value; admin reads it via the audit-log filter.
- Bulk import (CSV) — defer to v1.1 if customers ask.
- A "Department head" assignment column on Department — separate feature, owner has not requested it.

---

## 8. Effort estimate

- Backend: ~6 endpoints × straightforward CRUD with audit + in-use guard → ~0.5 day.
- Contracts: ~2 new schemas, 2 new error codes → ~1 hour.
- Frontend: tabbed page + 5 small components + 4 hooks → ~1 day.
- QA: ~0.5 day to cover the test plan in §5.

**Total: ~2 days of engineering, single-pass.** Capability-flag refactor (§2.4) is separate, ~1-2 weeks.

---

## 9. Open questions

None blocking. Two minor product calls to confirm before implementation:

- **OQ-M-1.** Should rename of frozen rows (e.g. role "Admin" → "Super User") prompt a confirmation dialog warning that downstream UI labels will change? Default: **yes**, single-line warning *"This will change the label everywhere it appears in the app. The underlying rules are unaffected."*
- **OQ-M-2.** Soft-deleted Departments / Designations — should they show in a separate "Inactive" tab on the same page, or be invisible? Default: **invisible in v1**; admins can recover via audit log + direct DB intervention if needed. Inactive tab is v1.1.
