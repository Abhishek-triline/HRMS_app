/**
 * INT → label + badge-key maps for every entity status / role / type code
 * the v2 API ships.
 *
 * The frontend OWNS the INT → label translation (per HRMS_Schema_v2_Plan).
 * Every component that displays an entity's status / role / category / etc.
 * MUST import from this file — never hardcode a label or compare codes by
 * magic numbers.
 *
 * The `badge` field on each entry points at one of `StatusBadge`'s
 * `BadgeStatus` keys (see `components/ui/StatusBadge.tsx`) so the colour /
 * tone of the badge is uniform across the whole app for the same kind of
 * state (e.g. every "approved-ish" state uses the green palette).
 *
 * The mappings here mirror the FROZEN INT codes in
 * `docs/HRMS_Schema_v2_Plan.md` §3 and the MySQL `COLUMN_COMMENT` clauses.
 * Never re-number an existing code — only append.
 *
 * When you append a code, update all six locations listed in the §3
 * checklist (this map being one of them).
 */

import type { BadgeStatus } from '../../components/ui/StatusBadge';

// ── Helpers ────────────────────────────────────────────────────────────────

export interface StatusEntry {
  /** Short, title-cased label suitable for badges, table cells, dropdowns. */
  label: string;
  /** Maps to one of StatusBadge's BadgeStatus keys for colour/tone. */
  badge: BadgeStatus;
}

/**
 * Generic lookup: return the entry for a given code, or a safe fallback so
 * the UI never crashes if a new code arrives before the map is updated.
 */
function safeLookup<M extends Record<number, StatusEntry>>(
  map: M,
  code: number,
  fallbackLabel = `Unknown (${code})`,
): StatusEntry {
  return map[code] ?? { label: fallbackLabel, badge: 'inactive' as BadgeStatus };
}

// ── Master tables ──────────────────────────────────────────────────────────

/** master `roles`. */
export const ROLE_MAP: Record<number, StatusEntry> = {
  1: { label: 'Employee',       badge: 'active' },
  2: { label: 'Manager',        badge: 'active' },
  3: { label: 'Payroll Officer', badge: 'active' },
  4: { label: 'Admin',          badge: 'active' },
};
export const getRole = (code: number) => safeLookup(ROLE_MAP, code);

/** master `employment_types`. */
export const EMPLOYMENT_TYPE_MAP: Record<number, StatusEntry> = {
  1: { label: 'Permanent', badge: 'active' },
  2: { label: 'Contract',  badge: 'review' },
  3: { label: 'Probation', badge: 'pending' },
  4: { label: 'Intern',    badge: 'pending' },
};
export const getEmploymentType = (code: number) => safeLookup(EMPLOYMENT_TYPE_MAP, code);

/** master `genders`. */
export const GENDER_MAP: Record<number, StatusEntry> = {
  1: { label: 'Male',              badge: 'active' },
  2: { label: 'Female',            badge: 'active' },
  3: { label: 'Other',             badge: 'active' },
  4: { label: 'Prefer not to say', badge: 'inactive' },
};
export const getGender = (code: number) => safeLookup(GENDER_MAP, code);

// ── Entity status codes (§3.1–§3.6) ────────────────────────────────────────

/** §3.1 `employees.status`. */
export const EMPLOYEE_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Active',    badge: 'active' },
  2: { label: 'On Notice', badge: 'on-notice' },
  3: { label: 'On Leave',  badge: 'on-leave' },
  4: { label: 'Inactive',  badge: 'inactive' },
  5: { label: 'Exited',    badge: 'exited' },
};
export const getEmployeeStatus = (code: number) => safeLookup(EMPLOYEE_STATUS_MAP, code);

/** §3.2 `leave_requests.status`. */
export const LEAVE_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Pending',   badge: 'pending' },
  2: { label: 'Approved',  badge: 'approved' },
  3: { label: 'Rejected',  badge: 'rejected' },
  4: { label: 'Cancelled', badge: 'inactive' },
  5: { label: 'Escalated', badge: 'review' },
};
export const getLeaveStatus = (code: number) => safeLookup(LEAVE_STATUS_MAP, code);

/** master `leave_types`. */
export const LEAVE_TYPE_MAP: Record<number, StatusEntry> = {
  1: { label: 'Annual',    badge: 'active' },
  2: { label: 'Sick',      badge: 'review' },
  3: { label: 'Casual',    badge: 'active' },
  4: { label: 'Unpaid',    badge: 'inactive' },
  5: { label: 'Maternity', badge: 'on-leave' },
  6: { label: 'Paternity', badge: 'on-leave' },
};
export const getLeaveType = (code: number) => safeLookup(LEAVE_TYPE_MAP, code);

