import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { CREDS, type Role } from '../utils/credentials';

/**
 * Authentication smoke tests.
 *
 * Implements:
 *   E2E-AUTH-001 — Login with correct password lands on role dashboard.
 *   E2E-AUTH-002 — Login with wrong password shows inline error.
 *   E2E-AUTH-006 — Direct-URL admin access as Employee → blocked.
 *
 * Mode: no DB reset required (read-only auth flows).
 */

test.describe('E2E-AUTH @smoke', () => {
  const roles: Role[] = ['admin', 'manager', 'employee', 'payroll'];

  for (const role of roles) {
    test(`E2E-AUTH-001 — ${role}: correct password lands on role dashboard`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.loginAs(role);
      await expect(page).toHaveURL(new RegExp(`${CREDS[role].dashboardPath}$`));
    });
  }

  test('E2E-AUTH-002 — wrong password shows inline error, no redirect', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submit(CREDS.admin.email, 'wrong-password');
    await expect(page).toHaveURL(/\/login/);
    // The auth route returns 401 with a generic message; the form surfaces it.
    await expect(page.locator('body')).toContainText(/invalid|incorrect|password/i);
  });

  test('E2E-AUTH-006 — Employee hitting /admin/employees gets redirected away', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('employee');
    await page.goto('/admin/employees');
    // The wrong-role redirect helper bounces the user back to their own scope.
    // Either an unauthorised UI or a redirect to the employee tree is acceptable
    // as long as we are not actually seeing the admin employee directory.
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/admin\/employees$/);
  });

  test('E2E-AUTH-005 — Sign Out lands back on /login and blocks dashboard access', async ({ page, context }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);

    // The sidebar renders Sign Out as a <button> via SignOutButton (not a
    // bare <a>) so the click can clear cookies + invalidate the React-
    // Query cache before navigating. Click it and wait for /login.
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 15_000 });

    // Direct-URL access to a protected page after logout must NOT render
    // the dashboard. The middleware should bounce back to /login.
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });
});
