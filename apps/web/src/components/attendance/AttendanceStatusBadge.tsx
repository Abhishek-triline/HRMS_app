/**
 * AttendanceStatusBadge — maps attendance status INT codes → StatusBadge.
 * Status codes: 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday
 */

import { StatusBadge } from '@/components/ui/StatusBadge';

interface AttendanceStatusBadgeProps {
  /** INT status code from the API (1–5) */
  status: number;
  className?: string;
}

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  return <StatusBadge entity="attendanceStatus" code={status} className={className} />;
}
