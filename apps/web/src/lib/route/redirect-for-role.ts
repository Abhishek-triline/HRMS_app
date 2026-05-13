/**
 * Route-group-aware redirect helper.
 *
 * Every notification in the API hardcodes its link to `/employee/...`
 * because notifications were authored before self-service paths existed
 * for the other three roles. When a non-Employee receives one of those
 * notifications and clicks it, they land in a route group that rejects
 * them, and the matching role-group layout previously redirected to
 * that role's dashboard — losing the deep link.
 *
 * This helper swaps the leading `/<role>/` segment for the caller's own
 * role prefix, preserving the trailing path. So:
 *
 *   /employee/payslips/116   for Admin   →  /admin/payslips/116
 *   /employee/leave/L-2026-…  for Manager →  /manager/leave/L-2026-…
 *
 * The four role groups expose symmetrical self-service paths
 * (/leave, /payslips, /attendance, /checkin, /leave-encashment, /profile)
 * so the swap lands on a real route. If the rewritten path doesn't
 * exist in the target role group the user will see a 404, which is
 * still a better signal than silently dropping them on the dashboard.
 */

import { ROLE_ID } from '@/lib/status/maps';

/**
 * Map roleId → first URL segment.
 */
const ROLE_SEGMENT: Record<number, string> = {
  [ROLE_ID.Admin]:           'admin',
  [ROLE_ID.Manager]:         'manager',
  [ROLE_ID.Employee]:        'employee',
  [ROLE_ID.PayrollOfficer]:  'payroll',
};

/**
 * Build the destination URL for a user who landed on a route-group
 * path that belongs to a different role.
 *
 * @param currentPath  Server-resolved pathname (e.g. "/employee/payslips/116").
 * @param targetRoleId The caller's actual roleId — where they should be.
 * @returns A pathname under the target role's prefix, or "/login" if the
 *          target role isn't recognised.
 */
export function pathForOtherRole(
  currentPath: string,
  targetRoleId: number,
): string {
  const targetSegment = ROLE_SEGMENT[targetRoleId];
  if (!targetSegment) return '/login';

  const segments = currentPath.split('/').filter(Boolean);
  if (segments.length === 0) return `/${targetSegment}/dashboard`;

  // Swap the leading role segment with the caller's own role segment.
  // Trailing query string is already stripped from x-pathname.
  segments[0] = targetSegment;
  return '/' + segments.join('/');
}
