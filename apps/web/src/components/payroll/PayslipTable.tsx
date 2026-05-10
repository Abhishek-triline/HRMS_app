'use client';

/**
 * PayslipTable — shared table component for two contexts:
 *
 * 1. Run Detail view (Admin/PO): shows employee name, gross, LOP, tax, net.
 *    In Review status, renders an "Edit Tax" action (PO-only).
 *    Always has a "View" link.
 *
 * 2. Personal payslip history (Employee/Manager): shows month, gross, tax,
 *    net, status, "View" and "Download PDF" actions.
 *
 * Mobile: cards instead of table rows at ≤768 px.
 */

import Link from 'next/link';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { MoneyDisplay } from './MoneyDisplay';
import { PayslipStatusBadge } from './PayslipStatusBadge';
import type { PayslipSummary } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── Run-detail variant ────────────────────────────────────────────────────────

interface RunDetailTableProps {
  mode: 'run-detail';
  payslips: PayslipSummary[];
  basePath: string; // e.g. '/admin/payslips' or '/payroll/payslips'
  canEditTax: boolean; // true when run.status === 'Review' and user is PO/Admin
  onEditTax: (payslip: PayslipSummary) => void;
  isLoading?: boolean;
}

// ── Personal history variant ──────────────────────────────────────────────────

interface PersonalHistoryTableProps {
  mode: 'personal';
  payslips: PayslipSummary[];
  basePath: string; // e.g. '/employee/payslips'
  onDownload: (payslip: PayslipSummary) => void;
  downloadingId?: string;
  isLoading?: boolean;
}

type PayslipTableProps = RunDetailTableProps | PersonalHistoryTableProps;

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={10} className="px-6 py-12 text-center text-slate text-sm">
        {message}
      </td>
    </tr>
  );
}

// ── Mobile card (shared) ──────────────────────────────────────────────────────

function PayslipCard({ payslip, actions }: {
  payslip: PayslipSummary;
  actions: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-sage/30 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-charcoal text-sm">{payslip.employeeName}</p>
          <p className="font-mono text-xs text-forest mt-0.5">{payslip.employeeCode}</p>
        </div>
        <PayslipStatusBadge status={payslip.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate">Gross</p>
          <p className="font-semibold text-charcoal"><MoneyDisplay paise={payslip.grossPaise} /></p>
        </div>
        <div>
          <p className="text-slate">Tax</p>
          <p className="font-semibold text-charcoal"><MoneyDisplay paise={payslip.finalTaxPaise} /></p>
        </div>
        <div>
          <p className="text-slate">Net</p>
          <p className="font-semibold text-richgreen"><MoneyDisplay paise={payslip.netPayPaise} /></p>
        </div>
      </div>
      {payslip.lopDays > 0 && (
        <p className="text-xs text-umber">LOP: {payslip.lopDays} days</p>
      )}
      <div className="flex items-center gap-2 pt-1">{actions}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PayslipTable(props: PayslipTableProps) {
  const { payslips, basePath, isLoading } = props;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
        <span className="ml-2 text-sm text-slate">Loading payslips…</span>
      </div>
    );
  }

  // ── Run-detail mode ─────────────────────────────────────────────────────────
  if (props.mode === 'run-detail') {
    const { canEditTax, onEditTax } = props;

    return (
      <>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm" aria-label="Employee payslips">
            <thead>
              <tr className="bg-offwhite border-b border-sage/20">
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">#</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Employee</th>
                <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Code</th>
                <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Gross</th>
                <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">LOP</th>
                <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Tax</th>
                <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Net Pay</th>
                <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {payslips.length === 0 ? (
                <EmptyState message="No payslips found for this run." />
              ) : (
                payslips.map((ps, idx) => (
                  <tr key={ps.id} className="hover:bg-offwhite/60 transition-colors">
                    <td className="px-4 py-3.5 text-slate text-xs">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-medium text-charcoal">{ps.employeeName}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-forest">{ps.employeeCode}</td>
                    <td className="px-4 py-3.5 text-right text-charcoal">
                      <MoneyDisplay paise={ps.grossPaise} />
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate">
                      {ps.lopDays > 0 ? (
                        <span className="text-umber font-semibold">{ps.lopDays}d</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-charcoal">
                      <MoneyDisplay paise={ps.finalTaxPaise} />
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-richgreen">
                      <MoneyDisplay paise={ps.netPayPaise} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canEditTax && (
                          <button
                            type="button"
                            onClick={() => onEditTax(ps)}
                            className="text-forest text-xs font-semibold hover:underline min-h-[44px] px-1"
                          >
                            Edit Tax
                          </button>
                        )}
                        <Link
                          href={`${basePath}/${ps.id}`}
                          className="text-forest text-xs font-semibold hover:underline min-h-[44px] inline-flex items-center"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 p-4">
          {payslips.length === 0 ? (
            <p className="text-center text-slate text-sm py-8">No payslips found for this run.</p>
          ) : (
            payslips.map((ps) => (
              <PayslipCard
                key={ps.id}
                payslip={ps}
                actions={
                  <>
                    {canEditTax && (
                      <button
                        type="button"
                        onClick={() => onEditTax(ps)}
                        className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors"
                      >
                        Edit Tax
                      </button>
                    )}
                    <Link
                      href={`${basePath}/${ps.id}`}
                      className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors"
                    >
                      View
                    </Link>
                  </>
                }
              />
            ))
          )}
        </div>
      </>
    );
  }

  // ── Personal history mode ───────────────────────────────────────────────────
  const { onDownload, downloadingId } = props;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm" aria-label="My payslip history">
          <thead>
            <tr className="bg-offwhite border-b border-sage/20">
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Month</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Gross</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Tax</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Net Pay</th>
              <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Status</th>
              <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {payslips.length === 0 ? (
              <EmptyState message="No payslips yet. Your payslips will appear here after each pay run is finalised." />
            ) : (
              payslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-offwhite/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-charcoal">
                      {MONTH_NAMES[ps.month]} {ps.year}
                    </span>
                    {ps.lopDays > 0 && (
                      <span className="ml-2 text-xs text-umber">{ps.lopDays}d LOP</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-charcoal">
                    <MoneyDisplay paise={ps.grossPaise} />
                  </td>
                  <td className="px-4 py-3.5 text-right text-charcoal">
                    <MoneyDisplay paise={ps.finalTaxPaise} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-richgreen">
                    <MoneyDisplay paise={ps.netPayPaise} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <PayslipStatusBadge status={ps.status} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        href={`${basePath}/${ps.id}`}
                        className="text-forest text-xs font-semibold hover:underline"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDownload(ps)}
                        disabled={downloadingId === ps.id}
                        className={clsx(
                          'text-xs font-semibold hover:underline',
                          downloadingId === ps.id ? 'text-slate cursor-wait' : 'text-forest',
                        )}
                      >
                        {downloadingId === ps.id ? 'Downloading…' : 'PDF'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-4">
        {payslips.length === 0 ? (
          <p className="text-center text-slate text-sm py-8">
            No payslips yet. They will appear here after each pay run is finalised.
          </p>
        ) : (
          payslips.map((ps) => (
            <PayslipCard
              key={ps.id}
              payslip={ps}
              actions={
                <>
                  <Link
                    href={`${basePath}/${ps.id}`}
                    className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDownload(ps)}
                    disabled={downloadingId === ps.id}
                    className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors disabled:opacity-50"
                  >
                    {downloadingId === ps.id ? '…' : 'PDF'}
                  </button>
                </>
              }
            />
          ))
        )}
      </div>
    </>
  );
}

// Re-export Button so pages can use it without a separate import
export { Button };
