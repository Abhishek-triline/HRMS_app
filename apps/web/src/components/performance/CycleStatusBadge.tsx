import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BadgeStatus } from '@/components/ui/StatusBadge';
import type { CycleStatus } from '@nexora/contracts/performance';

const cycleStatusMap: Record<CycleStatus, { status: BadgeStatus; label: string }> = {
  Open: { status: 'active', label: 'Open' },
  'Self-Review': { status: 'review', label: 'Self-Review' },
  'Manager-Review': { status: 'processing', label: 'Mgr Review' },
  Closed: { status: 'locked', label: 'Closed' },
};

interface CycleStatusBadgeProps {
  status: CycleStatus;
  className?: string;
}

export function CycleStatusBadge({ status, className }: CycleStatusBadgeProps) {
  const config = cycleStatusMap[status];
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}
