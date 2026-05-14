import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Admin configuration & lookup surfaces — read-only smoke.
 *
 * Each route is admin-only and renders configuration data that the
 * system depends on (holidays, leave types, attendance thresholds,
 * tax slabs). These specs guard against hydration regressions —
 * exactly the kind of bug that quietly removes admin's only way to
 * tune the system.
 *
 * Implements:
 *   E2E-CFG-PAGES — Configuration / Holidays / Leave config / Tax
 *                   config / Leave balances all load for the Admin
 *                   account.
 *   E2E-CFG-001  — Configuration page exposes attendance settings
 *                  (late threshold, daily hours).
 *   E2E-CFG-HOLIDAY-LIST — Holidays page shows at least one seeded
 *                          holiday entry.
 */

const ADMIN_ROUTES = [
  { path: '/admin/configuration',     marker: /configuration|settings/i },
  { path: '/admin/holidays',          marker: /holiday/i },
  { path: '/admin/leave-config',      marker: /leave|carry.?forward|quota/i },
  { path: '/admin/tax-config',        marker: /tax/i },
  { path: '/admin/leave-balances',    marker: /balance|annual|sick/i },
  { path: '/admin/config/attendance', marker: /attendance|late|hours/i },
  { path: '/admin/config/leave',      marker: /leave|carry.?forward|escalation/i },
];

test.describe('E2E-CFG @smoke', () => {
  for (const r of ADMIN_ROUTES) {
    test(`E2E-CFG-PAGES — Admin loads ${r.path}`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.loginAs('admin');
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');

      // Some legacy paths redirect into the consolidated
      // /admin/configuration?tab=... surface (holidays, leave-config,
      // tax-config, config/attendance, config/leave). Asserting on the
      // body content alone covers both the live route and the
      // redirected target. We do require we stay under /admin/ —
      // anywhere outside would mean the role guard misfired.
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(r.marker);
      await expect(page).toHaveURL(/\/admin\//);
    });
  }

  test('E2E-CFG-001 — Configuration → Attendance shows late threshold input (configurable)', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');
    await page.goto('/admin/config/attendance');
    await page.waitForLoadState('networkidle');

    // The attendance config panel exposes a "Late check-in threshold"
    // field. The exact widget changes (time input vs select) but the
    // label and a default-time hint should always be present.
    await expect(page.locator('body')).toContainText(/late.*check.?in/i);
  });

  test('E2E-CFG-HOLIDAY-LIST — Holidays page shows at least one seeded holiday', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');
    await page.goto('/admin/holidays');
    await page.waitForLoadState('networkidle');

    // Seed creates Indian gazetted holidays for the realistic year.
    // Asserting on a year string (2026) is the most robust signal that
    // some rows rendered without naming any individual holiday.
    await expect(page.locator('body')).toContainText(/2026/);
  });
});
