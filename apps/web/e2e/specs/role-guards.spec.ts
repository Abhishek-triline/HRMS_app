import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Cross-role guard tests — read-only.
 *
 * Implements:
 *   E2E-MGR-LEAVE-006 — Manager cannot access admin payroll routes.
 *   E2E-PAY-008 — Payroll Officer cannot initiate reversal (BL-033).
 *
 * Both rely on the role-aware redirect helper (pathForOtherRole) plus
 * server-side gating. We assert the user lands somewhere OTHER than the
 * forbidden admin route.
 */

test.describe('E2E-ROLE @smoke', () => {
  test('E2E-MGR-LEAVE-006 — Manager hitting /admin/payroll-runs is bounced', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('manager');

    await page.goto('/admin/payroll-runs');
    await page.waitForLoadState('networkidle');
    // The redirect should land the manager on their own scope. Could be
    // /manager/dashboard or /manager/payroll-runs (if the helper preserves
    // the rest of the path). Either way: not under /admin/.
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test('E2E-PAY-008 — Payroll Officer cannot land on /admin/reversal-history', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('payroll');

    await page.goto('/admin/reversal-history');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/admin\//);
  });
});
