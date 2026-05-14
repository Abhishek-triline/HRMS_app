import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Admin → Employees smoke tests — read-only, no DB reset required.
 *
 * Implements:
 *   E2E-EMP-007 — Exited employee detail page shows the read-only banner
 *                 and the Edit Salary / Change Manager / Edit Profile
 *                 actions are not rendered.
 *
 * Fixture used: EMP-2024-0017 — Riya Malhotra, status=Exited
 *               (exitDate 2026-04-30, seeded in apps/api/prisma/seed.ts).
 *
 * The employee's numeric id is not fixed across seed runs, so the spec
 * resolves the id by clicking through the directory rather than hitting
 * a hard-coded URL.
 */

test.describe('E2E-EMP @smoke', () => {
  test('E2E-EMP-007 — Exited employee detail page is read-only', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    // Navigate to the directory, search for Riya, and open her row.
    await page.goto('/admin/employees');
    await page.waitForLoadState('networkidle');

    // The directory has a search input; type the EMP code so the match is
    // deterministic regardless of seed ordering.
    const search = page.getByPlaceholder(/search/i).first();
    await expect(search).toBeVisible();
    await search.fill('EMP-2024-0017');

    // Click the resulting row's "View" or the name link.
    const row = page.getByRole('row', { name: /EMP-2024-0017/ });
    await expect(row).toBeVisible();
    await row.getByRole('link').first().click();

    // On the detail page now. Two strong invariants:
    //   1. The read-only banner is visible.
    //   2. The Edit Salary / Change Manager / Edit Profile affordances are
    //      not in the DOM at all.
    await expect(page.getByText(/Read-only record/i)).toBeVisible();

    await expect(page.getByRole('button', { name: /Edit Salary/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Change Manager/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Edit Profile/i })).toHaveCount(0);
  });

  test('E2E-EMP-009 — Detail-page tabs render scoped data, not placeholders', async ({ page }) => {
    // Use Kavya (EMP-2024-0003) — known to have seeded leaves, attendance,
    // payslips. Without this regression guard, the three non-leave tabs
    // were placeholder cards linking to admin-self pages that ignored the
    // employeeId query param.
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/admin/employees');
    await page.waitForLoadState('networkidle');
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('EMP-2024-0003');
    const row = page.getByRole('row', { name: /EMP-2024-0003/ });
    await expect(row).toBeVisible();
    await row.getByRole('link').first().click();
    await page.waitForLoadState('networkidle');

    // The tab card lives at the bottom of the detail page. None of the
    // four tabs should render the old "View Full Attendance →" /
    // "View All Payslips →" / "View All Reviews →" links — those were the
    // placeholder affordances that linked to the wrong destinations.
    await expect(page.getByRole('link', { name: /View Full Attendance/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /View All Payslips/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /View All Reviews/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Full History/i })).toHaveCount(0);

    // Each tab is reachable and renders a proper <table> (either with
    // employee-scoped rows OR an empty-state row inside). The old
    // placeholder cards had no table — they had a single <p> + a link.
    for (const tabLabel of ['Attendance Summary', 'Payslips', 'Reviews']) {
      await page.getByRole('tab', { name: tabLabel }).click();
      const activePanel = page.locator('[role="tabpanel"]:not([hidden])').first();
      await expect(activePanel.locator('table')).toBeVisible({ timeout: 5_000 });
    }
  });
});
