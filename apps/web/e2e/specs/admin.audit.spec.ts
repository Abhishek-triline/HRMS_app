import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Admin → Audit Log smoke tests — read-only.
 *
 * Implements:
 *   E2E-AUD-003 — Audit log rows have NO edit / delete affordances.
 *                 BL-047/BL-048 require the log to be append-only;
 *                 the UI must not even appear to allow mutation.
 */

test.describe('E2E-AUD @smoke', () => {
  test('E2E-AUD-003 — Audit log rows expose no edit or delete affordance', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/admin/audit-log');
    await page.waitForLoadState('networkidle');

    // Confirm we're on the right page.
    await expect(page.locator('body')).toContainText(/audit/i);

    // No "Edit" / "Delete" buttons within the audit log table.
    // Searching globally rather than per-row guards against future
    // refactors that might inline the controls outside <tr>.
    await expect(page.getByRole('button', { name: /^edit$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^delete$/i })).toHaveCount(0);

    // The "append-only" disclosure copy must be present (BL-047 trail).
    await expect(page.locator('body')).toContainText(/append-only/i);
  });

  test('E2E-AUD-001 — Module filter scopes all visible rows to the selected module', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/admin/audit-log');
    await page.waitForLoadState('networkidle');

    // Apply the Auth filter. Seed always produces login audit entries on
    // first run, so this returns a non-empty subset.
    const moduleSelect = page.getByLabel('Filter by module');
    await expect(moduleSelect).toBeVisible();
    await moduleSelect.selectOption({ value: 'auth' });
    await page.waitForLoadState('networkidle');

    // Every visible row must carry the "Sign-in" module badge — the
    // audit log component maps module=auth to that display label
    // (see moduleLabel() in AuditLogPageClient.tsx). Row count alone is
    // unreliable because the log paginates.
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/sign-?in/i);
    }
  });
});
