/**
 * roleNavConfig.ts — shared nav configuration for Sidebar + MobileDrawer.
 *
 * Structure matches the prototype exactly:
 *   - admin/dashboard.html
 *   - manager/dashboard.html
 *   - employee/dashboard.html
 *   - payroll-officer/dashboard.html
 *
 * Each role has a flat list of NavEntry items plus an optional subhead label
 * (type: 'subhead') and dividers (type: 'divider').
 */

/** Role IDs match master `roles` table: 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin. */
export type RoleKey = 'Admin' | 'Manager' | 'Employee' | 'PayrollOfficer';

// ── Icon paths (Heroicons outline, 24px viewBox) ─────────────────────────────

const ICONS = {
  dashboard:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  employees:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  leave: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  attendance: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  payroll:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  performance:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  configuration:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  profile:
    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  signOut:
    'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  myTeam:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  regularisation:
    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  payslips:
    'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  review:
    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  leaveQueue:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  encashment:
    'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  reversal: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  reports:
    'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  myAttendance:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  checkin:
    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  auditLog:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
} as const;

// ── Nav entry types ───────────────────────────────────────────────────────────

export interface NavLink {
  type: 'link';
  label: string;
  href: string;
  iconPath: string;
  /** Renders with crimson hover (sign-out) */
  danger?: boolean;
}

export interface NavSubhead {
  type: 'subhead';
  label: string;
}

export interface NavDivider {
  type: 'divider';
}

export type NavEntry = NavLink | NavSubhead | NavDivider;

// ── Role nav configs ──────────────────────────────────────────────────────────

const adminNav: NavEntry[] = [
  { type: 'link', label: 'Dashboard',            href: '/admin/dashboard',               iconPath: ICONS.dashboard },
  { type: 'link', label: 'Employees',            href: '/admin/employees',               iconPath: ICONS.employees },
  { type: 'link', label: 'Leave',                href: '/admin/leave-queue',             iconPath: ICONS.leave },
  { type: 'link', label: 'Encashment Queue',     href: '/admin/leave-encashment-queue',  iconPath: ICONS.encashment },
  { type: 'link', label: 'Attendance',           href: '/admin/attendance',              iconPath: ICONS.attendance },
  { type: 'link', label: 'Payroll',              href: '/admin/payroll-runs',            iconPath: ICONS.payroll },
  { type: 'link', label: 'Performance',          href: '/admin/performance-cycles',      iconPath: ICONS.performance },
  { type: 'link', label: 'Audit Log',            href: '/admin/audit-log',               iconPath: ICONS.auditLog },
  { type: 'link', label: 'Configuration',        href: '/admin/configuration',           iconPath: ICONS.configuration },
  { type: 'subhead', label: 'My Records' },
  { type: 'link', label: 'My Leave',             href: '/admin/leave',                   iconPath: ICONS.leave },
  { type: 'link', label: 'My Encashment',        href: '/admin/leave-encashment',        iconPath: ICONS.encashment },
  { type: 'link', label: 'My Attendance',        href: '/admin/attendance?scope=me',     iconPath: ICONS.myAttendance },
  { type: 'link', label: 'Check In',             href: '/admin/checkin',                 iconPath: ICONS.checkin },
  { type: 'link', label: 'My Payslips',          href: '/admin/payslips',                iconPath: ICONS.payslips },
  { type: 'link', label: 'My Review',            href: '/admin/my-review',               iconPath: ICONS.review },
  { type: 'divider' },
  { type: 'link', label: 'My Profile', href: '/admin/profile',       iconPath: ICONS.profile },
  { type: 'link', label: 'Sign Out',   href: '/api/auth/signout',    iconPath: ICONS.signOut, danger: true },
];

