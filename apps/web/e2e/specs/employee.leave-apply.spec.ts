import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { loginViaApi, cancelLeaveRequest } from '../fixtures/api';

/**
 * E2E-LEAVE-001 — Employee applies for a leave through the UI and
 * sees the new request appear as Pending in their leave history.
 *
 * Fixture pattern: self-healing additive. The spec uses a date window
 * outside the seeded set. Before each run it sweeps any prior E2E-
 * tagged pending leaves (reason starts with "E2E ") and cancels them
 * via API, so a failed previous run can't trip LEAVE_OVERLAP on the
 * current submit (BL-009).
 */

const E2E_REASON_MARKER = 'E2E';

async function purgeStaleE2ELeaves() {
  const ctx = await loginViaApi('employee');
  try {
    const res = await ctx.get('/api/v1/leave/requests?limit=100');
    if (!res.ok()) return;
    const body = await res.json();
    const items: Array<{ id: number; reason: string; status: number }> =
      body?.data ?? [];
    const stale = items.filter(
      (i) => i.status === 1 && i.reason?.startsWith(E2E_REASON_MARKER),
    );
    for (const s of stale) {
      await cancelLeaveRequest(ctx, s.id);
    }
  } finally {
    await ctx.dispose();
  }
}

test.describe('E2E-LEAVE @smoke', () => {
  test.beforeEach(async () => {
    await purgeStaleE2ELeaves();
  });

  test('E2E-LEAVE-001 — Employee applies for a leave, sees Pending row', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('employee');

    // Pick a unique date in late 2026 that no seeded leave touches.
    // The window 2026-09-15..2026-09-16 is free in the seed.
    const fromDate = '2026-09-15';
    const toDate = '2026-09-16';
    const reason = `${E2E_REASON_MARKER} ${Date.now()} — automated apply-leave test`;

    await page.goto('/employee/leave/new');
    await page.waitForLoadState('networkidle');

    // Fill the form. Leave-type 1 = Annual (frozen seed ID).
    await page.locator('#leaveTypeId').selectOption('1');
    await page.locator('#fromDate').fill(fromDate);
    await page.locator('#toDate').fill(toDate);
    await page.locator('#reason').fill(reason);

    await page.getByRole('button', { name: /Submit Request/i }).click();

    // Wait for the redirect away from /new. The post-submit destination is
    // either the list or the new request's detail page; both confirm the
    // server accepted the submission.
    await page.waitForURL((url) => !url.pathname.endsWith('/employee/leave/new'), {
      timeout: 15_000,
    });

    // Verify via API — deterministic, doesn't depend on date-format in
    // the table. The reason includes a unique timestamp so we can match
    // exactly the row this test created.
    const apiCtx = await loginViaApi('employee');
    const listRes = await apiCtx.get('/api/v1/leave/requests?limit=100');
    expect(listRes.ok()).toBe(true);
    const body = await listRes.json();
    const items: Array<{
      id: number;
      code: string;
      reason: string;
      fromDate: string;
      status: number;
    }> = body?.data ?? [];
    const created = items.find(
      (i) => i.reason === reason && i.fromDate?.startsWith(fromDate) && i.status === 1,
    );
    expect(created, 'Expected a Pending leave matching the test reason').toBeDefined();
    expect(created!.code).toMatch(/^L-\d{4}-\d{4}$/);

    // UI assertion: the just-created code shows up on the list page
    // labelled "Pending". Searching by code is layout-independent.
    await page.goto('/employee/leave');
    await page.waitForLoadState('networkidle');
    const row = page.getByRole('row', { name: new RegExp(created!.code) });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText(/Pending/i);

    // ── Cleanup — cancel via API so reruns stay clean. ───────────────
    await cancelLeaveRequest(apiCtx, created!.id);
    await apiCtx.dispose();
  });
});
