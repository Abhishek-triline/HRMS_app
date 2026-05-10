import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BadgeStatus } from '@/components/ui/StatusBadge';
import type { PayrollRunStatus } from '@nexora/contracts/payroll';

const statusMap: Record<PayrollRunStatus, BadgeStatus> = {
  Draft: 'draft',
  Review: 'review',
  Finalised: 'finalised',
  Reversed: 'exited',
};

interface PayrollRunStatusBadgeProps {
  status: PayrollRunStatus;
  className?: string;
}

export function PayrollRunStatusBadge({ status, className }: PayrollRunStatusBadgeProps) {
  return (
    <StatusBadge
      status={statusMap[status]}
      label={status}
      className={className}
    />
  );
}
