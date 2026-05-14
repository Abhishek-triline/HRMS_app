/**
 * LeaveStatusBadge — thin wrapper around StatusBadge for leave status INT codes.
 * Status codes: 1=Pending, 2=Approved, 3=Rejected, 4=Cancelled, 5=Escalated
 */

import { StatusBadge } from '@/components/ui/StatusBadge';

interface LeaveStatusBadgeProps {
  /** INT status code from the API (1–5) */
  status: number;
  className?: string;
}

export function LeaveStatusBadge({ status, className }: LeaveStatusBadgeProps) {
  return <StatusBadge entity="leaveStatus" code={status} className={className} />;
}