/** Convenience predicate for event-based leave (Maternity / Paternity). */
export const isEventBasedLeaveTypeId = (code: number) => code === 5 || code === 6;

/** §3.3 `leave_encashments.status`. */
export const LEAVE_ENCASHMENT_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Pending',          badge: 'pending' },
  2: { label: 'Manager Approved', badge: 'review' },
  3: { label: 'Admin Finalised',  badge: 'review' },
  4: { label: 'Paid',             badge: 'finalised' },
  5: { label: 'Rejected',         badge: 'rejected' },
  6: { label: 'Cancelled',        badge: 'inactive' },
};
export const getLeaveEncashmentStatus = (code: number) =>
  safeLookup(LEAVE_ENCASHMENT_STATUS_MAP, code);

/** §3.4 `attendance_records.status`. */
export const ATTENDANCE_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Present',    badge: 'approved' },
  2: { label: 'Absent',     badge: 'rejected' },
  3: { label: 'On Leave',   badge: 'on-leave' },
  4: { label: 'Weekly Off', badge: 'inactive' },
  5: { label: 'Holiday',    badge: 'inactive' },
};
export const getAttendanceStatus = (code: number) => safeLookup(ATTENDANCE_STATUS_MAP, code);

/** §3.4 `attendance_records.source_id`. */
export const ATTENDANCE_SOURCE_MAP: Record<number, StatusEntry> = {
  1: { label: 'System',         badge: 'inactive' },
  2: { label: 'Regularisation', badge: 'review' },
};
export const getAttendanceSource = (code: number) => safeLookup(ATTENDANCE_SOURCE_MAP, code);

/** §3.4 `regularisation_requests.status`. */
export const REG_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Pending',  badge: 'pending' },
  2: { label: 'Approved', badge: 'approved' },
  3: { label: 'Rejected', badge: 'rejected' },
};
export const getRegStatus = (code: number) => safeLookup(REG_STATUS_MAP, code);

/** §3.5 `payroll_runs.status` and `payslips.status` (shared lifecycle). */
export const PAYROLL_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Draft',     badge: 'draft' },
  2: { label: 'Review',    badge: 'review' },
  3: { label: 'Finalised', badge: 'finalised' },
  4: { label: 'Reversed',  badge: 'rejected' },
};
export const getPayrollStatus = (code: number) => safeLookup(PAYROLL_STATUS_MAP, code);
export const getPayslipStatus = getPayrollStatus;

/** §3.6 `performance_cycles.status`. */
export const CYCLE_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Open',            badge: 'active' },
  2: { label: 'Self Review',     badge: 'pending' },
  3: { label: 'Manager Review',  badge: 'review' },
  4: { label: 'Closed',          badge: 'locked' },
};
export const getCycleStatus = (code: number) => safeLookup(CYCLE_STATUS_MAP, code);

/** §3.6 `goals.outcome_id`. */
export const GOAL_OUTCOME_MAP: Record<number, StatusEntry> = {
  1: { label: 'Pending', badge: 'pending' },
  2: { label: 'Met',     badge: 'approved' },
  3: { label: 'Partial', badge: 'review' },
  4: { label: 'Missed',  badge: 'rejected' },
};
export const getGoalOutcome = (code: number) => safeLookup(GOAL_OUTCOME_MAP, code);

// ── Routing / reason / source / purpose codes ──────────────────────────────

/** §3.2 / §3.3 / §3.4 `*.routed_to_id`. */
export const ROUTED_TO_MAP: Record<number, StatusEntry> = {
  1: { label: 'Manager', badge: 'review' },
  2: { label: 'Admin',   badge: 'review' },
};
export const getRoutedTo = (code: number) => safeLookup(ROUTED_TO_MAP, code);

/** §3.8 `password_reset_tokens.purpose_id`. Rarely UI-visible. */
export const TOKEN_PURPOSE_MAP: Record<number, StatusEntry> = {
  1: { label: 'First Login',    badge: 'pending' },
  2: { label: 'Reset Password', badge: 'review' },
};
export const getTokenPurpose = (code: number) => safeLookup(TOKEN_PURPOSE_MAP, code);

/** §3.8 `reporting_manager_history.reason_id`. */
export const REPORTING_HISTORY_REASON_MAP: Record<number, StatusEntry> = {
  1: { label: 'Initial',    badge: 'inactive' },
  2: { label: 'Reassigned', badge: 'review' },
  3: { label: 'Exited',     badge: 'exited' },
};
export const getReportingHistoryReason = (code: number) =>
  safeLookup(REPORTING_HISTORY_REASON_MAP, code);

