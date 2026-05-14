/**
 * CycleStatusBadge — maps performance cycle status INT codes → StatusBadge.
 * Status codes: 1=Open, 2=SelfReview, 3=ManagerReview, 4=Closed
 */

import { StatusBadge } from '@/components/ui/StatusBadge';

interface CycleStatusBadgeProps {
  /** INT status code from the API (1–4) */
  status: number;
  className?: string;
}

export function CycleStatusBadge({ status, className }: CycleStatusBadgeProps) {
  return <StatusBadge entity="cycleStatus" code={status} className={className} />;
}