const managerNav: NavEntry[] = [
  { type: 'link', label: 'Dashboard',              href: '/manager/dashboard',               iconPath: ICONS.dashboard },
  { type: 'link', label: 'My Team',                href: '/manager/team',                    iconPath: ICONS.myTeam },
  { type: 'link', label: 'Leave Queue',            href: '/manager/leave-queue',             iconPath: ICONS.leaveQueue },
  { type: 'link', label: 'Encashment Queue',       href: '/manager/leave-encashment-queue',  iconPath: ICONS.encashment },
  { type: 'link', label: 'Regularisation Queue',   href: '/manager/regularisation-queue',    iconPath: ICONS.regularisation },
  { type: 'link', label: 'Performance',            href: '/manager/performance',             iconPath: ICONS.performance },
  { type: 'subhead', label: 'My Records' },
  { type: 'link', label: 'My Leave',               href: '/manager/leave',                   iconPath: ICONS.leave },
  { type: 'link', label: 'My Encashment',          href: '/manager/leave-encashment',        iconPath: ICONS.encashment },
  { type: 'link', label: 'My Attendance',          href: '/manager/attendance',              iconPath: ICONS.myAttendance },
  { type: 'link', label: 'Check In',               href: '/manager/checkin',                 iconPath: ICONS.checkin },
  { type: 'link', label: 'My Reviews',             href: '/manager/my-review',               iconPath: ICONS.review },
  { type: 'link', label: 'My Payslips',            href: '/manager/payslips',                iconPath: ICONS.payslips },
  { type: 'divider' },
  { type: 'link', label: 'My Profile', href: '/manager/profile',   iconPath: ICONS.profile },
  { type: 'link', label: 'Sign Out',   href: '/api/auth/signout',  iconPath: ICONS.signOut, danger: true },
];

const employeeNav: NavEntry[] = [
  { type: 'link', label: 'Dashboard',      href: '/employee/dashboard',           iconPath: ICONS.dashboard },
  { type: 'link', label: 'My Leave',       href: '/employee/leave',               iconPath: ICONS.leave },
  { type: 'link', label: 'My Encashment',  href: '/employee/leave-encashment',    iconPath: ICONS.encashment },
  { type: 'link', label: 'My Attendance',  href: '/employee/attendance',          iconPath: ICONS.myAttendance },
  { type: 'link', label: 'Check In',       href: '/employee/checkin',             iconPath: ICONS.checkin },
  { type: 'link', label: 'My Payslips',    href: '/employee/payslips',            iconPath: ICONS.payslips },
  { type: 'link', label: 'My Reviews',     href: '/employee/performance',         iconPath: ICONS.review },
  { type: 'divider' },
  { type: 'link', label: 'My Profile', href: '/employee/profile',  iconPath: ICONS.profile },
  { type: 'link', label: 'Sign Out',   href: '/api/auth/signout',  iconPath: ICONS.signOut, danger: true },
];

const payrollNav: NavEntry[] = [
  { type: 'link', label: 'Dashboard',        href: '/payroll/dashboard',           iconPath: ICONS.dashboard },
  { type: 'link', label: 'Payroll Runs',     href: '/payroll/payroll-runs',        iconPath: ICONS.payroll },
  { type: 'link', label: 'Reports',          href: '/payroll/reports',             iconPath: ICONS.reports },
  { type: 'link', label: 'Reversal History', href: '/payroll/reversal-history',    iconPath: ICONS.reversal },
  { type: 'subhead', label: 'My Records' },
  { type: 'link', label: 'My Leave',         href: '/payroll/leave',               iconPath: ICONS.leave },
  { type: 'link', label: 'My Encashment',    href: '/payroll/leave-encashment',    iconPath: ICONS.encashment },
  { type: 'link', label: 'My Attendance',    href: '/payroll/attendance',          iconPath: ICONS.myAttendance },
  { type: 'link', label: 'Check In',         href: '/payroll/checkin',             iconPath: ICONS.checkin },
  { type: 'link', label: 'My Payslips',      href: '/payroll/payslips',            iconPath: ICONS.payslips },
  { type: 'link', label: 'My Reviews',       href: '/payroll/my-review',           iconPath: ICONS.review },
  { type: 'divider' },
  { type: 'link', label: 'My Profile', href: '/payroll/profile',   iconPath: ICONS.profile },
  { type: 'link', label: 'Sign Out',   href: '/api/auth/signout',  iconPath: ICONS.signOut, danger: true },
];

export const navByRole: Record<RoleKey, NavEntry[]> = {
  Admin:         adminNav,
  Manager:       managerNav,
  Employee:      employeeNav,
  PayrollOfficer: payrollNav,
};

/**
 * Convert a roleId (INT) to the RoleKey string used for nav lookup.
 * Falls back to 'Employee' for unknown codes.
 */
export function roleIdToKey(roleId: number): RoleKey {
  switch (roleId) {
    case 4: return 'Admin';
    case 2: return 'Manager';
    case 3: return 'PayrollOfficer';
    default: return 'Employee';
  }
}
