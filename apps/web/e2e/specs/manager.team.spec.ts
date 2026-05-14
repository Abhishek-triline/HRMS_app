import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Manager → My Team smoke tests — read-only.
 *
 * Implements:
 *   E2E-MGR-TEAM-001 — Both "Current Team" and "Past Team Members" tabs
 *                      are present on /manager/team (BL-022a). The Past
 *                      tab is the historical record retained for audit.
 *
 *   E2E-MGR-TEAM-002 — Switching to the Past Team Members tab does not
 *                      surface approve / reject affordances — those
 *                      rights moved with the reporting line and the
 *                      page must be visibly read-only.
 */

test.describe('E2E-MGR-TEAM @smoke', () => {
  test('E2E-MGR-TEAM-001 — Current Team + Past Team Members tabs are both visible', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('manager');

    await page.goto('/manager/team');
    await page.waitForLoadState('networkidle');

    // Both tabs must be in the DOM and reachable. Past Team Members is
    // mandatory for audit (BL-022a / BL-042) even when the manager has
    // never had anyone reassigned away from them.
    await expect(page.getByRole('tab', { name: /Current Team/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Past Team Members/i })).toBeVisible();
  });

  test('E2E-MGR-TEAM-002 — Past Team Members tab is read-only (no approve/reject buttons)', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('manager');

    await page.goto('/manager/team');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /Past Team Members/i }).click();

    // Inside the active tabpanel: no approve / reject affordances. Past
    // members can still be viewed (read-only profile link), but their
    // approval surfaces are gone.
    const panel = page.locator('[role="tabpanel"]:not([hidden])').first();
    await expect(panel.getByRole('button', { name: /^approve$/i })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: /^reject$/i })).toHaveCount(0);
  });
});
