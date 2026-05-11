/**
 * LeaveStatusBadge — maps LeaveStatus to StatusBadge variant.
 * Escalated is rendered as a distinct amber-toned badge since StatusBadge
 * doesn't have an 'escalated' variant — we handle it inline.
 */

import { StatusBadge, type BadgeStatus } from '@/components/ui/StatusBadge';
import type { LeaveStatus } from '@nexora/contracts/leave';
import { clsx } from 'clsx';

const statusToVariant: Record<Exclude<LeaveStatus, 'Escalated'>, BadgeStatus> = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'inactive',
};

interface LeaveStatusBadgeProps {
  status: LeaveStatus;
  className?: string;
}

export function LeaveStatusBadge({ status, className }: LeaveStatusBadgeProps) {
  if (status === 'Escalated') {
    return (
      <span
        className={clsx(
          'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded tracking-[0.03em]',
          'bg-umberbg text-umber',
          className,
        )}
      >
        Escalated
      </span>
    );
  }

  return (
    <StatusBadge
      status={statusToVariant[status]}
      label={status}
      className={className}
    />
  );
}
