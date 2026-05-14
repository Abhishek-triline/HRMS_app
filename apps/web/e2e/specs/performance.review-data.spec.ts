import { test, expect } from '@playwright/test';
import { loginViaApi } from '../fixtures/api';

/**
 * Performance — review + goal data shape (BL-038 / BL-040 / BL-041).
 *
 * Reads the seeded cycle (C-2025-H2, closed) and asserts:
 *   - Reviews exist and carry locked final ratings.
 *   - Each review has 3–5 goals attached (BL-038 manager-set range).
 *
 * Pure-API. Sub-2s. Guards against ORM / projection regressions in
 * the performance module's response shape — the kind of bug that
 * silently nulls out fields the UI counts on.
 *
 * Implements:
 *   E2E-PERF-DATA-001 — Closed-cycle reviews have a numeric
 *                       finalRating in [1,5] and managerName.
 *   E2E-PERF-DATA-002 — Each closed-cycle review has 3..=5 goals
 *                       (BL-038 — manager sets a band of 3-5 goals
 *                       per employee per cycle).
 */

test.describe('E2E-PERF @smoke', () => {
  test('E2E-PERF-DATA-001 — Closed-cycle reviews carry final ratings', async ({}) => {
    const ctx = await loginViaApi('admin');
    const res = await ctx.get('/api/v1/performance/reviews?cycleId=1&limit=20');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const reviews: Array<{
      id: number;
      finalRating: number | null;
      managerName: string;
      employeeName: string;
    }> = body?.data ?? [];

    expect(reviews.length).toBeGreaterThan(0);

    // At least one review must be fully locked (finalRating set).
    // For cycles closed in the seed, every non-skipped review is
    // locked — but mid-cycle joiners may have null ratings (BL-037).
    const rated = reviews.filter((r) => r.finalRating != null);
    expect(rated.length).toBeGreaterThan(0);
    for (const r of rated) {
      expect(r.finalRating).toBeGreaterThanOrEqual(1);
      expect(r.finalRating).toBeLessThanOrEqual(5);
      expect(typeof r.managerName).toBe('string');
      expect(typeof r.employeeName).toBe('string');
    }

    await ctx.dispose();
  });

  test('E2E-PERF-DATA-002 — Each rated review has 3..=5 goals (BL-038)', async ({}) => {
    const ctx = await loginViaApi('admin');
    const listRes = await ctx.get('/api/v1/performance/reviews?cycleId=1&limit=10');
    expect(listRes.ok()).toBe(true);
    const reviews: Array<{ id: number; finalRating: number | null }> =
      (await listRes.json())?.data ?? [];

    // Sample up to 3 rated reviews so the spec stays sub-second even
    // if the seed grows. Mid-cycle joiners (no rating) are skipped
    // because BL-038 only requires goals for participating reviews.
    const sample = reviews.filter((r) => r.finalRating != null).slice(0, 3);
    expect(sample.length).toBeGreaterThan(0);

    for (const review of sample) {
      const detailRes = await ctx.get(`/api/v1/performance/reviews/${review.id}`);
      expect(detailRes.ok()).toBe(true);
      const detail = (await detailRes.json())?.data ?? {};
      const goals: unknown[] = detail.goals ?? [];
      expect(goals.length, `review ${review.id} should have 3-5 goals`).toBeGreaterThanOrEqual(3);
      expect(goals.length, `review ${review.id} should have 3-5 goals`).toBeLessThanOrEqual(5);
    }

    await ctx.dispose();
  });
});
