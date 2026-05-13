/**
 * ReversalHistoryTable — A-24 / P-07.
 *
 * Columns: Original Run, Reversal Run, Period, Employees Affected,
 *          Net Adjustment, Reversed By, Reversed At, Reason.
 *
 * Mobile: cards. Empty state included.
 */

import { clsx } from 'clsx';
import { MoneyDisplay } from './MoneyDisplay';
import { Spinner } from '@/components/ui/Spinner';
import type { ReversalHistoryItem } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface ReversalHistoryTableProps {
  items: ReversalHistoryItem[];
  isLoading?: boolean;
  /** When true, renders a "read-only" notice (P-07). */
  readOnly?: boolean;
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-12 text-center text-slate text-sm">
        No reversals on record. Reversals appear here when an Admin reverses a finalised run.
      </td>
    </tr>
  );
}

export function ReversalHistoryTable({
  items,
  isLoading,
  readOnly,
}: ReversalHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
        <span className="ml-2 text-sm text-slate">Loading reversal history…</span>
      </div>
    );
  }

  return (
    <div>
      {readOnly && (
        <div className="bg-offwhite border border-sage/40 rounded-lg px-4 py-3 mb-4 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-slate shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-slate">
            <strong>View only.</strong> Only Admin can initiate a reversal.
          </p>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm" aria-label="Reversal history">
          <thead>
            <tr className="bg-offwhite border-b border-sage/20">
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Original Run</th>
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Reversal Run</th>
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Period</th>
              <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Employees</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Net Adjustment</th>
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Reversed By</th>
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              items.map((item) => (
                <tr key={item.reversalRunId} className="hover:bg-offwhite/60 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-forest">{item.originalRunCode}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-crimson">{item.reversalRunCode}</td>
                  <td className="px-4 py-3.5 text-charcoal text-xs">
                    {MONTH_NAMES[item.month]} {item.year}
                  </td>
                  <td className="px-4 py-3.5 text-center text-charcoal">{item.affectedEmployees}</td>
                  <td className={clsx(
                    'px-4 py-3.5 text-right font-semibold',
                    item.netAdjustmentPaise < 0 ? 'text-crimson' : 'text-charcoal',
                  )}>
                    <MoneyDisplay paise={item.netAdjustmentPaise} colorCode />
                  </td>
                  <td className="px-4 py-3.5 text-charcoal text-xs">
                    <p className="font-semibold">{item.reversedByName}</p>
                    <p className="text-slate mt-0.5">
                      {new Date(item.reversedAt).toLocaleDateString('en-IN')}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-slate text-xs max-w-xs">
                    <p className="truncate" title={item.reason}>{item.reason}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-4">
        {items.length === 0 ? (
          <p className="text-center text-slate text-sm py-8">
            No reversals on record.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.reversalRunId} className="bg-white border border-sage/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-forest">{item.originalRunCode}</p>
                <p className="font-mono text-xs text-crimson">{item.reversalRunCode}</p>
              </div>
              <p className="text-xs font-semibold text-charcoal">
                {MONTH_NAMES[item.month]} {item.year}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate">Employees</p>
                  <p className="font-semibold text-charcoal">{item.affectedEmployees}</p>
                </div>
                <div>
                  <p className="text-slate">Net Adj.</p>
                  <p className={clsx(
                    'font-semibold',
                    item.netAdjustmentPaise < 0 ? 'text-crimson' : 'text-charcoal',
                  )}>
                    <MoneyDisplay paise={item.netAdjustmentPaise} colorCode />
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate">{item.reason}</p>
              <p className="text-xs text-slate">
                By {item.reversedByName} · {new Date(item.reversedAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
