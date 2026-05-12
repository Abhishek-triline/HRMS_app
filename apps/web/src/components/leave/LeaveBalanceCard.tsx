/**
 * LeaveBalanceCard — single balance tile.
 *
 * Renders: label, remaining/total, progress bar, carry-forward note.
 * Handles event-based (Maternity/Paternity), unpaid (no total), and
 * standard accrual types.
 *
 * v2: balance.leaveTypeId is an INT code; name resolved from leaveTypes catalog.
 */

import { clsx } from 'clsx';
import type { LeaveBalance, LeaveTypeCatalogItem } from '@nexora/contracts/leave';
import { LEAVE_TYPE_ID } from '@/lib/status/maps';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  /** Catalog for resolving leaveTypeId → name. Falls back to numeric label. */
  leaveTypes?: LeaveTypeCatalogItem[];
  className?: string;
}

const typeColors: Record<number, { bar: string; badge: string; badgeText: string }> = {
  [LEAVE_TYPE_ID.Annual]:    { bar: 'bg-richgreen', badge: 'bg-greenbg',   badgeText: 'text-richgreen' },
  [LEAVE_TYPE_ID.Sick]:      { bar: 'bg-emerald',   badge: 'bg-greenbg',   badgeText: 'text-richgreen' },
  [LEAVE_TYPE_ID.Casual]:    { bar: 'bg-forest',    badge: 'bg-greenbg',   badgeText: 'text-richgreen' },
  [LEAVE_TYPE_ID.Unpaid]:    { bar: 'bg-slate/40',  badge: 'bg-umberbg',   badgeText: 'text-umber' },
  [LEAVE_TYPE_ID.Maternity]: { bar: 'bg-mint',      badge: 'bg-softmint',  badgeText: 'text-forest' },
  [LEAVE_TYPE_ID.Paternity]: { bar: 'bg-mint',      badge: 'bg-softmint',  badgeText: 'text-forest' },
};

const defaultColors = { bar: 'bg-forest', badge: 'bg-greenbg', badgeText: 'text-richgreen' };

function getPercent(remaining: number | null, total: number | null): number {
  if (remaining === null || total === null || total === 0) return 0;
  return Math.min(100, Math.round((remaining / total) * 100));
}

export function LeaveBalanceCard({ balance, leaveTypes, className }: LeaveBalanceCardProps) {
  const colors = typeColors[balance.leaveTypeId] ?? defaultColors;
  const isEventBased =
    balance.leaveTypeId === LEAVE_TYPE_ID.Maternity ||
    balance.leaveTypeId === LEAVE_TYPE_ID.Paternity;
  const isUnpaid = balance.leaveTypeId === LEAVE_TYPE_ID.Unpaid;
  const percent = getPercent(balance.remaining, balance.total);

  // Resolve name from catalog, or fallback to a built-in map
  const builtInNames: Record<number, string> = {
    [LEAVE_TYPE_ID.Annual]: 'Annual',
    [LEAVE_TYPE_ID.Sick]: 'Sick',
    [LEAVE_TYPE_ID.Casual]: 'Casual',
    [LEAVE_TYPE_ID.Unpaid]: 'Unpaid',
    [LEAVE_TYPE_ID.Maternity]: 'Maternity',
    [LEAVE_TYPE_ID.Paternity]: 'Paternity',
  };
  const typeName =
    leaveTypes?.find((lt) => lt.id === balance.leaveTypeId)?.name ??
    builtInNames[balance.leaveTypeId] ??
    `Type ${balance.leaveTypeId}`;

  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-sage/30 p-5',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate uppercase tracking-wide">
          {typeName}
        </span>
        {isUnpaid ? (
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', colors.badge, colors.badgeText)}>
            Pay deducted
          </span>
        ) : isEventBased ? (
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', colors.badge, colors.badgeText)}>
            {balance.eligible ? 'Eligible' : 'Not eligible'}
          </span>
        ) : (
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', colors.badge, colors.badgeText)}>
            {balance.remaining ?? 0} left
          </span>
        )}
      </div>

      {/* Big number */}
      {isUnpaid ? (
        <div className="text-2xl font-heading font-bold text-charcoal mb-1">Available</div>
      ) : isEventBased ? (
        <div className="text-4xl font-heading font-bold text-charcoal mb-1">
          {balance.remaining ?? 0}
        </div>
      ) : (
        <div className="text-4xl font-heading font-bold text-charcoal mb-1">
          {balance.remaining ?? 0}
        </div>
      )}

      {/* Sub-label */}
      <div className="text-xs text-slate mb-3">
        {isUnpaid
          ? 'No limit on unpaid leave'
          : isEventBased
          ? balance.total !== null
            ? `of ${balance.total} days per event`
            : 'Event-based — admin approval required'
          : `of ${balance.total ?? '?'} days remaining`}
      </div>

      {/* Progress bar */}
      <div
        className="w-full bg-sage/30 rounded-full h-2 mb-3"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${typeName} leave: ${percent}% remaining`}
      >
        <div
          className={clsx('h-2 rounded-full transition-all', colors.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Footer note */}
      <div className={clsx('rounded p-2 text-xs', isUnpaid ? 'bg-umberbg text-umber font-semibold' : 'bg-softmint text-slate')}>
        {isUnpaid ? (
          'Deducted from salary pay'
        ) : isEventBased ? (
          <>
            <span className="font-semibold text-forest">Event-based:</span>{' '}
            Admin approves —{' '}
            {balance.leaveTypeId === LEAVE_TYPE_ID.Maternity
              ? 'up to 26 weeks per event'
              : '10 working days, within 6 months of birth'}
          </>
        ) : balance.carryForwardCap !== null && balance.leaveTypeId !== LEAVE_TYPE_ID.Sick ? (
          <>
            <span className="font-semibold text-forest">Carry-forward cap:</span>{' '}
            {balance.carryForwardCap} days
          </>
        ) : balance.leaveTypeId === LEAVE_TYPE_ID.Sick ? (
          <>
            <span className="font-semibold text-forest">Resets:</span> Jan 1 — no carry-forward
          </>
        ) : (
          'No carry-forward'
        )}
      </div>
    </div>
  );
}
