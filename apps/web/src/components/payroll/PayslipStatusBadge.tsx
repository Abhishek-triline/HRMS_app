/**
 * PayslipStatusBadge — maps payslip status INT codes → StatusBadge.
 * Status codes: 1=Draft, 2=Review, 3=Finalised, 4=Reversed
 */

import { StatusBadge } from '@/components/ui/StatusBadge';

interface PayslipStatusBadgeProps {
  /** INT status code from the API (1–4) */
  status: number;
  className?: string;
}

export function PayslipStatusBadge({ status, className }: PayslipStatusBadgeProps) {
  return <StatusBadge entity="payslipStatus" code={status} className={className} />;
}
