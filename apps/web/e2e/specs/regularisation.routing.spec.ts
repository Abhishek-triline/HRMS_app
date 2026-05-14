import { test, expect } from '@playwright/test';
import { loginViaApi } from '../fixtures/api';

/**
 * Regularisation routing by age (BL-029).
 *
 * Records ≤ 7 days old route to the direct Manager; records older
 * than 7 days route to Admin. Server-side enforced — the test
 * submits via the API as the employee and inspects the routedToId
 * on the resulting row.
 *
 *   routedToId = 1 → Manager
 *   routedToId = 2 → Admin
 *
 * Implements:
 *   E2E-REG-001 — ≤7 days → routes to the employee's Manager.
 *   E2E-REG-002 — >7 days → routes to Admin.
 *
 * Cleanup: the regularisation API has no requester-side withdraw
 * endpoint, so each test rejects its own row as the approver (Admin
 * can reject anything; Manager rejects its own queue). beforeEach
 * rejects any pending E2E-tagged regs left behind by a failed run.
 */

const E2E_REASON_MARKER = 'E2E-REG-ROUTE';

async function rejectAllStaleE2ERegs() {
  const adminCtx = await loginViaApi('admin');
  try {
    // Admin can see and reject everything. List all pending regs and
    // reject anything carrying our marker.
    const res = await adminCtx.get('/api/v1/regularisations?status=1&limit=100');
    if (!res.ok()) return;
    const body = await res.json();
    const items: Array<{ id: number; reason: string }> = body?.data ?? [];
    for (const r of items) {
      if (!r.reason?.startsWith(E2E_REASON_MARKER)) continue;
      const cur = await adminCtx.get(`/api/v1/regularisations/${r.id}`);
      if (!cur.ok()) continue;
      const curBody = await cur.json();
      const version = curBody?.data?.version ?? 0;
      await adminCtx.post(`/api/v1/regularisations/${r.id}/reject`, {
        data: { note: 'e2e cleanup', version },
      });
    }
  } finally {
    await adminCtx.dispose();
  }
}

test.describe('E2E-REG @smoke', () => {
  test.beforeEach(async () => {
    await rejectAllStaleE2ERegs();
  });

  test('E2E-REG-001 — ≤ 7 days old regularisation routes to Manager (BL-029)', async ({}) => {
    const ctx = await loginViaApi('employee');
    // Date within the 7-day window. Avoid Kavya's seeded leaves
    // (L-2026-0018 covers May 4–5); 2026-05-12 is 2 days back, free.
    const date = '2026-05-12';
    const reason = `${E2E_REASON_MARKER}-001 ${Date.now()} — late after traffic jam`;
    const createRes = await ctx.post('/api/v1/regularisations', {
      data: {
        date,
        proposedCheckIn: '09:30',
        proposedCheckOut: '18:00',
        reason,
      },
    });
    expect(createRes.ok(), await createRes.text()).toBe(true);
    const body = await createRes.json();
    const row = body?.data?.regularisation ?? body?.data;

    expect(row.routedToId).toBe(1); // Manager
    expect(row.approverName).toMatch(/Arjun/i);
    await ctx.dispose();
  });

  test('E2E-REG-002 — > 7 days old regularisation routes to Admin (BL-029)', async ({}) => {
    const ctx = await loginViaApi('employee');
    // 29 days back — well outside the 7-day window.
    const date = '2026-04-15';
    const reason = `${E2E_REASON_MARKER}-002 ${Date.now()} — forgot to check in`;
    const createRes = await ctx.post('/api/v1/regularisations', {
      data: {
        date,
        proposedCheckIn: '09:45',
        proposedCheckOut: '18:30',
        reason,
      },
    });
    expect(createRes.ok(), await createRes.text()).toBe(true);
    const body = await createRes.json();
    const row = body?.data?.regularisation ?? body?.data;

    expect(row.routedToId).toBe(2); // Admin
    expect(row.approverName).toMatch(/Priya/i);
    await ctx.dispose();
  });
});
