import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BadgeStatus } from '@/components/ui/StatusBadge';
import type { PayslipStatus } from '@nexora/contracts/payroll';

const statusMap: Record<PayslipStatus, BadgeStatus> = {
  Draft: 'draft',
  Review: 'review',
  Finalised: 'finalised',
  Reversed: 'exited',
};

interface PayslipStatusBadgeProps {
  status: PayslipStatus;
  className?: string;
}

export function PayslipStatusBadge({ status, className }: PayslipStatusBadgeProps) {
  return (
    <StatusBadge
      status={statusMap[status]}
      label={status}
      className={className}
    />
  );
}
