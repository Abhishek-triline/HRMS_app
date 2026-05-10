import { clsx } from 'clsx';
import { PayrollRunStatusBadge } from './PayrollRunStatusBadge';
import { MoneyDisplay } from './MoneyDisplay';
import type { PayrollRun } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface RunSummaryCardProps {
  run: PayrollRun;
}

// ── Top 4-tile stat strip ────────────────────────────────────────────────────

/**
 * RunSummaryStatStrip — 4 cards rendered above the two-column body on the
 * payroll run detail page.
 * Prototype reference: prototype/admin/payroll-run-detail.html — "Summary Stat Cards".
 */
export function RunSummaryStatStrip({ run }: RunSummaryCardProps) {
  const isEstimated = run.status === 'Draft' || run.status === 'Review';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
      {/* Run Status */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
        <p className="text-xs text-slate font-semibold uppercase tracking-wider mb-2">Run Status</p>
        <PayrollRunStatusBadge status={run.status} />
        <p className="text-xs text-slate mt-2">
          Initiated: {new Date(run.initiatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Employees */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
        <p className="text-xs text-slate font-semibold uppercase tracking-wider mb-2">Employees</p>
        <p className="font-heading font-bold text-3xl text-charcoal">{run.employeeCount}</p>
        {/* Pro-rated count derived from the sidebar summary — shown when available */}
        <p className="text-xs text-slate mt-1">&nbsp;</p>
      </div>

      {/* Gross Total */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
        <p className="text-xs text-slate font-semibold uppercase tracking-wider mb-2">Gross Total</p>
        <p className="font-heading font-bold text-2xl text-charcoal">
          <MoneyDisplay paise={run.totalGrossPaise} />
          {isEstimated && <span className="text-slate text-xs align-super">*</span>}
        </p>
        <p className="text-xs text-slate mt-1">Before deductions</p>
      </div>

      {/* Net Total */}
      <div className={clsx('bg-white rounded-xl shadow-sm border p-5', run.status === 'Finalised' ? 'border-richgreen/30 bg-greenbg/10' : 'border-sage/30')}>
        <p className="text-xs text-slate font-semibold uppercase tracking-wider mb-2">Net Total</p>
        {isEstimated ? (
          <>
            <p className="font-heading font-bold text-xl text-slate italic">Pending</p>
            <p className="text-xs text-slate mt-1">Available after finalise</p>
          </>
        ) : (
          <p className="font-heading font-bold text-2xl text-richgreen">
            <MoneyDisplay paise={run.totalNetPaise} />
          </p>
        )}
      </div>
    </div>
  );
}

// ── Sidebar Run Summary card (detail page right sidebar) ────────────────────

/**
 * RunSummaryDetail — sidebar card shown on the payroll run detail page.
 * Prototype: prototype/admin/payroll-run-detail.html — "Run Summary Card".
 *
 * Shows: Total Employees, Gross Total, LOP Days Total, Total Tax, Net Total,
 * Pro-rated count, Initiated By.
 *
 * `proRatedCount` is passed in from the payslips list (counted by the page).
 */
export function RunSummaryDetail({
  run,
  proRatedCount = 0,
}: RunSummaryCardProps & { proRatedCount?: number }) {
  const isEstimated = run.status === 'Draft' || run.status === 'Review';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
      <h3 className="font-heading font-semibold text-sm text-charcoal mb-4">Run Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate">Total Employees</span>
          <span className="text-sm font-semibold text-charcoal">{run.employeeCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate">Gross Total</span>
          <span className="text-sm font-semibold text-charcoal">
            <MoneyDisplay paise={run.totalGrossPaise} />
            {isEstimated && <span className="text-slate text-[10px] align-super">*</span>}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate">LOP Days (total)</span>
          <span className="text-sm font-semibold text-crimson">
            {/* totalLopPaise displayed as a money value; LOP day count not in contract */}
            <MoneyDisplay paise={run.totalLopPaise} />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate">Total Tax (TDS)</span>
          <span className="text-sm font-semibold text-charcoal">
            <MoneyDisplay paise={run.totalTaxPaise} />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate">Net Total</span>
          <span className={clsx('text-sm font-semibold', isEstimated ? 'text-slate italic' : 'text-richgreen')}>
            {isEstimated ? 'Pending' : <MoneyDisplay paise={run.totalNetPaise} />}
          </span>
        </div>
        {proRatedCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate">Pro-rated Payslips</span>
            <span className="text-sm font-semibold text-charcoal">{proRatedCount} joined mid-month</span>
          </div>
        )}
        <div className="pt-2 border-t border-sage/20 flex justify-between items-center">
          <span className="text-sm text-slate">Initiated By</span>
          <span className="text-sm font-semibold text-charcoal">{run.initiatedByName}</span>
        </div>
        {run.finalisedByName && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate">Finalised By</span>
            <span className="text-sm font-semibold text-richgreen">{run.finalisedByName}</span>
          </div>
        )}
        {run.reversedByName && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate">Reversed By</span>
            <span className="text-sm font-semibold text-umber">{run.reversedByName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Original RunSummaryCard kept for backward compatibility ──────────────────

/**
 * RunSummaryCard — full-width card with header row + stat tiles.
 * Kept for any other pages that import it.
 */
export function RunSummaryCard({ run }: RunSummaryCardProps) {
  const monthLabel = `${MONTH_NAMES[run.month]} ${run.year}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-xl font-bold text-charcoal">
              {run.code}
            </h2>
            <PayrollRunStatusBadge status={run.status} />
          </div>
          <p className="text-sm text-slate mt-0.5">
            {monthLabel} · Period {run.periodStart} to {run.periodEnd} · {run.workingDays} working days
          </p>
        </div>
        <div className="text-right text-xs text-slate shrink-0">
          <p>Initiated by <span className="font-semibold text-charcoal">{run.initiatedByName}</span></p>
          <p className="mt-0.5">{new Date(run.initiatedAt).toLocaleDateString('en-IN')}</p>
          {run.finalisedByName && (
            <p className="mt-1 text-richgreen font-semibold">
              Finalised by {run.finalisedByName}
            </p>
          )}
          {run.reversedByName && (
            <p className="mt-1 text-umber font-semibold">
              Reversed by {run.reversedByName}
            </p>
          )}
        </div>
      </div>

      {/* Reversal reason banner */}
      {run.reversalReason && (
        <div className="mt-4 bg-umberbg border border-umber/20 rounded-lg px-4 py-3">
          <p className="text-sm text-umber">
            <span className="font-semibold">Reversal reason:</span> {run.reversalReason}
          </p>
        </div>
      )}
    </div>
  );
}
