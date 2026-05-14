import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Employee leave smoke tests — read-only, no DB reset required.
 *
 * Implements:
 *   E2E-LEAVE-008 — Cancel button is HIDDEN on Approved leaves with a
 *                   past fromDate (BL-019/BL-020 cancellation rules).
 *
 * Fixture used: L-2026-0018 — Kavya Reddy, Sick, 4–5 May 2026,
 *               status=Approved (seeded in apps/api/prisma/seed.ts).
 * SEED_TODAY = 2026-05-14, so fromDate is in the past.
 */

test.describe('E2E-LEAVE @smoke', () => {
  test('E2E-LEAVE-008 — Cancel button hidden on past-dated approved leave', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('employee');

    await page.goto('/employee/leave/L-2026-0018');

    // The leave detail page renders. Assert the request loaded by checking
    // for the code on the page.
    await expect(page.locator('body')).toContainText('L-2026-0018');

    // Cancel section is gated by the new canCancel rule: Pending OR
    // (Approved AND beforeStart). Today (2026-05-14) is after fromDate
    // (2026-05-04), so the entire Cancel section must not render.
    await expect(page.getByRole('button', { name: /Cancel Request/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Cancel This Request/i })).toHaveCount(0);
  });

  test('E2E-LEAVE-list — Leave list renders without crashing', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('employee');

    await page.goto('/employee/leave');
    // Wait for the network to settle and confirm the page rendered some
    // expected scaffold. Minimal assertion — protects against the kind of
    // hydration crash that masked the L-code routing bug earlier.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Leave|Balance|Pending|Approved/i);
  });

  test('E2E-LEAVE-011 — L-code and numeric id both resolve the detail page', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('employee');

    // Open by code — protects against the regression where the route used
    // Number(idOrCode), which made "L-2026-0018" → NaN → 404.
    await page.goto('/employee/leave/L-2026-0018');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('L-2026-0018');

    // Resolve the numeric id via the API and confirm the same detail page
    // loads when the route param is numeric — both code styles must work.
    const apiResp = await page.request.get(
      'http://localhost:4000/api/v1/leave/requests/L-2026-0018',
    );
    expect(apiResp.ok()).toBe(true);
    const body = await apiResp.json();
    const numericId = body?.data?.id ?? body?.id;
    expect(typeof numericId).toBe('number');

    await page.goto(`/employee/leave/${numericId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('L-2026-0018');
  });
});
