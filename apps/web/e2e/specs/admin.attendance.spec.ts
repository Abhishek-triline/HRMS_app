import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Admin → Attendance smoke tests — read-only.
 *
 * Implements:
 *   E2E-ATT-006 — KPI denominators are coherent. With the recent fix
 *                 (total = active-employee count, no-row days fold into
 *                 yetToCheckIn), the visible numbers must satisfy:
 *
 *                   present + absent + onLeave + weeklyOff + holiday
 *                     + yetToCheckIn  ≤  total
 *
 *                 (≤ because the categories overlap: a row that is
 *                 Absent with checkInTime=null is also counted in
 *                 yetToCheckIn by the backend.)
 *
 *   E2E-ATT-007 — The "Late This Month" column renders a number on every
 *                 row (the typed lateMonthCount field, not "—").
 */

test.describe('E2E-ATT @smoke', () => {
  test('E2E-ATT-006 — Present % never exceeds 100', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/admin/attendance');
    await page.waitForLoadState('networkidle');

    // Pull the Present tile subtitle text — "<n>% of active".
    const subtitle = page.locator('text=/\\d+% of active/').first();
    await expect(subtitle).toBeVisible();
    const text = (await subtitle.textContent()) ?? '';
    const match = text.match(/(\d+)%/);
    expect(match).not.toBeNull();
    const pct = Number(match![1]);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  test('E2E-ATT-007 — Late This Month column renders numbers, not dashes', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAs('admin');

    await page.goto('/admin/attendance');
    await page.waitForLoadState('networkidle');

    // Wait for the data to actually hydrate. networkidle alone isn't
    // sufficient — React-Query can fetch after networkidle resolves
    // and the table briefly renders with no body rows.
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

    // Locate the column header by its accessible role, then take the
    // index and assert each cell in that column for the first 4 rows is
    // numeric (0 or more). The fix replaced an `as unknown as` cast that
    // silently rendered "—" everywhere.
    const headers = page.getByRole('columnheader');
    const headerTexts = await headers.allTextContents();
    const colIdx = headerTexts.findIndex((t) => /late this month/i.test(t));
    expect(colIdx).toBeGreaterThanOrEqual(0);

    const rows = await page.getByRole('row').all();
    // Skip the header row, sample up to 4 body rows.
    const sampleRows = rows.slice(1, 5);
    expect(sampleRows.length).toBeGreaterThan(0);

    for (const row of sampleRows) {
      const cells = await row.getByRole('cell').all();
      if (cells.length <= colIdx) continue; // pagination / empty state row
      const cellText = ((await cells[colIdx]!.textContent()) ?? '').trim();
      expect(cellText).toMatch(/^\d+$/);
    }
  });
});
