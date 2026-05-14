# Nexora HRMS — E2E (Playwright)

End-to-end tests live here. Specs drive a real browser against the
running dev / production stack and assert real DB outcomes. See
[`docs/HRMS_Playwright_Test_Plan.md`](../../../docs/HRMS_Playwright_Test_Plan.md)
for the full plan (catalogue, fixture strategy, OQs, migration path).

---

## Quick start

```bash
# from apps/web

# (one-time per fresh clone)
pnpm install
pnpm exec playwright install chromium

# locally — pre-req: `pnpm dev` running at repo root
pnpm e2e            # full pack (currently ~32 specs)
pnpm e2e:smoke      # @smoke-tagged subset (the CI gate)
pnpm e2e:ui         # interactive — pick a spec, step through it
pnpm e2e:report     # open the last HTML report
```

For a single spec or grep:

```bash
pnpm e2e specs/auth.spec.ts
pnpm e2e --grep "E2E-LEAVE-001"
pnpm e2e --headed --debug          # visible browser, step debug
pnpm e2e --trace=on                # force trace recording on every run
```

---

## Pre-reqs

| Mode | Pre-req |
|---|---|
| **Local** | `pnpm dev` running at repo root. `playwright.config.ts` skips the `webServer` block when `CI` is unset, so it reuses whatever stack you've already started. |
| **CI (GitHub Actions)** | `.github/workflows/e2e-smoke.yml` provisions everything: MySQL service, Prisma migrations, seed, production builds, then Playwright. No local action required. |

Seed accounts (all share password `admin@123` — see [`apps/api/prisma/seed.ts`](../../api/prisma/seed.ts)):

- Admin       — `admin@triline.co.in`
- Manager     — `manager@triline.co.in`
- Employee    — `employee@triline.co.in`
- Payroll Off — `payroll@triline.co.in`

---

## Layout

```
e2e/
  README.md                ← this file
  tsconfig.json            ← isolated TS config (excluded from web build)
  utils/
    credentials.ts         ← seed creds + role → dashboard path map
  pages/                   ← Page-object models (POMs)
    LoginPage.ts
  fixtures/
    api.ts                 ← loginViaApi / createLeaveRequest / cancelLeaveRequest
  specs/                   ← one file per feature surface
    auth.spec.ts
    auth.deep-link.spec.ts
    admin.attendance.spec.ts
    admin.audit.spec.ts
    admin.employees.spec.ts
    employee.leave.spec.ts
    employee.leave-apply.spec.ts
    manager.leave-approve.spec.ts
    manager.team.spec.ts
    role-guards.spec.ts
    ui.sidebar.spec.ts
```

---

## Conventions

### Spec IDs

Every test name starts with the canonical ID from
[`docs/HRMS_Playwright_Test_Plan.md`](../../../docs/HRMS_Playwright_Test_Plan.md) §7
(e.g. `E2E-LEAVE-001`). New specs must add a row to that catalogue first.

### Tags

- `@smoke` — pre-merge gate. ≤ 5 min runtime, must be deterministic.

Run with `pnpm e2e:smoke` or `pnpm e2e --grep @smoke`.

### Selector priority (in order)

1. `page.getByRole(...)` + accessible name
2. `page.getByLabel(...)`
3. Stable `id` (`#email`, `#nx-login-submit`)
4. `page.getByTestId(...)` — add `data-testid` to the component only if 1–3 are insufficient
5. CSS / XPath — last resort, always with a comment explaining why

Avoid `getByText` for clickable elements (matches multiple), and class
selectors (`.bg-forest`) which churn as the UI evolves.

### Write-path fixture pattern

Mutating specs follow this shape:

1. **`beforeEach` purge** — sweep any prior E2E-tagged rows the previous run might have left behind, via the API. Always use a per-spec marker (e.g. `E2E-MGR-LEAVE-001 ${Date.now()}`).
2. **Arrange via API** — `fixtures/api.ts` helpers create the precondition (Pending leave, etc.) faster than driving the UI.
3. **Act via UI** — the actual thing being tested (click Approve, submit form, etc.).
4. **Assert via API** — poll the API until the state flips. Avoids React-Query refetch / hydration races.
5. **Cleanup via API** — cancel / revert at the end. If a run fails mid-test, the next run's `beforeEach` purge cleans up.

DB state should end each run as clean as it started. No external reset
endpoint is needed for additive flows.

---

## Stability notes

- `reducedMotion: 'reduce'` is set globally in `playwright.config.ts` to freeze the login card's `animate-float` and other CSS animations.
- `webServer` runs only when `CI=true`, starting **production builds** (`pnpm start` per package). Dev-server compilation latency caused two known flakes (`E2E-AUD-001`, `E2E-EMP-007`) when running the full pack locally; production mode removes the whole class of timing issue.
- For local debugging of flakes, run the one spec in isolation: `pnpm e2e specs/admin.audit.spec.ts` — they pass cleanly when not racing 30+ other specs against the dev server.

---

## CI artifacts

When the GitHub Actions job fails, two artifacts get uploaded:

- `playwright-report/` — HTML report; download, unzip, open `index.html`.
- `test-results/` — per-failed-test trace.zip + screenshots + video.

To open a trace locally:

```bash
pnpm exec playwright show-trace path/to/trace.zip
```

The trace viewer scrubs through every action with the DOM snapshot at
each step — fastest way to diagnose a CI-only failure.

---

## Adding a new spec

1. Pick (or invent) the ID from the catalogue in `docs/HRMS_Playwright_Test_Plan.md` §7.
2. Drop a file in `specs/` named after the feature surface (`employee.leave.spec.ts`, `admin.payroll.spec.ts`, …).
3. Login through `LoginPage.loginAs(role)` — never re-implement the login flow inline.
4. For mutations, follow the §"Write-path fixture pattern" above.
5. Tag `@smoke` if the test is fast (≤ 10s) and deterministic; otherwise leave untagged and it joins the regression pack.
6. Run `pnpm e2e specs/your.spec.ts` until green, then `pnpm e2e` for the full pack.

---

## Migration status

Per the plan §12, current phase: **Phase 4 deep into regression coverage, all scaffolding + automation phases complete.**

- ✅ Phase 0 — Plan doc
- ✅ Phase 1 — Scaffold + first spec
- ✅ Phase 2 — Smoke pack (32 specs, mix of read-only + write-path)
- ✅ Phase 3 — CI workflow shipped (`.github/workflows/e2e-smoke.yml`); first PR validates the green path
- 🟡 Phase 4 — Regression pack: **70 specs landed total**. Covered: auth, leave (12 specs incl. routing / overlap / balance / cancel paths), regularisation routing, attendance idempotency, performance read + data-shape, payroll list / lock / redaction, employee create + status transitions, dashboards / notifications / sidebar / config / role guards. Remaining: cron-driven flows (BL-018 escalation, midnight generate, carry-forward, BL-LE-04 encashment window), concurrent finalise (BL-034), performance write-path (cycle create, goals, ratings) — these need the time-travel endpoint + concurrency fixtures
- ✅ Phase 5 — Nightly regression + auto-issue (`.github/workflows/e2e-nightly.yml`) — opens / updates a tagged `e2e-fail` issue on failure
