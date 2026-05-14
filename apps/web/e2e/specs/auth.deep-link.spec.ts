import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Wrong-role deep-link preservation.
 *
 * Implements:
 *   E2E-AUTH-007 — When a user lands on a path that belongs to a
 *                  different role's route group, the role layout
 *                  redirects them to the equivalent path under THEIR
 *                  role group instead of dropping them on the dashboard
 *                  (pathForOtherRole helper, lib/route/redirect-for-role.ts).
 *
 * Fixture: L-2026-0018 belongs to Kavya (Employee, EMP-2024-0003). Admin
 * has read access to every leave request, so the redirect must land on
 * /admin/leave/L-2026-0018 and the page must render the request.
 */

test.describe('E2E-AUTH @smoke', () => {
  test('E2E-AUTH-007 — Admin hitting /employee/leave/<code> is rewritten to /admin/leave/<code>', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/employee/leave/L-2026-0018');
    // The (admin) layout should rewrite the path before rendering anything
    // under the employee route group. Wait for the rewrite to complete.
    await page.waitForURL(/\/admin\/leave\/L-2026-0018/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/admin\/leave\/L-2026-0018$/);

    // Deep link is preserved end-to-end — the leave detail renders.
    await expect(page.locator('body')).toContainText('L-2026-0018');
  });

  test('E2E-AUTH-007b — Manager hitting /employee/payslips is rewritten to /manager/payslips', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('manager');

    await page.goto('/employee/payslips');
    // Role layout rewrites the path to /manager/payslips — the manager
    // does NOT get sent to their dashboard.
    await page.waitForURL(/\/manager\/payslips/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/manager\/payslips$/);
  });
});
