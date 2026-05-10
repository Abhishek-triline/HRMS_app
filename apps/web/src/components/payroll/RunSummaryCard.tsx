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

function StatTile({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-5',
        highlight
          ? 'bg-forest/5 border-forest/20'
          : 'bg-white border-sage/30 shadow-sm',
      )}
    >
      <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}

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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Employees">
          <p className="font-heading text-3xl font-bold text-charcoal">{run.employeeCount}</p>
        </StatTile>

        <StatTile label="Gross Total">
          <p className="font-heading text-xl font-bold text-charcoal">
            <MoneyDisplay paise={run.totalGrossPaise} />
          </p>
          <p className="text-xs text-slate mt-1">Before deductions</p>
        </StatTile>

        <StatTile label="Total Tax">
          <p className="font-heading text-xl font-bold text-charcoal">
            <MoneyDisplay paise={run.totalTaxPaise} />
          </p>
          <p className="text-xs text-slate mt-1">
            <MoneyDisplay paise={run.totalLopPaise} /> LOP
          </p>
        </StatTile>

        <StatTile label="Net Total" highlight={run.status === 'Finalised'}>
          {run.status === 'Draft' || run.status === 'Review' ? (
            <>
              <p className="font-heading text-xl font-bold text-slate italic">Pending</p>
              <p className="text-xs text-slate mt-1">Available after finalise</p>
            </>
          ) : (
            <p className="font-heading text-xl font-bold text-richgreen">
              <MoneyDisplay paise={run.totalNetPaise} />
            </p>
          )}
        </StatTile>
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
