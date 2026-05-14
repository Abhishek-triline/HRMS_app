import { clsx } from 'clsx';
import {
  ATTENDANCE_SOURCE_MAP,
  ATTENDANCE_STATUS_MAP,
  AUDIT_ACTOR_ROLE_MAP,
  AUDIT_MODULE_MAP,
  AUDIT_TARGET_TYPE_MAP,
  CANCELLED_BY_ROLE_MAP,
  CYCLE_STATUS_MAP,
  EMPLOYEE_STATUS_MAP,
  EMPLOYMENT_TYPE_MAP,
  GENDER_MAP,
  GOAL_OUTCOME_MAP,
  LEAVE_ENCASHMENT_STATUS_MAP,
  LEAVE_STATUS_MAP,
  LEAVE_TYPE_MAP,
  LEDGER_REASON_MAP,
  MASTER_STATUS_MAP,
  NOTIFICATION_CATEGORY_MAP,
  PAYROLL_STATUS_MAP,
  REG_STATUS_MAP,
  REPORTING_HISTORY_REASON_MAP,
  ROLE_MAP,
  ROUTED_TO_MAP,
  TOKEN_PURPOSE_MAP,
  type StatusEntry,
} from '../../lib/status/maps';

export type BadgeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'on-leave'
  | 'exited'
  | 'finalised'
  | 'locked'
  | 'on-notice'
  | 'draft'
  | 'inactive'
  | 'processing'
  | 'review';

const statusConfig: Record<
  BadgeStatus,
  { label: string; bg: string; text: string; icon?: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-umberbg',
    text: 'text-umber',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-greenbg',
    text: 'text-richgreen',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-crimsonbg',
    text: 'text-crimson',
  },
  active: {
    label: 'Active',
    bg: 'bg-greenbg',
    text: 'text-richgreen',
  },
  'on-leave': {
    label: 'On Leave',
    bg: 'bg-mint',
    text: 'text-forest',
  },
  exited: {
    label: 'Exited',
    bg: 'bg-lockedbg',
    text: 'text-lockedfg',
  },
  finalised: {
    label: 'Finalised',
    bg: 'bg-greenbg',
    text: 'text-richgreen',
  },
  locked: {
    label: 'Locked',
    bg: 'bg-lockedbg',
    text: 'text-lockedfg',
    icon: 'lock',
  },
  'on-notice': {
    label: 'On Notice',
    bg: 'bg-umberbg',
    text: 'text-umber',
  },
  draft: {
    label: 'Draft',
    bg: 'bg-umberbg',
    text: 'text-umber',
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-lockedbg',
    text: 'text-lockedfg',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-softmint',
    text: 'text-forest',
  },
  review: {
    label: 'Review',
    bg: 'bg-mint',
    text: 'text-forest',
  },
};

const LockIcon = () => (
  <svg
    className="w-2.5 h-2.5 mr-1 inline-block"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

/**
 * Entity keys for v2 INT-code-driven usage. Each key picks the appropriate
 * INT → {label, badge} map from `lib/status/maps.ts`.
 */
export type StatusEntity =
  | 'role'
  | 'employmentType'
  | 'gender'
  | 'employeeStatus'
  | 'leaveStatus'
  | 'leaveType'
  | 'leaveEncashmentStatus'
  | 'attendanceStatus'
  | 'attendanceSource'
  | 'regStatus'
  | 'payrollStatus'
  | 'payslipStatus'
  | 'cycleStatus'
  | 'goalOutcome'
  | 'routedTo'
  | 'tokenPurpose'
  | 'reportingHistoryReason'
  | 'ledgerReason'
  | 'cancelledByRole'
  | 'notificationCategory'
  | 'auditTargetType'
  | 'auditActorRole'
  | 'auditModule'
  | 'masterStatus';

const ENTITY_MAPS: Record<StatusEntity, Record<number, StatusEntry>> = {
  role: ROLE_MAP,
  employmentType: EMPLOYMENT_TYPE_MAP,
  gender: GENDER_MAP,
  employeeStatus: EMPLOYEE_STATUS_MAP,
  leaveStatus: LEAVE_STATUS_MAP,
  leaveType: LEAVE_TYPE_MAP,
  leaveEncashmentStatus: LEAVE_ENCASHMENT_STATUS_MAP,
  attendanceStatus: ATTENDANCE_STATUS_MAP,
  attendanceSource: ATTENDANCE_SOURCE_MAP,
  regStatus: REG_STATUS_MAP,
  payrollStatus: PAYROLL_STATUS_MAP,
  payslipStatus: PAYROLL_STATUS_MAP,
  cycleStatus: CYCLE_STATUS_MAP,
  goalOutcome: GOAL_OUTCOME_MAP,
  routedTo: ROUTED_TO_MAP,
  tokenPurpose: TOKEN_PURPOSE_MAP,
  reportingHistoryReason: REPORTING_HISTORY_REASON_MAP,
  ledgerReason: LEDGER_REASON_MAP,
  cancelledByRole: CANCELLED_BY_ROLE_MAP,
  notificationCategory: NOTIFICATION_CATEGORY_MAP,
  auditTargetType: AUDIT_TARGET_TYPE_MAP,
  auditActorRole: AUDIT_ACTOR_ROLE_MAP,
  auditModule: AUDIT_MODULE_MAP,
  masterStatus: MASTER_STATUS_MAP,
};

type StatusBadgeBaseProps = {
  className?: string;
  /** Override the display label. */
  label?: string;
};

type StatusBadgeLegacyProps = StatusBadgeBaseProps & {
  status: BadgeStatus;
  entity?: never;
  code?: never;
};

type StatusBadgeV2Props = StatusBadgeBaseProps & {
  /** v2 entity key — selects which INT-code map to use. */
  entity: StatusEntity;
  /** INT code on the wire (e.g., 1=Pending for leaveStatus). */
  code: number;
  status?: never;
};

export type StatusBadgeProps = StatusBadgeLegacyProps | StatusBadgeV2Props;

/**
 * Display a status badge.
 *
 * Two call shapes are supported:
 *
 *   Legacy (existing pre-v2 callers):
 *     <StatusBadge status="approved" />
 *
 *   v2 (preferred — driven by INT codes from the API):
 *     <StatusBadge entity="leaveStatus" code={2} />
 *
 * In v2 mode the label comes from `lib/status/maps.ts` (which mirrors the
 * frozen INT→label mapping in docs/HRMS_Schema_v2_Plan.md §3) and the
 * colour comes from the entry's `badge` key. Pass `label="..."` to override
 * the resolved label without changing the colour.
 */
export function StatusBadge(props: StatusBadgeProps) {
  let badgeKey: BadgeStatus;
  let resolvedLabel: string;

  if ('entity' in props && props.entity !== undefined) {
    const map = ENTITY_MAPS[props.entity];
    const entry =
      map[props.code] ??
      ({ label: `Unknown (${props.code})`, badge: 'inactive' } as StatusEntry);
    badgeKey = entry.badge;
    resolvedLabel = props.label ?? entry.label;
  } else {
    badgeKey = props.status;
    resolvedLabel = props.label ?? statusConfig[badgeKey].label;
  }

  const config = statusConfig[badgeKey];

  return (
    <span
      className={clsx(
        'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded tracking-[0.03em]',
        config.bg,
        config.text,
        props.className,
      )}
    >
      {config.icon === 'lock' && <LockIcon />}
      {resolvedLabel}
    </span>
  );
}
