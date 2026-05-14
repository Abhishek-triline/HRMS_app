import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { loginViaApi, createLeaveRequest, cancelLeaveRequest } from '../fixtures/api';

/**
 * E2E-MGR-LEAVE-001 — Manager approves a Pending leave.
 *
 * Arrange (API):  Log in as Kavya (employee@triline.co.in, reports to
 *                 Arjun/manager@triline.co.in) and create a Pending
 *                 leave for a date window the seed doesn't touch.
 * Act (UI):       Log in as Arjun, open the leave queue, open the
 *                 detail page, click Approve → Confirm Approval.
 * Assert (API):   Re-fetch the leave; status flipped to Approved (2).
 *
 * Self-healing: at start of each run, purge any stale E2E-tagged
 * leaves (pending or approved) so the previous run's residue can't
 * trip overlap (BL-009) or skew the assertion.
 */

const E2E_REASON_MARKER = 'E2E-MGR-LEAVE-001';

async function purgeStaleE2ELeaves() {
  const ctx = await loginViaApi('employee');
  try {
    const res = await ctx.get('/api/v1/leave/requests?limit=100');
    if (!res.ok()) return;
    const body = await res.json();
    const items: Array<{ id: number; reason: string; status: number }> =
      body?.data ?? [];
    // Cancel BOTH Pending (status=1) and Approved (status=2) E2E leaves
    // so re-runs can recreate without overlap.
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

test.describe('E2E-MGR-LEAVE @smoke', () => {
  test.beforeEach(async () => {
    await purgeStaleE2ELeaves();
  });

  test('E2E-MGR-LEAVE-001 — Manager approves a Pending leave → status flips', async ({ page }) => {
    // ── Arrange — create a Pending leave via API as the employee ────
    const empCtx = await loginViaApi('employee');
    const reason = `${E2E_REASON_MARKER} ${Date.now()}`;
    const created = await createLeaveRequest(empCtx, {
      leaveTypeId: 1, // Annual
      fromDate: '2026-10-05',
      toDate: '2026-10-06',
      reason,
    });
    expect(created.code).toMatch(/^L-\d{4}-\d{4}$/);
    expect(created.status).toBe(1); // Pending
    await empCtx.dispose();

    // ── Act — manager opens the detail page and approves ───────────
    const login = new LoginPage(page);
    await login.loginAs('manager');

    // Go straight to the detail page. The leave-queue detail route
    // accepts the numeric id; using the L-code there throws "could not
    // load" because the leave-queue endpoint hasn't been widened the
    // way /leave/requests/:idOrCode was.
    await page.goto(`/manager/leave-queue/${created.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(created.code);

    // Click "Approve" — opens the consequence-stating modal.
    await page.getByRole('button', { name: /^Approve$/i }).click();

    // The modal's primary button is "Confirm Approval".
    await page
      .getByRole('button', { name: /Confirm Approval/i })
      .click();

    // Wait for the mutation to settle. The success toast appears and
    // the React-Query cache invalidates — by polling the API directly
    // we get a deterministic "done" signal that doesn't depend on UI
    // animation timing.
    const verifyCtx = await loginViaApi('manager');
    let final: { id: number; status: number } | null = null;
    for (let i = 0; i < 10; i++) {
      const res = await verifyCtx.get(`/api/v1/leave/requests/${created.id}`);
      if (res.ok()) {
        const body = await res.json();
        final = body?.data ?? body;
        if (final?.status === 2) break; // Approved
      }
      await page.waitForTimeout(500);
    }
    expect(final, 'leave should be retrievable after approve').not.toBeNull();
    expect(final!.status).toBe(2); // Approved
    await verifyCtx.dispose();

    // ── Cleanup — cancel the now-Approved leave so the seed window
    //    stays free for the next run. Cancel is allowed because the
    //    fromDate (2026-10-05) is in the future. ────────────────────
    const cleanupCtx = await loginViaApi('employee');
    await cancelLeaveRequest(cleanupCtx, created.id);
    await cleanupCtx.dispose();
  });
});
