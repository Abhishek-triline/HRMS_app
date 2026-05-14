import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import {
  loginViaApi,
  createLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalances,
  getLeaveRequest,
} from '../fixtures/api';
import { CREDS } from '../utils/credentials';

/**
 * Leave edge-case regression tests — write-path, additive fixtures.
 *
 * Implements:
 *   E2E-LEAVE-002 — Apply leave overlapping an existing request →
 *                   LEAVE_OVERLAP (BL-009). Form stays on /new and
 *                   surfaces the conflict block.
 *   E2E-LEAVE-006 — Cancel a Pending leave (BL-019). Status flips to
 *                   Cancelled; balance fully restored.
 *   E2E-LEAVE-009 — Apply leave with days > remaining balance →
 *                   INSUFFICIENT_BALANCE (BL-014).
 *
 * Self-healing: each test uses a per-spec reason marker and the
 * beforeEach purges any prior E2E rows.
 */

const E2E_REASON_MARKER = 'E2E-LEAVE-EDGE';

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

const KAVYA_ID = Number(CREDS.employee.code.split('-').pop()); // not used yet, fixture
const EMPLOYEE_ID = 3; // Kavya's seeded id; stable across reruns

test.describe('E2E-LEAVE @smoke', () => {
  test.beforeEach(async () => {
    await purgeStaleE2ELeaves();
  });

  test('E2E-LEAVE-002 — Overlapping leave shows LEAVE_OVERLAP error block (BL-009)', async ({ page }) => {
    // Arrange: plant a Pending leave for a known date window.
    const empCtx = await loginViaApi('employee');
    const baseFrom = '2026-11-09';
    const baseTo = '2026-11-13';
    const planted = await createLeaveRequest(empCtx, {
      leaveTypeId: 1, // Annual
      fromDate: baseFrom,
      toDate: baseTo,
      reason: `${E2E_REASON_MARKER}-002-base ${Date.now()}`,
    });
    expect(planted.status).toBe(1);
    await empCtx.dispose();

    // Act: submit an overlapping leave through the UI.
    const login = new LoginPage(page);
    await login.loginAs('employee');
    await page.goto('/employee/leave/new');
    await page.waitForLoadState('networkidle');

    await page.locator('#leaveTypeId').selectOption('1');
    // Choose a window that overlaps the planted leave by at least one day.
    await page.locator('#fromDate').fill('2026-11-12');
    await page.locator('#toDate').fill('2026-11-14');
    await page
      .locator('#reason')
      .fill(`${E2E_REASON_MARKER}-002-overlap ${Date.now()}`);

    await page.getByRole('button', { name: /Submit Request/i }).click();

    // Assert: URL stays on /new and the conflict block is visible. The
    // ConflictErrorBlock heading is "Leave date conflict — request blocked".
    await expect(page).toHaveURL(/\/employee\/leave\/new$/);
    await expect(page.locator('body')).toContainText(/date conflict|request blocked/i);
    await expect(page.locator('body')).toContainText(planted.code);

    // Cleanup
    const cleanupCtx = await loginViaApi('employee');
    await cancelLeaveRequest(cleanupCtx, planted.id);
    await cleanupCtx.dispose();
  });

  test('E2E-LEAVE-006 — Cancel Pending leave restores balance (BL-019)', async ({ page }) => {
    const empCtx = await loginViaApi('employee');

    // Capture the Annual balance BEFORE planting the leave. Pending
    // requests don't yet deduct, but the test still proves the cancel
    // didn't go the wrong way (e.g. accidentally deducting on cancel).
    const balancesBefore = await getLeaveBalances(empCtx, EMPLOYEE_ID);
    const annualBefore = balancesBefore[1] ?? 0;

    const planted = await createLeaveRequest(empCtx, {
      leaveTypeId: 1,
      fromDate: '2026-11-23',
      toDate: '2026-11-25',
      reason: `${E2E_REASON_MARKER}-006 ${Date.now()}`,
    });
    expect(planted.status).toBe(1);
    await empCtx.dispose();

    // Act: open the leave detail, click Cancel Request, confirm.
    const login = new LoginPage(page);
    await login.loginAs('employee');
    await page.goto(`/employee/leave/${planted.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(planted.code);

    await page.getByRole('button', { name: /Cancel Request/i }).click();
    await page.getByRole('button', { name: /^Cancel Leave$/i }).click();

    // Assert (API): status flips to Cancelled (4) and Annual balance
    // matches the pre-plant value — Pending leaves don't deduct, so the
    // balance is unchanged either way, but it must NOT have dropped.
    const verifyCtx = await loginViaApi('employee');
    let final: { status: number } | null = null;
    for (let i = 0; i < 10; i++) {
      try {
        final = await getLeaveRequest(verifyCtx, planted.id);
        if (final.status === 4) break;
      } catch {
        // not yet propagated
      }
      await page.waitForTimeout(500);
    }
    expect(final?.status).toBe(4); // Cancelled

    const balancesAfter = await getLeaveBalances(verifyCtx, EMPLOYEE_ID);
    expect(balancesAfter[1]).toBe(annualBefore);
    await verifyCtx.dispose();
  });

  test('E2E-LEAVE-009 — Insufficient balance shows INSUFFICIENT_BALANCE block (BL-014)', async ({ page }) => {
    // Look up Kavya's Annual remaining via API; submit a request that
    // exceeds it by 1 day. Don't hard-code the over-shoot — quota
    // changes break that.
    const empCtx = await loginViaApi('employee');
    const balances = await getLeaveBalances(empCtx, EMPLOYEE_ID);
    const annualRemaining = balances[1] ?? 0;
    await empCtx.dispose();

    // We want N+1 days. Pick a far-future range so we don't overlap.
    const fromDate = '2026-12-07';
    const days = annualRemaining + 1;
    const toDateObj = new Date(fromDate);
    toDateObj.setUTCDate(toDateObj.getUTCDate() + (days - 1));
    const toDate = toDateObj.toISOString().slice(0, 10);

    const login = new LoginPage(page);
    await login.loginAs('employee');
    await page.goto('/employee/leave/new');
    await page.waitForLoadState('networkidle');

    await page.locator('#leaveTypeId').selectOption('1');
    await page.locator('#fromDate').fill(fromDate);
    await page.locator('#toDate').fill(toDate);
    await page
      .locator('#reason')
      .fill(`${E2E_REASON_MARKER}-009 ${Date.now()}`);

    await page.getByRole('button', { name: /Submit Request/i }).click();

    // Assert: form stays on /new, INSUFFICIENT_BALANCE block visible.
    // ConflictErrorBlock heading is "Insufficient leave balance".
    await expect(page).toHaveURL(/\/employee\/leave\/new$/);
    await expect(page.locator('body')).toContainText(/insufficient.*balance/i);
  });
});
