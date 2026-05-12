/**
 * PayrollRunStatusBadge — maps payroll run status INT codes → StatusBadge.
 * Status codes: 1=Draft, 2=Review, 3=Finalised, 4=Reversed
 */

import { StatusBadge } from '@/components/ui/StatusBadge';

interface PayrollRunStatusBadgeProps {
  /** INT status code from the API (1–4) */
  status: number;
  className?: string;
}

export function PayrollRunStatusBadge({ status, className }: PayrollRunStatusBadgeProps) {
  return <StatusBadge entity="payrollStatus" code={status} className={className} />;
}
