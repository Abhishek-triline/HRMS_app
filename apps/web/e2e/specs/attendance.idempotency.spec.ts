import { test, expect } from '@playwright/test';
import { loginViaApi } from '../fixtures/api';

/**
 * Attendance check-in / check-out idempotency (BL-024 / BL-027).
 *
 * The check-in endpoint is idempotent — a second call on the same
 * calendar day returns the existing record with
 * lateMarkDeductionApplied: false. The behaviour matters because
 * payroll's late-mark penalty (BL-028) must not double-fire if the
 * UI or a flaky network retries the request.
 *
 * Pure-API test — sub-2s, robust against any starting state of
 * today's attendance row.
 *
 * Implements:
 *   E2E-ATT-IDEMP-001 — Two consecutive POST /attendance/check-in
 *                       calls return the same record and the second
 *                       reports lateMarkDeductionApplied: false.
 *   E2E-ATT-IDEMP-002 — /attendance/me/today exposes the same
 *                       record and an identical lateMonthCount.
 */

test.describe('E2E-ATT @smoke', () => {
  test('E2E-ATT-IDEMP-001 — Repeat check-in is idempotent (BL-028 safe)', async ({}) => {
    const ctx = await loginViaApi('employee');

    // First call. May or may not flip state — we don't care here; the
    // assertion is purely about the second call's idempotency
    // signal.
    const first = await ctx.post('/api/v1/attendance/check-in');
    expect(first.ok(), await first.text()).toBe(true);
    const firstBody = await first.json();

    // Second call — must succeed and must NOT report a late-mark
    // deduction (the deduction can only fire once per crossing of
    // the threshold).
    const second = await ctx.post('/api/v1/attendance/check-in');
    expect(second.ok(), await second.text()).toBe(true);
    const secondBody = await second.json();

    expect(secondBody?.data?.lateMarkDeductionApplied).toBe(false);

    // Both responses describe the SAME attendance row id — proves
    // the server didn't duplicate.
    expect(secondBody?.data?.record?.id).toBe(firstBody?.data?.record?.id);

    await ctx.dispose();
  });

  test('E2E-ATT-IDEMP-002 — /me/today agrees with the check-in record', async ({}) => {
    const ctx = await loginViaApi('employee');

    // Ensure the row is in the Present state before reading /today.
    const ci = await ctx.post('/api/v1/attendance/check-in');
    expect(ci.ok()).toBe(true);
    const ciBody = await ci.json();
    const ciRecord = ciBody?.data?.record;

    const today = await ctx.get('/api/v1/attendance/me/today');
    expect(today.ok()).toBe(true);
    const todayBody = await today.json();
    const todayRecord = todayBody?.data?.record;

    // Same row, same status, same checkInTime.
    expect(todayRecord?.id).toBe(ciRecord?.id);
    expect(todayRecord?.status).toBe(ciRecord?.status);
    expect(todayRecord?.checkInTime).toBe(ciRecord?.checkInTime);

    // Late-mark month count must match the check-in response.
    expect(todayBody?.data?.lateMonthCount).toBe(ciBody?.data?.lateMonthCount);

    await ctx.dispose();
  });
});
