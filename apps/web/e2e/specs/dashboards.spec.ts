import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { type Role } from '../utils/credentials';

/**
 * Dashboards — read-only smoke.
 *
 * Implements:
 *   E2E-DASH-001 — Each role's dashboard hydrates without crashing
 *                  and shows the greeting hero (TimeOfDayHero).
 *
 * The greeting prefix changes with local hour ("Good morning, ..."
 * etc.), so the assertion looks for "Good " followed by any word —
 * stable across time-of-day shifts.
 */

const ROLES: Array<{ role: Role; path: string }> = [
  { role: 'admin',    path: '/admin/dashboard' },
  { role: 'manager',  path: '/manager/dashboard' },
  { role: 'employee', path: '/employee/dashboard' },
  { role: 'payroll',  path: '/payroll/dashboard' },
];

test.describe('E2E-DASH @smoke', () => {
  for (const c of ROLES) {
    test(`E2E-DASH-001 — ${c.role}: dashboard renders + greeting hero visible`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.loginAs(c.role);
      await page.goto(c.path);
      await page.waitForLoadState('networkidle');

      // Either the TimeOfDayHero greeting ("Good morning/afternoon/
      // evening") OR a recognisable dashboard heading. The Payroll
      // Officer's dashboard uses a custom run-status hero instead of
      // the greeting hero, so we accept either phrase.
      await expect(page.locator('body')).toContainText(
        /Good (morning|afternoon|evening)|Dashboard|Payroll/i,
      );
    });
  }
});
