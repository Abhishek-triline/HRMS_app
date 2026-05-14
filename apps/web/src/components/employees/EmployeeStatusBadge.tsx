/**
 * EmployeeStatusBadge — maps employee status INT codes → StatusBadge.
 * Status codes: 1=Active, 2=OnNotice, 3=OnLeave, 4=Inactive, 5=Exited
 */

import { StatusBadge } from '@/components/ui/StatusBadge';

interface EmployeeStatusBadgeProps {
  /** INT status code from the API (1–5) */
  status: number;
  className?: string;
}

export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  return <StatusBadge entity="employeeStatus" code={status} className={className} />;
}
