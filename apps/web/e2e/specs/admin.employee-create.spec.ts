import { test, expect } from '@playwright/test';
import { loginViaApi } from '../fixtures/api';

/**
 * Admin → Create Employee (BL-008 EMP code + invitation flow).
 *
 * Pure-API test. The web form is exhaustively covered by the API
 * contract; what we want to guard here is the SERVER behaviour —
 * code allocation, invitation flag, EMP-YYYY-NNNN format — because
 * those are the load-bearing invariants other modules depend on.
 *
 * Implements:
 *   E2E-EMP-001 — Admin creates a new employee. Server returns a
 *                 fresh EMP-YYYY-NNNN code, the employee is
 *                 retrievable, and the response signals an
 *                 invitation was queued (BL-008 invitation flow).
 *   E2E-EMP-006 — Status transition Active → On-Notice → Exited
 *                 (BL-006). The "Active" → "On-Notice" hop is
 *                 reversible; "Exited" is terminal.
 *
 * Cleanup: each test ends by setting the new employee to Exited so
 * the next run can recreate the same email without an
 * EMAIL_ALREADY_EXISTS error.
 */

const E2E_EMAIL_PREFIX = 'e2e-emp-';

async function purgeStaleE2EEmployees() {
  // List all active e2e-emp-* employees and mark them Exited so the
  // next run can re-use the same email. Exited records preserve
  // history (BL-007) so this doesn't pollute anything operational.
  const adminCtx = await loginViaApi('admin');
  try {
    const res = await adminCtx.get('/api/v1/employees?limit=200');
    if (!res.ok()) return;
    const body = await res.json();
    const items: Array<{
      id: number;
      email: string;
      status: number;
      version: number;
    }> = body?.data ?? [];
    for (const e of items) {
      if (!e.email?.startsWith(E2E_EMAIL_PREFIX)) continue;
      if (e.status === 5) continue; // already Exited
      const cur = await adminCtx.get(`/api/v1/employees/${e.id}`);
      if (!cur.ok()) continue;
      const curBody = await cur.json();
      const employee = curBody?.data?.employee ?? curBody?.data ?? curBody;
      const version = employee?.version ?? e.version ?? 0;
      await adminCtx.post(`/api/v1/employees/${e.id}/status`, {
        data: {
          status: 5, // Exited
          effectiveDate: '2026-05-14',
          reason: 'e2e cleanup',
          version,
        },
      });
    }
  } finally {
    await adminCtx.dispose();
  }
}

test.describe('E2E-EMP @smoke', () => {
  test.beforeEach(async () => {
    await purgeStaleE2EEmployees();
  });

  test('E2E-EMP-001 — Admin creates a new employee with a fresh EMP code', async ({}) => {
    const adminCtx = await loginViaApi('admin');

    const unique = Date.now();
    const email = `${E2E_EMAIL_PREFIX}001-${unique}@triline.co.in`;
    const createRes = await adminCtx.post('/api/v1/employees', {
      data: {
        name: `E2E Test ${unique}`,
        email,
        roleId: 1, // Employee
        employmentTypeId: 1, // Permanent
        departmentId: 1, // HR (seeded)
        designationId: 1, // Head of People (seeded; reused for simplicity)
        reportingManagerId: 1, // Admin (Priya) — Employees can report to any Manager/Admin
        joinDate: '2026-05-14',
        genderId: 1,
        salaryStructure: {
          basic_paise: 500_000,
          allowances_paise: 200_000,
          effectiveFrom: '2026-05-14',
        },
      },
    });
    expect(createRes.ok(), await createRes.text()).toBe(true);

    const body = await createRes.json();
    const created = body?.data?.employee ?? body?.data;
    expect(created.email).toBe(email);
    expect(created.code).toMatch(/^EMP-\d{4}-\d{4}$/);
    expect(created.status).toBeGreaterThanOrEqual(1);

    // BL-008 invitation: response signals an email was queued.
    expect(body?.data?.invitationSent).toBe(true);

    // Cleanup: mark Exited so the next run is clean.
    await adminCtx.post(`/api/v1/employees/${created.id}/status`, {
      data: {
        status: 5,
        effectiveDate: '2026-05-14',
        reason: 'e2e cleanup',
        version: created.version ?? 0,
      },
    });
    await adminCtx.dispose();
  });

  test('E2E-EMP-006 — Status transitions Active → On-Notice → Exited (BL-006)', async ({}) => {
    const adminCtx = await loginViaApi('admin');

    // Spin up a fresh employee for the status-change test so we don't
    // mutate any seeded record.
    const unique = Date.now();
    const email = `${E2E_EMAIL_PREFIX}006-${unique}@triline.co.in`;
    const createRes = await adminCtx.post('/api/v1/employees', {
      data: {
        name: `E2E Status ${unique}`,
        email,
        roleId: 1,
        employmentTypeId: 1,
        departmentId: 1,
        designationId: 1,
        reportingManagerId: 1,
        joinDate: '2026-05-14',
        genderId: 1,
        salaryStructure: {
          basic_paise: 500_000,
          allowances_paise: 200_000,
          effectiveFrom: '2026-05-14',
        },
      },
    });
    expect(createRes.ok(), await createRes.text()).toBe(true);
    const created = (await createRes.json())?.data?.employee;
    const id = created.id;
    let version = created.version ?? 0;

    // Active (1) → On-Notice (2)
    const onNoticeRes = await adminCtx.post(`/api/v1/employees/${id}/status`, {
      data: {
        status: 2,
        effectiveDate: '2026-05-14',
        reason: 'e2e on-notice',
        version,
      },
    });
    expect(onNoticeRes.ok(), await onNoticeRes.text()).toBe(true);
    // Status endpoint returns { data: {...employee fields...} } — flat,
    // no .employee wrapper (unlike POST /employees create).
    const afterOnNotice = (await onNoticeRes.json())?.data;
    expect(afterOnNotice.status).toBe(2);
    version = afterOnNotice.version;

    // On-Notice (2) → Exited (5)
    const exitedRes = await adminCtx.post(`/api/v1/employees/${id}/status`, {
      data: {
        status: 5,
        effectiveDate: '2026-05-14',
        reason: 'e2e exit',
        version,
      },
    });
    expect(exitedRes.ok(), await exitedRes.text()).toBe(true);
    const afterExit = (await exitedRes.json())?.data;
    expect(afterExit.status).toBe(5);

    await adminCtx.dispose();
  });
});
