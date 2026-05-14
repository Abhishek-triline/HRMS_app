import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Regression — leave-queue detail pages accept L-codes, not just
 * numeric ids.
 *
 * Discovered during Phase 4 of the Playwright migration. Both
 * `/manager/leave-queue/[id]` and `/admin/leave-queue/[id]` were
 * doing `useLeave(Number(id))` on the URL param, which turned
 * `"L-2026-0018"` into `NaN` and surfaced "Could not load leave
 * request" on notification deep-links. The API route had already
 * been widened in commit 941253b to accept either form — only the
 * front-end pages were behind. Fix lives on main as a6f0fdc.
 *
 * Implements:
 *   E2E-LEAVE-QUEUE-BY-CODE-001 — Manager opens
 *      /manager/leave-queue/L-2026-NNNN and the request renders
 *      (no "Could not load" error block).
 *   E2E-LEAVE-QUEUE-BY-CODE-002 — Same for Admin.
 *
 * Fixture: any seeded leave that the role can see. We pick the
 * first row returned by the leave list (scoped server-side to the
 * caller's permissions).
 */

async function findVisibleLeaveCode(
  page: import('@playwright/test').Page,
): Promise<string | null> {
  const res = await page.request.get(
    'http://localhost:4000/api/v1/leave/requests?limit=5',
  );
  if (!res.ok()) return null;
  const body = await res.json();
  const items: Array<{ code: string }> = body?.data ?? [];
  return items[0]?.code ?? null;
}

test.describe('E2E-LEAVE @smoke', () => {
  test('E2E-LEAVE-QUEUE-BY-CODE-001 — Manager opens leave-queue by L-code', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('manager');

    const code = await findVisibleLeaveCode(page);
    expect(code, 'manager should see at least one leave in their queue').toBeTruthy();

    await page.goto(`/manager/leave-queue/${code}`);
    await page.waitForLoadState('networkidle');

    // Old failure mode: this page rendered the generic
    // "Could not load leave request." error block. The fix ensures
    // the actual request data hydrates instead.
    await expect(page.locator('body')).not.toContainText(/Could not load leave request/i);
    await expect(page.locator('body')).toContainText(code!);
  });

  test('E2E-LEAVE-QUEUE-BY-CODE-002 — Admin opens leave-queue by L-code', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    const code = await findVisibleLeaveCode(page);
    expect(code).toBeTruthy();

    await page.goto(`/admin/leave-queue/${code}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).not.toContainText(/Could not load leave request/i);
    await expect(page.locator('body')).toContainText(code!);
  });
});
