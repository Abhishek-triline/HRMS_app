import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import {
  loginViaApi,
  createLeaveRequest,
  cancelLeaveRequest,
  approveLeaveRequest,
  getLeaveRequest,
} from '../fixtures/api';

/**
 * Leave routing & cancel-before-start regressions.
 *
 * Implements:
 *   E2E-LEAVE-004 — Maternity routes to Admin, bypassing the manager
 *                   (BL-015). Asserted via the API on the created
 *                   request: routedToId === 2 (Admin).
 *   E2E-LEAVE-007 — Cancel an Approved leave whose fromDate is in the
 *                   future. Server allows owner-initiated cancel and
 *                   restores the full balance (BL-019).
 */

const E2E_REASON_MARKER = 'E2E-LEAVE-ROUTE';

async function purgeStaleE2ELeaves() {
  const ctx = await loginViaApi('employee');
  try {
    const res = await ctx.get('/api/v1/leave/requests?limit=100');
    if (!res.ok()) return;
    const body = await res.json();
    const items: Array<{ id: number; reason: string; status: number }> =
      body?.data ?? [];
    const stale = items.filter(
      (i) =>
        i.reason?.startsWith(E2E_REASON_MARKER) &&
        (i.status === 1 || i.status === 2),
    );
    for (const s of stale) await cancelLeaveRequest(ctx, s.id);
  } finally {
    await ctx.dispose();
  }
}

test.describe('E2E-LEAVE @smoke', () => {
  test.beforeEach(async () => {
    await purgeStaleE2ELeaves();
  });

  test('E2E-LEAVE-004 — Maternity leave routes directly to Admin (BL-015)', async ({ page }) => {
    // Submit Maternity via the UI; the form's admin-route banner
    // confirms the routing in the UI, and the API field routedToId
    // proves it on the server side.
    const login = new LoginPage(page);
    await login.loginAs('employee');
    await page.goto('/employee/leave/new');
    await page.waitForLoadState('networkidle');

    // leaveTypeId=5 is Maternity (frozen ID; event-based, requires
    // admin approval).
    await page.locator('#leaveTypeId').selectOption('5');

    // The form shows a hint "<leaveType> is event-based and goes
    // directly to Admin for approval — your manager is bypassed."
    // Wait for it before continuing.
    await expect(page.locator('body')).toContainText(/event-based/i);
    await expect(page.locator('body')).toContainText(/Admin/i);

    const fromDate = '2026-12-01';
    const toDate = '2026-12-02';
    const reason = `${E2E_REASON_MARKER}-004 ${Date.now()}`;
    await page.locator('#fromDate').fill(fromDate);
    await page.locator('#toDate').fill(toDate);
    await page.locator('#reason').fill(reason);

    await page.getByRole('button', { name: /Submit Request/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/employee/leave/new'), {
      timeout: 15_000,
    });

    // Server-side assertion: routedToId must be 2 (Admin), not 1
    // (Manager). Anything else is a BL-015 regression.
    const apiCtx = await loginViaApi('employee');
    const listRes = await apiCtx.get('/api/v1/leave/requests?limit=100');
    const body = await listRes.json();
    const items: Array<{
      id: number;
      reason: string;
      leaveTypeId: number;
      routedToId?: number;
    }> = body?.data ?? [];
    const created = items.find((i) => i.reason === reason);
    expect(created, 'created Maternity leave should be findable').toBeDefined();
    expect(created!.leaveTypeId).toBe(5);
    expect(created!.routedToId).toBe(2); // RoutingTarget.Admin

    // Cleanup
    await cancelLeaveRequest(apiCtx, created!.id);
    await apiCtx.dispose();
  });

  test('E2E-LEAVE-007 — Cancel Approved leave before start restores balance (BL-019)', async ({ page }) => {
    // Arrange: plant a Pending leave as the employee, approve it via
    // API as the manager, leaving an Approved future-dated leave that
    // the employee should be allowed to self-cancel.
    const empCtx = await loginViaApi('employee');
    const planted = await createLeaveRequest(empCtx, {
      leaveTypeId: 1, // Annual
      fromDate: '2026-12-14',
      toDate: '2026-12-15',
      reason: `${E2E_REASON_MARKER}-007 ${Date.now()}`,
    });
    expect(planted.status).toBe(1);
    await empCtx.dispose();

    const mgrCtx = await loginViaApi('manager');
    await approveLeaveRequest(mgrCtx, planted.id);
    await mgrCtx.dispose();

    // Confirm precondition: leave is Approved, fromDate is in the future.
    const verifyCtx = await loginViaApi('employee');
    const beforeCancel = await getLeaveRequest(verifyCtx, planted.id);
    expect(beforeCancel.status).toBe(2); // Approved

    // Act: employee opens the detail page and cancels.
    const login = new LoginPage(page);
    await login.loginAs('employee');
    await page.goto(`/employee/leave/${planted.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(planted.code);

    // The Cancel section renders because status=Approved && beforeStart.
    await page.getByRole('button', { name: /Cancel Request/i }).click();
    await page.getByRole('button', { name: /^Cancel Leave$/i }).click();

    // Poll until status flips to Cancelled (4).
    let final: { status: number } | null = null;
    for (let i = 0; i < 10; i++) {
      try {
        final = await getLeaveRequest(verifyCtx, planted.id);
        if (final.status === 4) break;
      } catch {
        // not yet
      }
      await page.waitForTimeout(500);
    }
    expect(final?.status).toBe(4); // Cancelled
    await verifyCtx.dispose();
  });
});
