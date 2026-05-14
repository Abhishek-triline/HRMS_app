# Playwright E2E Test Plan — Nexora HRMS

**Status:** **DRAFTED — implementation pending.** This document defines the end-to-end test catalogue for Nexora HRMS run through Playwright. It maps the high-priority user flows from [SRS_HRMS_Nexora.md](./SRS_HRMS_Nexora.md) and the per-row test cases in [HRMS_Test_Cases.md](./HRMS_Test_Cases.md) to executable, role-driven Playwright scenarios.
**Audience:** QA engineer setting up E2E coverage; future contributors writing new tests.
**Authoring rule:** Test scenarios live in this document first; code lands in `apps/web/e2e/` only after the scenario row exists below.

---

## 1. Purpose & Scope

### 1.1 Why E2E?

Vitest covers the API in isolation; Next.js's own build/typecheck catches frontend regressions. Neither catches *integration* defects — the kind that surface only when a real browser drives a real session against a real API against a real DB. Examples that bit us in the last month:

- The "Cancel Request" button rendering on past-dated approved leaves (server returned 403, UI didn't gate).
- The Admin attendance overview showing 100% Present when only some employees had rows.
- "Late This Month" column reading a non-existent field through an unsafe cast.
- Hours-Worked chart staying on Week 1 forever after refresh.

Each was a cross-layer bug. Unit tests would not have caught any of them. Playwright would.

### 1.2 What's in scope for this plan

End-to-end browser-driven tests against the **deployed dev stack** (`pnpm dev` running api + web + seeded MySQL) covering:

- Authentication & session boundaries (positive, negative, security).
- The principal workflows of every role: Admin, Manager, Employee, PayrollOfficer.
- Cross-cutting state machines: leave lifecycle, attendance lifecycle, payroll lifecycle, performance cycle.
- Audit-log invariants triggered by the above.
- Smoke pack (≤ 5 min) for pre-merge CI; regression pack (≤ 30 min) for nightly.

### 1.3 Out of scope

- Performance / load testing (use `k6` or `autocannon` in a separate harness).
- Visual regression (defer to Percy / Chromatic if needed — current plan: rely on screenshot diffs only on a curated set of pages).
- Mobile native (no mobile app exists in v1).
- Pure-API contract tests (already covered by Vitest + Zod schema validation).

---

## 2. Tooling Choice

**Playwright** (over Cypress) — three reasons:

1. **Multi-tab + multi-context.** Several flows here require two roles in parallel (Manager approves while Employee watches their request status update). Playwright supports multiple isolated browser contexts in a single test; Cypress doesn't, cleanly.
2. **Auto-wait + network idle.** Cleaner async story for SPA pages that hydrate after data fetches.
3. **First-class TS + headless-CI fit.** Single binary, no installation theatre, fast in GitHub Actions.

### 2.1 Versions & dependencies

| Package | Version (pinned at write time) | Purpose |
|---|---|---|
| `@playwright/test` | `^1.49` | Test runner + browser drivers |
| `dotenv` | already in repo | Load `apps/web/.env.test` for base URLs / creds |

Installed into `apps/web` (since the tests target the web app):

```bash
pnpm --filter @nexora/web add -D @playwright/test
pnpm --filter @nexora/web exec playwright install --with-deps chromium
```

Only Chromium is required for the default CI run. Firefox / WebKit are opt-in (`PLAYWRIGHT_BROWSERS=firefox,webkit pnpm e2e`).

---

## 3. Project Layout

```
apps/web/
  e2e/
    fixtures/
      auth.fixture.ts          # role-scoped login fixtures (storageState)
      data.fixture.ts          # seed reset + anchored "today"
      api.fixture.ts           # raw API client for arrange-phase mutations
    pages/                     # Page-object models (POM)
      LoginPage.ts
      AdminDashboard.ts
      ManagerLeaveQueue.ts
      EmployeeLeavePage.ts
      ...
    specs/
      auth.spec.ts
      employee.leave.spec.ts
      manager.leave-queue.spec.ts
      admin.employees.spec.ts
      admin.payroll.spec.ts
      attendance.regularisation.spec.ts
      performance.cycle.spec.ts
      ...
    smoke/
      smoke.spec.ts            # pre-merge gate (≤ 5 min)
    utils/
      time.ts                  # SEED_TODAY helpers
      retry.ts                 # 1-retry-on-CI conventions
  playwright.config.ts
  .env.test                    # gitignored — base URL + seeded creds
```

Why this layout:

- **POMs** (`pages/`) keep selectors out of specs. When the sidebar nav changes, exactly one POM file changes — not every spec.
- **Fixtures** (`fixtures/`) hold reusable setup: login once per role, store the cookie, re-attach via `storageState` so every spec starts authenticated in ~50 ms.
- **Smoke vs regression** split lets us gate PRs without blocking on the full pack.

---

## 4. Test Data — Determinism Above All

### 4.1 Seeded credentials

Tests use the existing seed accounts ([apps/api/prisma/seed.ts:186-194](../apps/api/prisma/seed.ts#L186-L194)):

| Role | Email | Password | EMP code |
|---|---|---|---|
| Admin | `admin@triline.co.in` | `admin@123` | EMP-2024-0001 |
| Manager | `manager@triline.co.in` | `admin@123` | EMP-2024-0002 |
| Employee | `employee@triline.co.in` | `admin@123` | EMP-2024-0003 |
| PayrollOfficer | `payroll@triline.co.in` | `admin@123` | EMP-2024-0004 |

Each role also has 10–20 subordinate / peer fixtures (Aditya, Sneha, Karthik …) for cross-role flows.

> **Do not log the password into reports or screenshots.** Playwright tracing redacts inputs typed into `password` fields by default; verify on first CI run.

### 4.2 Anchored "today"

The seed pins a `SEED_TODAY` anchor used to avoid "drifting future" issues in audit rows. The `.env.test` file freezes it for the test run:

```bash
SEED_TODAY=2026-05-14
TZ=Asia/Kolkata
```

Tests that depend on day-of-week or "before/after start" semantics must compute relative dates from `SEED_TODAY`, not `new Date()`. A helper in `e2e/utils/time.ts`:

```ts
import { addDays, format } from 'date-fns';
export const SEED_TODAY = new Date(process.env.SEED_TODAY ?? '2026-05-14');
export const today = () => format(SEED_TODAY, 'yyyy-MM-dd');
export const tomorrow = () => format(addDays(SEED_TODAY, 1), 'yyyy-MM-dd');
export const yesterday = () => format(addDays(SEED_TODAY, -1), 'yyyy-MM-dd');
```

### 4.3 Database reset strategy

Three modes; pick per spec via tag:

| Mode | When | How |
|---|---|---|
| **per-suite reset** (default) | Stateful flows (leave create/approve, payroll finalise) | `globalSetup` runs `pnpm db:reset && pnpm db:seed` once per file |
| **per-test reset** | Concurrency / race tests (BL-034 finalise) | Test-level fixture calls reset API endpoint |
| **no reset** | Read-only flows (admin lists, audit log reading) | Use shared seed; assert structurally not on exact counts |

`apps/api` exposes a dev-only endpoint `POST /api/v1/_test/reset` (gated behind `NODE_ENV !== 'production'`) that the fixture calls instead of shelling to pnpm — faster.

---

## 5. Authentication Strategy

Login through the UI **once per role per worker**, snapshot the cookie via `storageState`, reuse for every test in that role.

```ts
// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type RoleAuth = { adminPage: Page; managerPage: Page; employeePage: Page; payrollPage: Page };

export const test = base.extend<RoleAuth>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/admin.json' });
    await use(await ctx.newPage());
    await ctx.close();
  },
  // … same pattern for manager / employee / payroll
});
```

`globalSetup.ts` performs the four UI logins once and writes the storageStates. Subsequent test files don't re-login.

Negative auth tests (wrong password, locked account, expired session) must NOT reuse the storageState — they create a fresh context and drive the login UI manually.

---

## 6. Page Object Model Conventions

Each page object exposes:

- A `goto()` method that navigates and asserts the title.
- One method per user intent: `submitLeave()`, `approveTopOfQueue()`, etc.
- Locators kept private; only intent-revealing methods are public.

Skeleton:

```ts
// e2e/pages/EmployeeLeavePage.ts
import { Page, expect } from '@playwright/test';

export class EmployeeLeavePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/employee/leave');
    await expect(this.page.getByRole('heading', { name: 'My Leave' })).toBeVisible();
  }

  async applyLeave(input: { typeId: number; from: string; to: string; reason: string }) {
    await this.page.getByRole('button', { name: 'Apply for Leave' }).click();
    await this.page.getByLabel('Leave Type').selectOption(String(input.typeId));
    await this.page.getByLabel('From Date').fill(input.from);
    await this.page.getByLabel('To Date').fill(input.to);
    await this.page.getByLabel('Reason').fill(input.reason);
    await this.page.getByRole('button', { name: 'Submit Request' }).click();
    await expect(this.page.getByRole('alert')).toContainText('Request submitted');
  }

  async expectRowWithStatus(code: string, status: 'Pending' | 'Approved' | 'Rejected') {
    await expect(this.page.getByRole('row', { name: new RegExp(code) })).toContainText(status);
  }
}
```

**Selector priority** (in order of preference):

1. `getByRole(...)` + accessible name.
2. `getByLabel(...)`.
3. `getByTestId(...)` — added to components only when 1–2 are insufficient.
4. CSS / XPath — **last resort**, always with a comment explaining why.

Avoid: `getByText('...')` for clickable elements (matches multiple), and direct class selectors (`.bg-forest`) which mutate as the UI evolves.

---

## 7. Test Catalogue

Each row maps to one Playwright spec. `Mode` indicates which DB-reset mode (§4.3). `Pack` indicates smoke vs regression.

### 7.1 Authentication & Session

| ID | Title | Role | Mode | Pack |
|---|---|---|---|---|
| E2E-AUTH-001 | Login with correct password lands on role dashboard | each of 4 | no reset | smoke |
| E2E-AUTH-002 | Login with wrong password shows inline error, no redirect | n/a | no reset | smoke |
| E2E-AUTH-003 | First-login forces password reset before any other page is reachable | unset user | per-suite | regression |
| E2E-AUTH-004 | Session expiry redirects to /login with `?from=` param | employee | no reset | regression |
| E2E-AUTH-005 | Logout clears cookie and blocks back-button refetch | admin | no reset | regression |
| E2E-AUTH-006 | Direct-URL access to an admin route as Employee → 403 page (BL-017) | employee | no reset | smoke |
| E2E-AUTH-007 | Wrong-role redirect preserves deep link via `pathForOtherRole` | admin landing on `/employee/leave/L-...` | no reset | regression |
| E2E-AUTH-008 | Exited employee cannot log in | seeded `exited@…` | per-suite | regression |

### 7.2 Employee → Leave

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-LEAVE-001 | Apply Annual leave, see Pending row in history | per-suite | smoke |
| E2E-LEAVE-002 | Apply leave overlapping an existing request → `LEAVE_OVERLAP` toast (BL-009) | per-suite | regression |
| E2E-LEAVE-003 | Apply leave overlapping an approved Regularisation → `LEAVE_REG_CONFLICT` (BL-010) | per-suite | regression |
| E2E-LEAVE-004 | Apply Maternity → routes directly to Admin (BL-015) | per-suite | regression |
| E2E-LEAVE-005 | Apply Paternity → routes to Admin (BL-016) | per-suite | regression |
| E2E-LEAVE-006 | Cancel Pending leave (any time) restores balance | per-suite | smoke |
| E2E-LEAVE-007 | Cancel Approved leave **before start** restores full balance (BL-019) | per-suite | regression |
| E2E-LEAVE-008 | Cancel button **hidden** on Approved leave with past `fromDate` | per-suite | regression |
| E2E-LEAVE-009 | Insufficient balance → `INSUFFICIENT_BALANCE` error block (BL-014) | per-suite | regression |
| E2E-LEAVE-010 | Leave detail link from notification opens correct request | per-suite | regression |
| E2E-LEAVE-011 | Leave code (`L-2026-NNNN`) resolves the same detail page as numeric id | per-suite | regression |

### 7.3 Manager → Leave Queue

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-MGR-LEAVE-001 | Approve top-of-queue → employee sees Approved within next refetch | per-suite | smoke |
| E2E-MGR-LEAVE-002 | Reject with reason → employee sees Rejected + reason in detail | per-suite | regression |
| E2E-MGR-LEAVE-003 | Past Team Members tab — approve disabled, history visible (BL-022a) | per-suite | regression |
| E2E-MGR-LEAVE-004 | Cross-team leave detail link returns 403 if not own report | per-suite | regression |
| E2E-MGR-LEAVE-005 | Auto-escalation after 5 working days → Admin queue picks it up | manual time-travel | regression |
| E2E-MGR-LEAVE-006 | Manager cannot finalise payroll (no nav item, direct URL → 403) | no reset | smoke |

### 7.4 Admin → Employees

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-EMP-001 | Create new employee — sends invitation, EMP code increments | per-suite | smoke |
| E2E-EMP-002 | Circular reporting blocked with `CIRCULAR_REPORTING` (BL-005) | per-suite | regression |
| E2E-EMP-003 | Admin reports-to: only another Admin allowed (BL-017) | per-suite | regression |
| E2E-EMP-004 | Edit profile (name, phone, designation) — appears in audit log | per-suite | regression |
| E2E-EMP-005 | Edit salary structure — applies to next run, not historical payslip | per-suite | regression |
| E2E-EMP-006 | Status change Active → On-Notice → Exited (BL-006) | per-suite | smoke |
| E2E-EMP-007 | Exited employee detail page: read-only banner + actions hidden | per-suite | regression |
| E2E-EMP-008 | Reassign reporting manager → past records preserved on previous manager | per-suite | regression |
| E2E-EMP-009 | Leave-history tab on detail page shows employee-scoped data, not viewer's | per-suite | smoke |

### 7.5 Attendance & Regularisation

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-ATT-001 | Check-in records Present + late flag if after threshold (BL-027) | per-test | smoke |
| E2E-ATT-002 | Check-out updates hoursWorkedMinutes + closes the day | per-test | smoke |
| E2E-ATT-003 | Undo check-out within window → status reverts to Present | per-test | regression |
| E2E-ATT-004 | Undo check-out after window expired → button hidden, prompt to regularise | per-test | regression |
| E2E-ATT-005 | 3rd late mark of the month → 1 day deducted from Annual (BL-028); idempotent on repeat call | per-suite | regression |
| E2E-ATT-006 | Admin overview KPIs sum to total active employees (denominator fix) | per-suite | smoke |
| E2E-ATT-007 | Admin overview row shows correct lateMonthCount column value | per-suite | regression |
| E2E-REG-001 | Submit regularisation ≤ 7 days old → routes to Manager (BL-029) | per-suite | smoke |
| E2E-REG-002 | Submit regularisation > 7 days → routes to Admin (BL-029) | per-suite | regression |
| E2E-REG-003 | Regularisation conflicting with approved leave → `LEAVE_REG_CONFLICT` | per-suite | regression |
| E2E-REG-004 | Approval creates new attendance overlay row; original preserved (BL-007) | per-suite | regression |

### 7.6 Payroll

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-PAY-001 | Initiate monthly run; payslips appear for every Active employee | per-suite | smoke |
| E2E-PAY-002 | LOP applied from unpaid leave days (BL-035) | per-suite | regression |
| E2E-PAY-003 | Mid-month joiner prorated by days worked (BL-036) | per-suite | regression |
| E2E-PAY-004 | PO edits tax on a payslip — Admin sees updated value | per-suite | regression |
| E2E-PAY-005 | Finalise run — payslips locked, edit affordances hidden (BL-031) | per-suite | smoke |
| E2E-PAY-006 | Two concurrent finalise attempts → exactly one succeeds, the other gets `RUN_ALREADY_FINALISED` (BL-034) | per-test | regression |
| E2E-PAY-007 | Admin initiates reversal → new reversal run + audit row; original untouched (BL-032) | per-suite | regression |
| E2E-PAY-008 | PO cannot initiate reversal (UI hides + direct URL 403, BL-033) | no reset | regression |
| E2E-PAY-009 | Manager views subordinate's payslip — money fields render "—" (redaction) | no reset | regression |
| E2E-PAY-010 | Employee sees their own payslip with money fields populated | no reset | smoke |

### 7.7 Performance Reviews

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-PERF-001 | Admin creates cycle — review row generated per Active employee | per-suite | smoke |
| E2E-PERF-002 | Mid-cycle joiner skipped (BL-037) | per-suite | regression |
| E2E-PERF-003 | Manager creates 3–5 goals (BL-038) | per-suite | smoke |
| E2E-PERF-004 | Employee proposes additional goal during self-review window | per-suite | regression |
| E2E-PERF-005 | Self-rating editable only until deadline (BL-039) | per-suite | regression |
| E2E-PERF-006 | Manager rating overrides self → "Mgr overrode" tag (BL-040) | per-suite | regression |
| E2E-PERF-007 | Close cycle locks all ratings — edits return `CYCLE_CLOSED` (BL-041) | per-suite | regression |
| E2E-PERF-008 | Manager change mid-cycle records both managers on review (BL-042) | per-suite | regression |

### 7.8 Notifications & Audit

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-NOT-001 | Leave approve fires notification with deep link that resolves under target role | per-suite | smoke |
| E2E-NOT-002 | Payroll finalise notifies all Admins | per-suite | regression |
| E2E-AUD-001 | Audit log filter by module / actor / date narrows the list | no reset | smoke |
| E2E-AUD-002 | Audit log "Affected record" cell shows `<TargetType> · #<id>` | no reset | regression |
| E2E-AUD-003 | No edit / delete affordances on any audit row (BL-047) | no reset | smoke |

### 7.9 Configuration

| ID | Title | Mode | Pack |
|---|---|---|---|
| E2E-CFG-001 | Admin changes late threshold → next check-in uses new value | per-suite | regression |
| E2E-CFG-002 | Weekly off days configurable; midnight cron uses new pattern | per-suite | regression |
| E2E-CFG-003 | Undo-checkout window = 0 → undo control hidden everywhere | per-suite | regression |
| E2E-CFG-004 | Encashment window: Dec 1 → Jan 15 — out-of-window request rejected (BL-LE-04) | manual time-travel | regression |

### 7.10 Cross-Cutting / UI

| ID | Title | Pack |
|---|---|---|
| E2E-UI-001 | Dashboard hero matches time-of-day (smoke screenshot at 4 anchored hours) | regression |
| E2E-UI-002 | Sidebar highlights correct entry on every primary route | smoke |
| E2E-UI-003 | Mobile breakpoint (375px) renders without horizontal scroll | regression |
| E2E-UI-004 | Empty-state, loading-state, error-state visible on every list page | regression |

**Total: ~70 specs.** Smoke pack (`@smoke` tag) is ~18 rows above, runtime target ≤ 5 min on CI. Regression is the full ~70, target ≤ 30 min.

---

## 8. Smoke / Regression / Full

```bash
# Local — full regression
pnpm --filter @nexora/web e2e

# Smoke only (PR gate)
pnpm --filter @nexora/web e2e -- --grep "@smoke"

# Single spec (debug)
pnpm --filter @nexora/web e2e specs/employee.leave.spec.ts

# Headed mode (visible browser) — local debugging only
pnpm --filter @nexora/web e2e -- --headed --debug

# Update tracing on failure (default in `playwright.config.ts`)
pnpm --filter @nexora/web e2e -- --trace=on
```

Tags applied with `test.describe.parallel('Employee leave', { tag: '@smoke' }, …)`.

---

## 9. CI Integration

### 9.1 Smoke (pre-merge gate)

GitHub Actions workflow `e2e-smoke.yml`:

1. Spin up MySQL service container.
2. Install deps, `prisma migrate deploy`, `db:seed`.
3. Start `pnpm dev` in background; wait for `/api/health` to 200.
4. Run `pnpm e2e -- --grep "@smoke" --workers=2`.
5. Upload `playwright-report/` and `test-results/` (traces + screenshots) on failure.

Target wall time: **≤ 6 minutes** end-to-end. Hard fail at 10 min.

### 9.2 Regression (nightly)

Same job, no `--grep` filter, ≤ 30 min budget, runs at 02:00 IST. Failures open a GitHub issue tagged `e2e-flake` if the same test passes on retry within the run; otherwise tagged `e2e-fail` and blocks the next release.

### 9.3 Flake handling

- One automatic retry on CI (`retries: 1` in `playwright.config.ts`). Three retries inside Playwright's auto-wait is the runner's default for individual assertions.
- A test that needs `> 1` retry to pass three runs in a row is **muted via tag** (`@flaky`) and assigned to whoever wrote it. Fix within one sprint or remove.
- No `test.fixme()` / `test.skip()` without an owner + a date.

---

## 10. Reporting

- **HTML report** at `playwright-report/index.html` — Playwright's built-in, opened locally via `pnpm exec playwright show-report`.
- **JUnit XML** at `playwright-results.xml` — uploaded to GitHub Actions, surfaced in PR checks.
- **Trace viewer** on every failure — captured automatically (`trace: 'on-first-retry'`), opened via `pnpm exec playwright show-trace test-results/*/trace.zip`.

Screenshots are captured only on failure (`screenshot: 'only-on-failure'`) to keep the artifact size manageable.

---

## 11. What This Plan Does Not Cover

- **Visual diffing** of every page. Out of scope — covered ad-hoc by E2E-UI-001 etc. If we need pixel-perfect tracking later, add Percy or Chromatic.
- **Mobile gestures** (swipe, pinch). The app is responsive but doesn't ship native interactions; mobile coverage is limited to layout (E2E-UI-003).
- **i18n** — single locale (`en-IN`).
- **PDF rendering** — payslip PDFs are downloaded but content not asserted beyond MIME / status; richer PDF assertions wait until a payslip layout bug forces them.

---

## 12. Migration Path from Manual to Automated

| Phase | Deliverable | Effort | Status |
|---|---|---|---|
| 0 | This document | ✓ | ✅ |
| 1 | Scaffold: `playwright.config.ts`, fixtures, two POMs (Login, EmployeeLeave), one passing spec (E2E-LEAVE-001) | ~0.5 day | ✅ |
| 2 | Implement the **smoke pack** (~18 specs) | ~2 days | ✅ exceeded — 32 specs landed |
| 3 | Wire smoke into the GitHub Actions PR gate | ~0.5 day | ✅ `e2e-smoke.yml` |
| 4 | Implement the **regression pack** (remaining ~52 specs) | ~5 days | 🟡 11 batched in so far — Leave (5), Manager-Leave (1), Performance (3), Payroll (3); the heavier attendance / payroll-write / cron-driven specs remain |
| 5 | Wire nightly regression + flake-issue automation | ~0.5 day | ✅ `e2e-nightly.yml` |

**Total: ~8.5 engineering days for full coverage.** Stops at any point are useful: even phase 1 + phase 2 already protects every release from the worst integration regressions.

---

## 13. Open Questions

1. **OQ-PW-1.** Run E2E against the in-repo `pnpm dev` stack (fast, fragile to local DB drift) or against a dedicated `e2e` deployment (slower, isolated). Default: **local dev stack with a dedicated `e2e_db` schema**, recreated per CI run.
2. **OQ-PW-2.** Should we mock external services (SMTP for invitation emails, etc.) or hit dev SMTP? Default: **mock at the API layer via a test-only flag** that captures emails to a memory buffer the spec can read.
3. **OQ-PW-3.** Time-travel for cron-driven flows (escalation, midnight generate, carry-forward). Default: **expose a dev-only `POST /api/v1/_test/advance-clock`** that nudges the scheduler's reference time; tests call this instead of waiting wall-clock days.

Resolve before implementing phase 1.

---

## 14. Quick Links

- [HRMS_Test_Cases.md](./HRMS_Test_Cases.md) — manual test catalogue this plan derives from.
- [SRS_HRMS_Nexora.md](./SRS_HRMS_Nexora.md) — source of truth for acceptance criteria.
- [HRMS_Process_Flows.md](./HRMS_Process_Flows.md) — state-machine diagrams for leave / payroll / performance.
- Playwright docs — <https://playwright.dev/docs/intro>
