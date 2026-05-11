/**
 * BalanceImpactPreview — sidebar widget for the Apply Leave form.
 *
 * Shows current balances and a "after this request" preview when a
 * leave type and day count are known.
 */

import { clsx } from 'clsx';
import type { LeaveBalance, LeaveType } from '@nexora/contracts/leave';

const typeBarColors: Record<string, string> = {
  Annual: 'bg-richgreen',
  Sick: 'bg-emerald',
  Casual: 'bg-forest',
  Unpaid: 'bg-slate/40',
  Maternity: 'bg-mint',
  Paternity: 'bg-mint',
};

interface BalanceImpactPreviewProps {
  balances: LeaveBalance[];
  selectedType: LeaveType | null;
  /** Number of days being applied for */
  requestedDays: number;
}

export function BalanceImpactPreview({
  balances,
  selectedType,
  requestedDays,
}: BalanceImpactPreviewProps) {
  const accrualBalances = balances.filter(
    (b) => b.type !== 'Maternity' && b.type !== 'Paternity',
  );

  const selectedBalance = selectedType
    ? balances.find((b) => b.type === selectedType)
    : null;

  const previewRemaining =
    selectedBalance?.remaining !== null && selectedBalance?.remaining !== undefined
      ? Math.max(0, selectedBalance.remaining - requestedDays)
      : null;

  return (
    <div className="space-y-5">
      {/* Current balances */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
        <h3 className="font-heading text-sm font-semibold text-charcoal mb-4">
          Current Leave Balances
        </h3>
        <div className="space-y-3">
          {accrualBalances.map((b) => {
            const pct =
              b.total && b.remaining !== null
                ? Math.min(100, Math.round((b.remaining / b.total) * 100))
                : 0;
            const bar = typeBarColors[b.type] ?? 'bg-forest';
            return (
              <div key={b.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate">{b.type}</span>
                  <div className="text-right">
                    {b.remaining !== null ? (
                      <>
                        <span className="text-sm font-bold text-charcoal">{b.remaining}</span>
                        {b.total !== null && (
                          <span className="text-xs text-slate"> / {b.total}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-bold text-charcoal">Available</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-sage/30 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full', bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* After-request preview */}
        {selectedType && selectedBalance && requestedDays > 0 && previewRemaining !== null && (
          <div className="mt-4 pt-4 border-t border-sage/20">
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
              After This Request (preview)
            </div>
            <div className="bg-softmint rounded-lg p-3">
              <div className="text-xs text-slate mb-1">{selectedType} Leave would become:</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-heading font-bold text-charcoal">
                  {previewRemaining}
                </span>
                <span className="text-xs text-slate">
                  if {requestedDays} day{requestedDays !== 1 ? 's' : ''} applied
                </span>
              </div>
              <div className="text-xs text-slate mt-1 flex items-center gap-1">
                <span className="line-through">{selectedBalance.remaining} remaining</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span
                  className={clsx(
                    'font-semibold',
                    previewRemaining < 0 ? 'text-crimson' : 'text-richgreen',
                  )}
                >
                  {previewRemaining} remaining
                </span>
              </div>
              {previewRemaining < 0 && (
                <div className="mt-1.5 text-xs text-crimson font-semibold">
                  Insufficient balance — request may be rejected
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
