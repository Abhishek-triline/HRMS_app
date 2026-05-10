/**
 * EmployeeStatusBadge — thin wrapper mapping EmployeeStatus to StatusBadge variant.
 * Keeps status → visual mapping in one place for the employees module.
 */

import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BadgeStatus } from '@/components/ui/StatusBadge';
import type { EmployeeStatus } from '@nexora/contracts/common';

const STATUS_MAP: Record<EmployeeStatus, BadgeStatus> = {
  Active: 'active',
  'On-Notice': 'on-notice',
  Exited: 'exited',
  'On-Leave': 'on-leave',
  Inactive: 'inactive',
};

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
  className?: string;
}

export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  return <StatusBadge status={STATUS_MAP[status]} className={className} />;
}
