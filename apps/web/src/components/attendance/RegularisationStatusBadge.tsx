/**
 * RegularisationStatusBadge — maps regularisation status INT codes → StatusBadge.
 * Status codes: 1=Pending, 2=Approved, 3=Rejected
 */

import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROUTED_TO } from '@/lib/status/maps';

interface RegularisationStatusBadgeProps {
  /** INT status code from the API (1–3) */
  status: number;
  /** Append "routedTo" label, e.g. "Pending (Manager)" — pass routedToId from request */
  routedToId?: number;
  className?: string;
}

export function RegularisationStatusBadge({
  status,
  routedToId,
  className,
}: RegularisationStatusBadgeProps) {
  // Build a label override for pending state: "Pending (Manager)" / "Pending (Admin)"
  let label: string | undefined;
  if (status === 1 && routedToId != null) {
    const routedToLabel = routedToId === ROUTED_TO.Admin ? 'Admin' : 'Manager';
    label = `Pending (${routedToLabel})`;
  }

  return (
    <StatusBadge entity="regStatus" code={status} label={label} className={className} />
  );
}
