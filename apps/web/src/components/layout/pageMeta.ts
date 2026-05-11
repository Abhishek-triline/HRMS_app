/**
 * Page meta — title + subtitle per route, mirrored from the prototype
 * <header> markup of each *.html file under `prototype/`.
 *
 * Resolution order (TopBar.tsx uses this):
 *   1. Exact match against pathname.
 *   2. Longest-prefix match for dynamic routes (e.g. /admin/employees/123
 *      falls back to /admin/employees/[id] if registered, else /admin/employees).
 *
 * Subtitle placeholders:
 *   {date}  — replaced with the current date in "Wednesday, 7 May 2026" format.
 */

export interface PageMeta {
  title: string;
  /** Static text; may contain "{date}" which is substituted at render. */
  subtitle?: string;
}

export const PAGE_META: Record<string, PageMeta> = {
  // ── Admin ───────────────────────────────────────────────────────────────────
  '/admin/dashboard':                 { title: 'Dashboard',                        subtitle: '{date}' },
  '/admin/employees':                 { title: 'Employee Directory' },
  '/admin/employees/new':             { title: 'Create Employee' },
  '/admin/leave-queue':               { title: 'Leave Approval Queue',             subtitle: 'Escalated requests & maternity approvals' },
  '/admin/leave':                     { title: 'My Leave',                         subtitle: 'No reporting manager · routes to Admin queue' },
  '/admin/leave/new':                 { title: 'Apply for Leave' },
  '/admin/attendance':                { title: 'Attendance Overview',              subtitle: 'Org-wide attendance · {date}' },
  '/admin/regularisation':            { title: 'Regularisation Request' },
  '/admin/regularisation-queue':      { title: 'Regularisation Approval Queue' },
  '/admin/checkin':                   { title: 'Check In / Out' },
  '/admin/payroll-runs':              { title: 'Payroll Runs',                     subtitle: 'FY 2026-27 · April 2026 onwards' },
  '/admin/payroll-runs/new':          { title: 'Initiate Payroll Run' },
  '/admin/payslips':                  { title: 'My Payslips' },
  '/admin/reversal-history':          { title: 'Reversal History' },
  '/admin/tax-config':                { title: 'Tax Settings (v1)' },
  '/admin/leave-config':              { title: 'Leave Configuration' },
  '/admin/performance-cycles':        { title: 'Performance Cycles',               subtitle: 'Half-yearly review cycles · April–September & October–March' },
  '/admin/my-review':                 { title: 'My Performance Review',            subtitle: 'Cycle 1 · FY 2026-27 · April–September 2026' },
  '/admin/audit-log':                 { title: 'Audit Log' },
  '/admin/configuration':             { title: 'System Configuration' },
  '/admin/notifications':             { title: 'Notifications' },
  '/admin/profile':                   { title: 'My Profile' },

  // ── Manager ─────────────────────────────────────────────────────────────────
  '/manager/dashboard':               { title: 'Dashboard',                        subtitle: '{date}' },
  '/manager/team':                    { title: 'My Team' },
  '/manager/leave-queue':             { title: 'Leave Approval Queue' },
  '/manager/regularisation-queue':    { title: 'Regularisation Approvals' },
  '/manager/regularisation':          { title: 'Regularisation Request' },
  '/manager/team-attendance':         { title: 'Team Attendance' },
  '/manager/performance':             { title: 'Performance' },
  '/manager/performance-cycles':      { title: 'Performance' },
  '/manager/my-review':               { title: 'My Performance Review',            subtitle: 'Cycle 1 · FY 2026-27 · April–September 2026' },
  '/manager/leave':                   { title: 'My Leave',                         subtitle: 'Approved by your manager' },
  '/manager/leave/new':               { title: 'Apply for Leave' },
  '/manager/attendance':              { title: 'My Attendance' },
  '/manager/checkin':                 { title: 'Check In / Out' },
  '/manager/payslips':                { title: 'My Payslips' },
  '/manager/notifications':           { title: 'Notifications' },
  '/manager/profile':                 { title: 'My Profile' },

  // ── Employee ────────────────────────────────────────────────────────────────
  '/employee/dashboard':              { title: 'Dashboard',                        subtitle: '{date}' },
  '/employee/leave':                  { title: 'My Leave' },
  '/employee/leave/new':              { title: 'Apply for Leave' },
  '/employee/attendance':             { title: 'My Attendance' },
  '/employee/checkin':                { title: 'Check In / Out' },
  '/employee/regularisation':         { title: 'Regularisation Request' },
  '/employee/payslips':               { title: 'My Payslips' },
  '/employee/performance':            { title: 'My Reviews' },
  '/employee/notifications':          { title: 'Notifications' },
  '/employee/profile':                { title: 'My Profile' },

  // ── Payroll Officer ─────────────────────────────────────────────────────────
  '/payroll/dashboard':               { title: 'Dashboard',                        subtitle: '{date}' },
  '/payroll/payroll-runs':            { title: 'Payroll Runs',                     subtitle: 'FY 2026-27' },
  '/payroll/payroll-runs/new':        { title: 'Initiate Payroll Run' },
  '/payroll/reports':                 { title: 'Payroll Reports' },
  '/payroll/reversal-history':        { title: 'Reversal History' },
  '/payroll/leave':                   { title: 'My Leave' },
  '/payroll/leave/new':               { title: 'Apply for Leave' },
  '/payroll/attendance':              { title: 'My Attendance' },
  '/payroll/checkin':                 { title: 'Check In / Out' },
  '/payroll/regularisation':          { title: 'Regularisation Request' },
  '/payroll/payslips':                { title: 'My Payslips' },
  '/payroll/my-review':               { title: 'My Performance Review',            subtitle: 'Cycle 1 · FY 2026-27' },
  '/payroll/notifications':           { title: 'Notifications' },
  '/payroll/profile':                 { title: 'My Profile' },
};

