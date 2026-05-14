import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Performance — read-only smoke tests against seeded cycles.
 *
 * The seed creates two cycles:
 *   C-2025-H2  status=Closed   — has finalised ratings + locked UI
 *   C-2026-H1  status=Open     — currently in self-review window
 *
 * Implements:
 *   E2E-PERF-LIST-001 — Admin /admin/performance-cycles renders both
 *                       cycles with their codes visible.
 *   E2E-PERF-LIST-002 — Employee /employee/performance lands on the
 *                       review for the open cycle (or shows a clear
 *                       empty-state if no review row exists yet).
 *   E2E-PERF-CLOSED   — A review under the closed cycle exposes its
 *                       final rating and does NOT render an editable
 *                       self-rating control (BL-041 cycle-close lock).
 */

test.describe('E2E-PERF @smoke', () => {
  test('E2E-PERF-LIST-001 — Admin cycle list shows both seeded cycles', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/admin/performance-cycles');
    await page.waitForLoadState('networkidle');

    // The seeded cycle codes are static and verifiable on the rendered list.
    await expect(page.locator('body')).toContainText('C-2025-H2');
    await expect(page.locator('body')).toContainText('C-2026-H1');
  });

  test('E2E-PERF-LIST-002 — Employee performance page renders without crashing', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('employee');

    await page.goto('/employee/performance');
    await page.waitForLoadState('networkidle');

    // Either a populated review surface OR a clear empty-state copy.
    // Both are acceptable — what we're guarding against is hydration
    // crashes / 500s. The presence of either phrase signals the page
    // rendered something coherent.
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/cycle|review|rating|self.?rev|no.*review/i);
  });

  test('E2E-PERF-CLOSED — Closed-cycle review has no editable self-rating control (BL-041)', async ({ page }) => {
    // Use the API to find a review under the closed cycle (C-2025-H2,
    // seeded as cycleId=1) — avoids guessing the cycle detail page's
    // link structure. The /performance/reviews?cycleId= endpoint is
    // available to Admin.
    const login = new LoginPage(page);
    await login.loginAs('admin');

    const reviewsRes = await page.request.get(
      'http://localhost:4000/api/v1/performance/reviews?cycleId=1&limit=1',
    );
    expect(reviewsRes.ok()).toBe(true);
    const reviewsBody = await reviewsRes.json();
    const firstReview = reviewsBody?.data?.[0];
    expect(firstReview, 'closed cycle should have at least one review').toBeDefined();

    await page.goto(`/admin/performance/${firstReview.id}`);
    await page.waitForLoadState('networkidle');

    // Server-side enforcement is BL-041: after closure, ratings are
    // locked. UI-side, the closed-cycle review banner reads "Final
    // rating locked at cycle close" — same string we covered when
    // stripping BL-XXX from copy.
    await expect(page.locator('body')).toContainText(
      /Final rating locked at cycle close/i,
    );

    // And the editable self-rating form must NOT be present. A locked
    // review may show a read-only summary; the giveaway is the absence
    // of a "Save Self Rating" / "Submit Self Rating" button.
    await expect(
      page.getByRole('button', { name: /Save Self Rating|Submit Self Rating/i }),
    ).toHaveCount(0);
  });
});
