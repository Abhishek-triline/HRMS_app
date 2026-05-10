/**
 * RegularisationStatusBadge — maps RegStatus to colour chips.
 *
 * Pending  → umberbg / umber
 * Approved → greenbg / richgreen
 * Rejected → crimsonbg / crimson
 */

import { clsx } from 'clsx';
import type { RegStatus } from '@nexora/contracts/attendance';

interface RegularisationStatusBadgeProps {
  status: RegStatus;
  /** Append "routedTo" label, e.g. "Pending (Manager)" */
  routedTo?: string;
  className?: string;
}

const config: Record<RegStatus, { bg: string; text: string }> = {
  Pending: { bg: 'bg-umberbg', text: 'text-umber' },
  Approved: { bg: 'bg-greenbg', text: 'text-richgreen' },
  Rejected: { bg: 'bg-crimsonbg', text: 'text-crimson' },
};

export function RegularisationStatusBadge({
  status,
  routedTo,
  className,
}: RegularisationStatusBadgeProps) {
  const cfg = config[status];
  const label =
    status === 'Pending' && routedTo ? `Pending (${routedTo})` : status;

  return (
    <span
      className={clsx(
        'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded tracking-[0.03em]',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      {label}
    </span>
  );
}
