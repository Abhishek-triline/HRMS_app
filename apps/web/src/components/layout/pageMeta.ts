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
  '/admin/leave-encashment':          { title: 'My Leave Encashment' },
  '/admin/leave-encashment-queue':    { title: 'Encashment Queue',                  subtitle: 'Pending & Manager-Approved requests' },
  '/admin/leave':                     { title: 'My Leave',                         subtitle: 'No reporting manager · routes to Admin queue' },
  '/admin/leave/new':                 { title: 'Apply for Leave' },
  '/admin/attendance':                { title: 'Attendance Overview',              subtitle: 'Org-wide attendance · {date}' },
  '/admin/attendance?scope=me':       { title: 'My Attendance' },
  '/admin/regularisation':            { title: 'Regularisation Request' },
  '/admin/regularisation-queue':      { title: 'Regularisation Approval Queue' },
  '/admin/checkin':                   { title: 'Check In / Out' },
  '/admin/payroll-runs':              { title: 'Payroll Runs',                     subtitle: 'FY 2026-27 · April 2026 onwards' },
  '/admin/payroll-runs/new':          { title: 'Initiate Payroll Run' },
  '/admin/payslips':                  { title: 'My Payslips' },
  '/admin/reports':                   { title: 'Payroll Reports' },
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
  '/manager/leave-encashment':        { title: 'My Leave Encashment' },
  '/manager/leave-encashment-queue':  { title: 'Encashment Queue',                  subtitle: 'Pending requests assigned to you' },
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
  '/employee/leave-encashment':       { title: 'My Leave Encashment' },
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
  '/payroll/leave-encashment':        { title: 'My Leave Encashment' },
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
 *
 * Use `pattern` for routes with interior dynamic segments. `*` matches a
 * single path segment (no slashes); patterns are turned into RegExp and
 * compared by the *length of the longest matching literal prefix* before
 * the first wildcard, so deeper nested routes still win over their parents.
 */
export interface PrefixMatchEntry {
  prefix?: string;
  pattern?: string;
  meta: PageMeta;
}

export const PAGE_META_PREFIX: PrefixMatchEntry[] = [
  { prefix: '/admin/leave-encashment/',   meta: { title: 'Encashment Request' } },
  { prefix: '/admin/employees/',          meta: { title: 'Employee Details' } },
  { prefix: '/admin/leave-queue/',        meta: { title: 'Leave Request Detail' } },
  { prefix: '/admin/leave/',              meta: { title: 'Leave Request' } },
  { prefix: '/admin/regularisation-queue/', meta: { title: 'Regularisation Request' } },
  { prefix: '/admin/payroll-runs/',       meta: { title: 'Payroll Run' } },
  { prefix: '/admin/payslips/',           meta: { title: 'Payslip' } },
  { prefix: '/admin/performance-cycles/', meta: { title: 'Performance Cycle' } },
  { prefix: '/admin/performance/',        meta: { title: 'Review' } },
  { prefix: '/manager/leave-encashment/', meta: { title: 'Encashment Request' } },
  { prefix: '/manager/leave-queue/',      meta: { title: 'Leave Request Detail' } },
  { prefix: '/manager/leave/',            meta: { title: 'Leave Request' } },
  { prefix: '/manager/regularisation-queue/', meta: { title: 'Regularisation Request' } },
  { prefix: '/manager/team/',             meta: { title: 'Team Member' } },
  { prefix: '/manager/payslips/',         meta: { title: 'Payslip' } },
  { prefix: '/manager/performance/',      meta: { title: 'Manager Rating' } },
  { prefix: '/employee/leave-encashment/', meta: { title: 'Encashment Request' } },
  { prefix: '/employee/leave/',           meta: { title: 'Leave Request' } },
  { prefix: '/employee/payslips/',        meta: { title: 'Payslip' } },
  { prefix: '/employee/performance/',     meta: { title: 'Self Rating' } },
  { prefix: '/payroll/payroll-runs/',     meta: { title: 'Payroll Run' } },
  { prefix: '/payroll/leave-encashment/', meta: { title: 'Encashment Request' } },
  { prefix: '/payroll/leave/',            meta: { title: 'Leave Request' } },
  { prefix: '/payroll/payslips/',         meta: { title: 'Payslip' } },
  // Nested payslip-under-run drill-downs. `*` matches a single path segment
  // (the run id). These rank higher than the bare /…/payroll-runs/ entries
  // above because their literal-prefix-before-wildcard is longer ("payslips").
  { pattern: '/admin/payroll-runs/*/payslips/',   meta: { title: 'Payslip' } },
  { pattern: '/payroll/payroll-runs/*/payslips/', meta: { title: 'Payslip' } },
];

/**
 * Convert a pattern string with `*` wildcards into a RegExp where each `*`
 * matches one path segment (no slashes). The literal portion before the
 * first wildcard determines ranking, so deeper nested patterns beat their
 * parent prefixes.
 */
function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+');
  return new RegExp(`^${escaped}`);
}

export function resolvePageMeta(pathname: string): PageMeta | undefined {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Longest-prefix match (mixes literal prefixes + `*`-pattern entries).
  // Ranking is by the length of the literal segment before any wildcard,
  // so /admin/payroll-runs/*/payslips/ wins over /admin/payroll-runs/.
  let best: PageMeta | undefined;
  let bestLen = 0;
  for (const entry of PAGE_META_PREFIX) {
    if (entry.prefix !== undefined) {
      if (pathname.startsWith(entry.prefix) && entry.prefix.length > bestLen) {
        best = entry.meta;
        bestLen = entry.prefix.length;
      }
    } else if (entry.pattern !== undefined) {
      if (patternToRegExp(entry.pattern).test(pathname)) {
        const ranking = entry.pattern.length;
        if (ranking > bestLen) {
          best = entry.meta;
          bestLen = ranking;
        }
      }
    }
  }
  return best;
}
