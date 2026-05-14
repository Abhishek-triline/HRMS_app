import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { type Role } from '../utils/credentials';

/**
 * UI smoke — sidebar active highlight.
 *
 * Implements:
 *   E2E-UI-002 — On every primary route the sidebar entry whose href
 *                matches the current path carries aria-current="page".
 *
 * This catches the kind of regression we hit when the "Regularise" page
 * had no matchPaths and dropped the My Attendance highlight on focus.
 *
 * Each role's first 2–3 primary routes are sampled. Doing every route
 * for every role would multiply the suite by ~25× for little extra signal.
 */

interface RouteCase {
  role: Role;
  path: string;
  /** Accessible name of the sidebar link that should be highlighted. */
  navLabel: string;
}

const CASES: RouteCase[] = [
  // Admin
  { role: 'admin',    path: '/admin/dashboard',          navLabel: 'Dashboard' },
  { role: 'admin',    path: '/admin/employees',          navLabel: 'Employees' },
  { role: 'admin',    path: '/admin/payroll-runs',       navLabel: 'Payroll Runs' },
  { role: 'admin',    path: '/admin/audit-log',          navLabel: 'Audit Log' },

  // Manager
  { role: 'manager',  path: '/manager/dashboard',        navLabel: 'Dashboard' },
  { role: 'manager',  path: '/manager/team',             navLabel: 'My Team' },

  // Employee
  { role: 'employee', path: '/employee/dashboard',       navLabel: 'Dashboard' },
  { role: 'employee', path: '/employee/leave',           navLabel: 'My Leave' },

  // PayrollOfficer
  { role: 'payroll',  path: '/payroll/dashboard',        navLabel: 'Dashboard' },
  { role: 'payroll',  path: '/payroll/payroll-runs',     navLabel: 'Payroll Runs' },
];

test.describe('E2E-UI @smoke', () => {
  for (const c of CASES) {
    test(`E2E-UI-002 — ${c.role}: ${c.path} highlights "${c.navLabel}"`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.loginAs(c.role);
      await page.goto(c.path);
      await page.waitForLoadState('networkidle');

      // The app renders the same Sidebar component twice — once in the
      // desktop wrapper (visible at lg+) and once inside the mobile
      // drawer (hidden at desktop viewport). Both DOM trees carry
      // aria-current="page". Filter by :visible so only the painted
      // sidebar is under test.
      const activeLink = page.locator('aside.nx-sidebar a[aria-current="page"]:visible');
      await expect(activeLink).toHaveCount(1);
      await expect(activeLink).toContainText(c.navLabel);
    });
  }
});