/**
 * Dynamic-route prefixes — when an exact match misses, the longest-prefix
 * entry here wins. These match dynamic segments like `/admin/employees/[id]`.
 */
export const PAGE_META_PREFIX: Array<{ prefix: string; meta: PageMeta }> = [
  { prefix: '/admin/employees/',          meta: { title: 'Employee Details' } },
  { prefix: '/admin/leave-queue/',        meta: { title: 'Leave Request Detail' } },
  { prefix: '/admin/leave/',              meta: { title: 'Leave Request' } },
  { prefix: '/admin/regularisation-queue/', meta: { title: 'Regularisation Request' } },
  { prefix: '/admin/payroll-runs/',       meta: { title: 'Payroll Run' } },
  { prefix: '/admin/payslips/',           meta: { title: 'Payslip' } },
  { prefix: '/admin/performance-cycles/', meta: { title: 'Performance Cycle' } },
  { prefix: '/admin/performance/',        meta: { title: 'Review' } },
  { prefix: '/manager/leave-queue/',      meta: { title: 'Leave Request Detail' } },
  { prefix: '/manager/leave/',            meta: { title: 'Leave Request' } },
  { prefix: '/manager/regularisation-queue/', meta: { title: 'Regularisation Request' } },
  { prefix: '/manager/team/',             meta: { title: 'Team Member' } },
  { prefix: '/manager/payslips/',         meta: { title: 'Payslip' } },
  { prefix: '/manager/performance/',      meta: { title: 'Manager Rating' } },
  { prefix: '/employee/leave/',           meta: { title: 'Leave Request' } },
  { prefix: '/employee/payslips/',        meta: { title: 'Payslip' } },
  { prefix: '/employee/performance/',     meta: { title: 'Self Rating' } },
  { prefix: '/payroll/payroll-runs/',     meta: { title: 'Payroll Run' } },
  { prefix: '/payroll/leave/',            meta: { title: 'Leave Request' } },
  { prefix: '/payroll/payslips/',         meta: { title: 'Payslip' } },
];

export function resolvePageMeta(pathname: string): PageMeta | undefined {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Longest-prefix match
  let best: PageMeta | undefined;
  let bestLen = 0;
  for (const { prefix, meta } of PAGE_META_PREFIX) {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) {
      best = meta;
      bestLen = prefix.length;
    }
  }
  return best;
}
