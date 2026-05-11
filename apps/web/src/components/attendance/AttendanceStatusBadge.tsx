/**
 * AttendanceStatusBadge — maps AttendanceStatus → StatusBadge variant.
 *
 * BL-026 priority: On-Leave > Weekly-Off / Holiday > Present > Absent.
 * Colours match the prototype palette:
 *   Present    → greenbg / richgreen
 *   Absent     → crimsonbg / crimson
 *   On-Leave   → softmint / forest
 *   Weekly-Off → offwhite / slate
 *   Holiday    → softmint / forest (different label)
 */

import { clsx } from 'clsx';
import type { AttendanceStatus } from '@nexora/contracts/attendance';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  className?: string;
}

const config: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string }
> = {
  Present: { label: 'Present', bg: 'bg-greenbg', text: 'text-richgreen' },
  Absent: { label: 'Absent', bg: 'bg-crimsonbg', text: 'text-crimson' },
  'On-Leave': { label: 'On Leave', bg: 'bg-softmint', text: 'text-forest' },
  'Weekly-Off': { label: 'Weekly Off', bg: 'bg-sage/20', text: 'text-slate' },
  Holiday: { label: 'Holiday', bg: 'bg-mint', text: 'text-forest' },
};

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  const cfg = config[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded tracking-[0.03em]',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