/** §3.2 `leave_balance_ledger.reason_id`. */
export const LEDGER_REASON_MAP: Record<number, StatusEntry> = {
  1: { label: 'Initial',           badge: 'inactive' },
  2: { label: 'Approval',          badge: 'approved' },
  3: { label: 'Cancellation',      badge: 'rejected' },
  4: { label: 'Carry Forward',     badge: 'review' },
  5: { label: 'Adjustment',        badge: 'review' },
  6: { label: 'Late Mark Penalty', badge: 'rejected' },
};
export const getLedgerReason = (code: number) => safeLookup(LEDGER_REASON_MAP, code);

/** Internal: cancelled_by role tag on a cancelled leave request (§3.2). */
export const CANCELLED_BY_ROLE_MAP: Record<number, StatusEntry> = {
  1: { label: 'Self',    badge: 'inactive' },
  2: { label: 'Manager', badge: 'review' },
  3: { label: 'Admin',   badge: 'review' },
};
export const getCancelledByRole = (code: number) => safeLookup(CANCELLED_BY_ROLE_MAP, code);

// ── Notification + audit codes (§3.7 / §3.9) ───────────────────────────────

/** §3.7 `notifications.category_id`. */
export const NOTIFICATION_CATEGORY_MAP: Record<number, StatusEntry> = {
  1: { label: 'Leave',         badge: 'active' },
  2: { label: 'Attendance',    badge: 'active' },
  3: { label: 'Payroll',       badge: 'active' },
  4: { label: 'Performance',   badge: 'active' },
  5: { label: 'Status',        badge: 'review' },
  6: { label: 'Configuration', badge: 'review' },
  7: { label: 'Auth',          badge: 'pending' },
  8: { label: 'System',        badge: 'inactive' },
};
export const getNotificationCategory = (code: number) =>
  safeLookup(NOTIFICATION_CATEGORY_MAP, code);

/** §3.9 `audit_log.target_type_id`. */
export const AUDIT_TARGET_TYPE_MAP: Record<number, StatusEntry> = {
  1:  { label: 'Employee',               badge: 'active' },
  2:  { label: 'Leave Request',          badge: 'active' },
  3:  { label: 'Leave Encashment',       badge: 'active' },
  4:  { label: 'Attendance Record',      badge: 'active' },
  5:  { label: 'Regularisation Request', badge: 'active' },
  6:  { label: 'Payroll Run',            badge: 'active' },
  7:  { label: 'Payslip',                badge: 'active' },
  8:  { label: 'Performance Cycle',      badge: 'active' },
  9:  { label: 'Performance Review',     badge: 'active' },
  10: { label: 'Goal',                   badge: 'active' },
  11: { label: 'Configuration',          badge: 'active' },
  12: { label: 'Salary Structure',       badge: 'active' },
  13: { label: 'Holiday',                badge: 'active' },
  14: { label: 'Notification',           badge: 'active' },
};
export const getAuditTargetType = (code: number) => safeLookup(AUDIT_TARGET_TYPE_MAP, code);

/** §3.9 `audit_log.actor_role_id`. Superset of ROLE_MAP with system codes. */
export const AUDIT_ACTOR_ROLE_MAP: Record<number, StatusEntry> = {
  1:   { label: 'Employee',        badge: 'active' },
  2:   { label: 'Manager',         badge: 'active' },
  3:   { label: 'Payroll Officer', badge: 'active' },
  4:   { label: 'Admin',           badge: 'active' },
  99:  { label: 'Unknown',         badge: 'inactive' },
  100: { label: 'System',          badge: 'inactive' },
};
export const getAuditActorRole = (code: number) => safeLookup(AUDIT_ACTOR_ROLE_MAP, code);

/** master `audit_modules`. */
export const AUDIT_MODULE_MAP: Record<number, StatusEntry> = {
  1: { label: 'Auth',          badge: 'active' },
  2: { label: 'Employees',     badge: 'active' },
  3: { label: 'Leave',         badge: 'active' },
  4: { label: 'Payroll',       badge: 'active' },
  5: { label: 'Attendance',    badge: 'active' },
  6: { label: 'Performance',   badge: 'active' },
  7: { label: 'Notifications', badge: 'active' },
  8: { label: 'Audit',         badge: 'active' },
  9: { label: 'Configuration', badge: 'active' },
};
export const getAuditModule = (code: number) => safeLookup(AUDIT_MODULE_MAP, code);

// ── Master row status (uniform across all master tables) ───────────────────

/** master_table.status: 1=Active, 2=Deprecated. */
export const MASTER_STATUS_MAP: Record<number, StatusEntry> = {
  1: { label: 'Active',     badge: 'active' },
  2: { label: 'Deprecated', badge: 'inactive' },
};
export const getMasterStatus = (code: number) => safeLookup(MASTER_STATUS_MAP, code);
