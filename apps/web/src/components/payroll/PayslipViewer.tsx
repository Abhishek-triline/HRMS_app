'use client';

/**
 * PayslipViewer — full payslip document component.
 *
 * Used by: Admin A-16, PO P-06, Employee E-09, Manager M-13 payslip detail.
 * Visual reference: prototype/admin/payslip.html
 *
 * Print stylesheet: sidebar, topbar, actions bar are hidden via print:hidden.
 * The payslip card itself prints cleanly.
 *
 * Download PDF: calls downloadPayslipPdf(id), creates a temporary object URL.
 */

import { clsx } from 'clsx';
import { MoneyDisplay } from './MoneyDisplay';
import { PayslipStatusBadge } from './PayslipStatusBadge';
import { useDownloadPayslipPdf } from '@/lib/hooks/usePayslips';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { Payslip } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PayslipViewerProps {
  payslip: Payslip;
  /** Back-link for the breadcrumb */
  backHref: string;
  backLabel: string;
}

interface LineItemProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
}

function LineItem({ label, value, sub, bold, positive, negative }: LineItemProps) {
  return (
    <div className={clsx(
      'flex items-center justify-between py-2.5 border-b border-sage/10 last:border-0',
    )}>
      <div>
        <p className={clsx('text-sm', bold ? 'font-bold text-charcoal' : 'text-charcoal')}>{label}</p>
        {sub && <p className="text-xs text-slate mt-0.5">{sub}</p>}
      </div>
      <p className={clsx(
        'text-sm font-semibold',
        bold ? 'text-charcoal text-base' : '',
        positive && 'text-richgreen',
        negative && 'text-crimson',
      )}>
        {value}
      </p>
    </div>
  );
}

export function PayslipViewer({ payslip, backHref, backLabel }: PayslipViewerProps) {
  const downloadMutation = useDownloadPayslipPdf(payslip.code);
  const isFinalised = payslip.status === 'Finalised';

  async function handleDownload() {
    try {
      await downloadMutation.mutateAsync(payslip.id);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'PDF download failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  const monthLabel = `${MONTH_NAMES[payslip.month]} ${payslip.year}`;
  const grossMinusLop = payslip.grossPaise - payslip.lopDeductionPaise;
  const taxableGross = grossMinusLop;

  return (
    <div>
      {/* Notice banner — screen-only (print:hidden) */}
      {isFinalised && (
        <div className="print:hidden bg-greenbg/70 border border-richgreen/40 rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-richgreen shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-charcoal font-semibold text-sm">
              <strong>Finalised — locked permanently.</strong> This payslip is immutable. Corrections require an Admin-initiated reversal (BL-031 / BL-032).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadMutation.isPending ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      )}

      {/* Draft / Review actions (no finalised banner) */}
      {!isFinalised && (
        <div className="print:hidden flex items-center justify-end gap-2 mb-6">
          <PayslipStatusBadge status={payslip.status} />
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadMutation.isPending}
            className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {downloadMutation.isPending ? 'Downloading…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            Print
          </button>
        </div>
      )}

      {/* Payslip document card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-8" id="payslip-document">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b border-sage/20">
          <div>
            <p className="font-heading text-lg font-bold text-forest">Nexora Technologies</p>
            <p className="text-xs text-slate mt-0.5">Payslip for {monthLabel}</p>
            <p className="font-mono text-xs text-slate mt-0.5">{payslip.code}</p>
          </div>
          <div className="text-right">
            <PayslipStatusBadge status={payslip.status} />
            {payslip.finalisedAt && (
              <p className="text-xs text-slate mt-1.5">
                Finalised {new Date(payslip.finalisedAt).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        </div>

        {/* Employee info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-5 border-b border-sage/20">
          {[
            { label: 'Employee Name', value: payslip.employeeName },
            { label: 'Employee Code', value: payslip.employeeCode },
            { label: 'Designation', value: payslip.designation ?? '—' },
            { label: 'Department', value: payslip.department ?? '—' },
            { label: 'Period', value: `${payslip.periodStart} to ${payslip.periodEnd}` },
            { label: 'Working Days', value: `${payslip.workingDays}` },
            { label: 'Days Worked', value: `${payslip.daysWorked}` },
            { label: 'LOP Days', value: `${payslip.lopDays}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-slate uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-charcoal mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Earnings + Deductions two-column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
          {/* Earnings */}
          <div>
            <h4 className="font-heading text-xs font-bold text-slate uppercase tracking-wider mb-3">Earnings</h4>
            <LineItem
              label="Basic Salary"
              value={<MoneyDisplay paise={payslip.basicPaise} />}
            />
            <LineItem
              label="Allowances"
              value={<MoneyDisplay paise={payslip.allowancesPaise} />}
            />
            {payslip.daysWorked < payslip.workingDays && (
              <LineItem
                label="Pro-ration"
                value={`${payslip.daysWorked}/${payslip.workingDays} days`}
                sub="Mid-month joiner / exit (BL-036)"
              />
            )}
            <LineItem
              label="Gross Pay"
              value={<MoneyDisplay paise={payslip.grossPaise} />}
              bold
              positive
            />
          </div>

          {/* Deductions */}
          <div>
            <h4 className="font-heading text-xs font-bold text-slate uppercase tracking-wider mb-3">Deductions</h4>
            <LineItem
              label="LOP Deduction"
              sub={`${payslip.lopDays} days × daily rate (BL-035)`}
              value={<MoneyDisplay paise={payslip.lopDeductionPaise} />}
              negative={payslip.lopDeductionPaise > 0}
            />
            <LineItem
              label="Income Tax"
              sub={payslip.status === 'Finalised' ? 'Entered by Payroll Officer (BL-036a)' : `Reference: ₹${Math.floor(payslip.referenceTaxPaise / 100).toLocaleString('en-IN')}`}
              value={<MoneyDisplay paise={payslip.finalTaxPaise} />}
              negative={payslip.finalTaxPaise > 0}
            />
            <LineItem
              label="Other Deductions"
              value={<MoneyDisplay paise={payslip.otherDeductionsPaise} />}
              negative={payslip.otherDeductionsPaise > 0}
            />
          </div>
        </div>

        {/* Net pay */}
        <div className="bg-forest/5 border border-forest/20 rounded-xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Net Pay</p>
            <p className="text-xs text-slate mt-0.5">
              Gross − LOP − Tax − Other Deductions
            </p>
          </div>
          <p className="font-heading text-2xl font-bold text-richgreen">
            <MoneyDisplay paise={payslip.netPayPaise} />
          </p>
        </div>

        {/* Reversal notice */}
        {payslip.reversalOfPayslipId && (
          <div className="mt-4 bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3">
            <p className="text-sm text-crimson font-semibold">
              This is a reversal payslip. Original payslip ID: {payslip.reversalOfPayslipId}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-sage/20 flex items-center justify-between text-xs text-slate">
          <p>Generated by Nexora HRMS · en-IN locale · paise precision</p>
          <p>v1 — slab engine deferred to v2 (BL-036a)</p>
        </div>
      </div>
    </div>
  );
}
