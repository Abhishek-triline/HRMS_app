'use client';

/**
 * PayslipTable — shared table component for two contexts:
 *
 * 1. Run Detail view (Admin/PO): shows employee name, gross, LOP, tax, net.
 *    In Review status, renders an "Edit Tax" action (PO-only).
 *    Always has a "View" link.
 *
 * 2. Personal payslip history (Employee/Manager/Admin/PO): shows
 *    Month / Working Days / LOP Days / Gross / Tax (TDS) / Net Pay / Status / Download
 *    matching prototype/employee/my-payslips.html column set exactly.
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
  /**
   * Zero-based offset for the SR column so the numbering continues across
   * pages instead of restarting from 1. Default 0 (page 1). Pass
   * `(currentPage - 1) * pageSize`.
   */
  startIndex?: number;
}

// ── Personal history variant ──────────────────────────────────────────────────

interface PersonalHistoryTableProps {
  mode: 'personal';
  payslips: PayslipSummary[];
  basePath: string; // e.g. '/employee/payslips'
  onDownload: (payslip: PayslipSummary) => void;
  downloadingId?: number;
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

// ── Personal history mobile card ──────────────────────────────────────────────

function PersonalPayslipCard({ payslip, basePath, onDownload, downloadingId }: {
  payslip: PayslipSummary;
  basePath: string;
  onDownload: (ps: PayslipSummary) => void;
  downloadingId?: number;
}) {
  const monthLabel = `${MONTH_NAMES[payslip.month]} ${payslip.year}`;
  return (
    <div className="bg-white border border-sage/30 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-charcoal text-sm">{monthLabel}</p>
          {payslip.lopDays > 0 && (
            <p className="text-xs text-crimson italic mt-0.5">LOP deduction applied</p>
          )}
        </div>
        <PayslipStatusBadge status={payslip.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate">Working Days</p>
          <p className="font-semibold text-charcoal">{payslip.workingDays}</p>
        </div>
        <div>
          <p className="text-slate">LOP Days</p>
          <p className={clsx('font-semibold', payslip.lopDays > 0 ? 'text-crimson' : 'text-charcoal')}>
            {payslip.lopDays}
          </p>
        </div>
        <div>
          <p className="text-slate">Gross</p>
          <p className="font-semibold text-charcoal"><MoneyDisplay paise={payslip.grossPaise} /></p>
        </div>
        <div>
          <p className="text-slate">Tax (TDS)</p>
          <p className="font-semibold text-charcoal"><MoneyDisplay paise={payslip.finalTaxPaise} /></p>
        </div>
        <div className="col-span-2">
          <p className="text-slate">Net Pay</p>
          <p className="font-semibold text-richgreen"><MoneyDisplay paise={payslip.netPayPaise} /></p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`${basePath}/${payslip.id}`}
          className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors flex items-center gap-1"
        >
          View
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={() => onDownload(payslip)}
          disabled={downloadingId === payslip.id}
          className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors disabled:opacity-50"
        >
          {downloadingId === payslip.id ? '…' : 'PDF'}
        </button>
      </div>
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
    const { canEditTax, onEditTax, startIndex = 0 } = props;

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
                    <td className="px-4 py-3.5 text-slate text-xs">{startIndex + idx + 1}</td>
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
      {/* Desktop table — prototype column set:
          Month / Working Days / LOP Days / Gross / Tax (TDS) / Net Pay / Status / Download */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm" aria-label="My payslip history">
          <thead>
            <tr className="bg-offwhite border-b border-sage/20">
              <th scope="col" className="text-left px-6 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Month</th>
              <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Working Days</th>
              <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">LOP Days</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Gross</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Tax (TDS)</th>
              <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Net Pay</th>
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Status</th>
              <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/20">
            {payslips.length === 0 ? (
              <EmptyState message="No payslips yet. Your payslips will appear here after each pay run is finalised." />
            ) : (
              payslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-offwhite transition-colors">
                  {/* Month column — with LOP icon + italic note */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-charcoal flex items-center gap-1.5">
                      {ps.lopDays > 0 && (
                        <svg className="w-3.5 h-3.5 text-umber shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {MONTH_NAMES[ps.month]} {ps.year}
                    </div>
                    {ps.lopDays > 0 && (
                      <p className="text-xs text-crimson italic mt-0.5">LOP deduction applied</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate text-center">{ps.workingDays}</td>
                  <td className="px-4 py-4 text-center">
                    {ps.lopDays > 0 ? (
                      <span className="text-crimson font-bold">{ps.lopDays}</span>
                    ) : (
                      <span className="text-slate">0</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-charcoal">
                    <MoneyDisplay paise={ps.grossPaise} />
                  </td>
                  <td className="px-4 py-4 text-right text-slate">
                    <MoneyDisplay paise={ps.finalTaxPaise} />
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-richgreen">
                    <MoneyDisplay paise={ps.netPayPaise} />
                  </td>
                  <td className="px-4 py-4">
                    <PayslipStatusBadge status={ps.status} />
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`${basePath}/${ps.id}`}
                      className="text-forest font-semibold text-xs hover:text-emerald transition-colors flex items-center gap-1"
                    >
                      View
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
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
            <PersonalPayslipCard
              key={ps.id}
              payslip={ps}
              basePath={basePath}
              onDownload={onDownload}
              downloadingId={downloadingId}
            />
          ))
        )}
      </div>
    </>
  );
}

// Re-export Button so pages can use it without a separate import
export { Button };
