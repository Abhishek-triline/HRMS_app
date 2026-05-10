/**
 * LeaveBalanceCard — single balance tile.
 *
 * Renders: label, remaining/total, progress bar, carry-forward note.
 * Handles event-based (Maternity/Paternity), unpaid (no total), and
 * standard accrual types.
 */

import { clsx } from 'clsx';
import type { LeaveBalance } from '@nexora/contracts/leave';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  className?: string;
}

const typeColors: Record<string, { bar: string; badge: string; badgeText: string }> = {
  Annual: { bar: 'bg-richgreen', badge: 'bg-greenbg', badgeText: 'text-richgreen' },
  Sick: { bar: 'bg-emerald', badge: 'bg-greenbg', badgeText: 'text-richgreen' },
  Casual: { bar: 'bg-forest', badge: 'bg-greenbg', badgeText: 'text-richgreen' },
  Unpaid: { bar: 'bg-slate/40', badge: 'bg-umberbg', badgeText: 'text-umber' },
  Maternity: { bar: 'bg-mint', badge: 'bg-softmint', badgeText: 'text-forest' },
  Paternity: { bar: 'bg-mint', badge: 'bg-softmint', badgeText: 'text-forest' },
};

function getPercent(remaining: number | null, total: number | null): number {
  if (remaining === null || total === null || total === 0) return 0;
  return Math.min(100, Math.round((remaining / total) * 100));
}

export function LeaveBalanceCard({ balance, className }: LeaveBalanceCardProps) {
  const colors = typeColors[balance.type] ?? typeColors.Annual;
  const isEventBased = balance.type === 'Maternity' || balance.type === 'Paternity';
  const isUnpaid = balance.type === 'Unpaid';
  const percent = getPercent(balance.remaining, balance.total);

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
          {balance.type}
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
        aria-label={`${balance.type} leave: ${percent}% remaining`}
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
            Admin approves — {balance.type === 'Maternity' ? 'up to 26 weeks per event' : '10 working days, within 6 months of birth'}
          </>
        ) : balance.carryForwardCap !== null && balance.type !== 'Sick' ? (
          <>
            <span className="font-semibold text-forest">Carry-forward cap:</span>{' '}
            {balance.carryForwardCap} days
          </>
        ) : balance.type === 'Sick' ? (
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
