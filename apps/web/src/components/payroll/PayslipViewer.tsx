'use client';

/**
 * PayslipViewer — full payslip document component.
 *
 * Used by: Admin A-16, PO P-06, Employee E-09, Manager M-13 payslip detail.
 * Visual reference: prototype/admin/payslip.html + prototype/employee/payslip.html
 *
 * Sections (top to bottom inside the card):
 *  1. bg-forest company header band
 *  2. Salary slip title bar (bg-softmint)
 *  3. Employee details grid (2-col × 4 rows + net-working-days row)
 *  4. Earnings + Deductions two-column
 *  5. bg-forest Net Pay card with rupees-in-words
 *  6. Reversal notice (conditional)
 *  7. Footer band (bg-softmint/40)
 *
 * Above the card (screen-only, print:hidden):
 *  - Finalised banner with Download PDF + Print
 *  - Draft/Review action bar (no banner)
 *
 * Print stylesheet: sidebar, topbar, actions bar are hidden via print:hidden.
 * The payslip card itself prints cleanly.
 */

import { clsx } from 'clsx';
import { MoneyDisplay } from './MoneyDisplay';
import { PayslipStatusBadge } from './PayslipStatusBadge';
import { useDownloadPayslipPdf } from '@/lib/hooks/usePayslips';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { Payslip } from '@nexora/contracts/payroll';

// ── Utilities ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * numberToWords — Indian numbering (lakh / crore).
 * Converts a non-negative integer to words.
 * Used for the "Rupees ... Only" line in the Net Pay card.
 */
function numberToWords(n: number): string {
  if (n === 0) return 'Zero';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num] ?? '';
    const t = Math.floor(num / 10);
    const o = num % 10;
    return (tens[t] ?? '') + (o > 0 ? ' ' + (ones[o] ?? '') : '');
  }

  function threeDigits(num: number): string {
    if (num === 0) return '';
    const h = Math.floor(num / 100);
    const rest = num % 100;
    let result = '';
    if (h > 0) result += (ones[h] ?? '') + ' Hundred';
    if (rest > 0) result += (result ? ' ' : '') + twoDigits(rest);
    return result;
  }

  // Indian system: ones, thousands, lakhs, crores
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  const remainder = n;

  const parts: string[] = [];
  if (crore > 0) parts.push(threeDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(threeDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(threeDigits(thousand) + ' Thousand');
  if (remainder > 0) parts.push(threeDigits(remainder));

  return parts.join(' ');
}

/** Format paise as Indian rupee string, no decimals. */
function formatPaise(paise: number | null): string {
  if (paise === null) return '—';
  return formatPaiseRaw(paise);
}

function formatPaiseRaw(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.floor(paise / 100));
}

/** Convert paise to the "Rupees X Only" words string. */
function paiseToWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  let result = 'Rupees ' + numberToWords(rupees);
  if (p > 0) result += ' and ' + numberToWords(p) + ' Paise';
  result += ' Only';
  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface PayslipViewerProps {
  payslip: Payslip;
  /** Back-link for the breadcrumb */
  backHref: string;
  backLabel: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function PayslipViewer({ payslip, backHref: _backHref, backLabel: _backLabel }: PayslipViewerProps) {
  const downloadMutation = useDownloadPayslipPdf(payslip.code);
  const isFinalised = payslip.status === 3; // 3=Finalised

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
  const monthLabelUpper = `${MONTH_NAMES[payslip.month]?.toUpperCase()} ${payslip.year}`;
  const netWorkingDays = payslip.workingDays - payslip.lopDays;

  // Mask PAN: show first 5 chars + **** + last char  (field not in contract — show placeholder)
  // PAN is not in the Payslip contract type — surface what we have (employeeCode) and note below.
  // Bank A/C is also not in the contract — we show a masked placeholder.

  return (
    <div>
      {/* ── Finalised banner (screen-only) ──────────────────────────────────── */}
      {isFinalised && (
        <div className="print:hidden bg-greenbg/70 border border-richgreen/40 rounded-xl px-4 py-3 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-greenbg text-richgreen text-xs font-bold px-3 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Finalised
            </span>
            <p className="text-charcoal text-sm">
              This payslip is finalised and cannot be modified.
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

      {/* ── Draft / Review action bar ────────────────────────────────────────── */}
      {!isFinalised && (
        <div className="print:hidden flex items-center justify-end gap-2 mb-6">
          <PayslipStatusBadge status={payslip.status} />
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadMutation.isPending}
            className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
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
      )}

      {/* ── Payslip document card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden" id="payslip-document">

        {/* 1 — bg-forest company header band */}
        <div className="bg-forest text-white px-6 py-5 rounded-t-xl">
          <p className="font-heading text-xl font-bold">Nexora Technologies Pvt. Ltd.</p>
          <p className="text-white/80 text-xs mt-1">
            4th Floor, Techpark One, Outer Ring Road, Bengaluru - 560103
          </p>
          <p className="text-white/80 text-xs mt-0.5">
            CIN: U72200KA2019PTC123456 &middot; GSTIN: 29AAACN1234A1ZX
          </p>
        </div>

        {/* 2 — Salary slip title bar */}
        <div className="bg-softmint border-y border-mint/30 px-6 py-3 flex items-center justify-between">
          <div>
            <p className="font-heading text-base font-bold text-charcoal uppercase tracking-wide">
              SALARY SLIP &mdash; {monthLabelUpper}
            </p>
            <p className="text-xs text-slate mt-0.5">
              Pay Period: {payslip.periodStart} to {payslip.periodEnd}
            </p>
          </div>
          <PayslipStatusBadge status={payslip.status} />
        </div>

        {/* 3 — Employee details grid */}
        <div className="px-6 py-5 border-b border-sage/20">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* Row 1: Name | EMP Code */}
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">Employee Name</span>
              <span className="font-medium text-forest text-right">{payslip.employeeName}</span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">EMP Code</span>
              <span className="font-medium text-forest font-mono text-right">{payslip.employeeCode}</span>
            </div>

            {/* Row 2: Designation | Department */}
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">Designation</span>
              <span className="font-medium text-forest text-right">{payslip.designation ?? '—'}</span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">Department</span>
              <span className="font-medium text-forest text-right">{payslip.department ?? '—'}</span>
            </div>

            {/* Row 3: PAN | Bank A/C — not in contract; show masked placeholders */}
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">PAN</span>
              <span className="font-medium text-forest text-right">—</span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">Bank A/C</span>
              <span className="font-medium text-forest text-right">—</span>
            </div>

            {/* Row 4: Working Days | LOP Days */}
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">Working Days</span>
              <span className="font-medium text-forest text-right">{payslip.workingDays}</span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">LOP Days</span>
              <span className={clsx(
                'font-medium text-right',
                payslip.lopDays > 0 ? 'text-crimson font-semibold' : 'text-forest',
              )}>
                {payslip.lopDays}
              </span>
            </div>

            {/* Full-width row: Net Working Days */}
            <div className="flex justify-between items-baseline gap-2 col-span-2 border-t border-sage/20 pt-3">
              <span className="text-xs text-slate uppercase tracking-wide shrink-0">Net Working Days</span>
              <span className="font-bold text-charcoal text-right">{netWorkingDays}</span>
            </div>
          </div>
        </div>

        {/* 4 — Earnings + Deductions two-column */}
        <div className="px-6 py-5 border-b border-sage/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Earnings */}
            <div>
              <h4 className="font-heading text-xs font-bold text-forest uppercase tracking-wider mb-3">Earnings</h4>
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
              <h4 className="font-heading text-xs font-bold text-crimson uppercase tracking-wider mb-3">Deductions</h4>
              <LineItem
                label="LOP Deduction"
                sub={`${payslip.lopDays} days × daily rate (BL-035)`}
                value={<MoneyDisplay paise={payslip.lopDeductionPaise} />}
                negative={(payslip.lopDeductionPaise ?? 0) > 0}
              />
              <LineItem
                label="Income Tax (TDS)"
                sub={
                  payslip.status === 3 // 3=Finalised
                    ? 'Entered by Payroll Officer (BL-036a)'
                    : payslip.referenceTaxPaise !== null
                      ? `Reference: ₹${Math.floor(payslip.referenceTaxPaise / 100).toLocaleString('en-IN')}`
                      : ''
                }
                value={<MoneyDisplay paise={payslip.finalTaxPaise} />}
                negative={(payslip.finalTaxPaise ?? 0) > 0}
              />
              <LineItem
                label="Other Deductions"
                value={<MoneyDisplay paise={payslip.otherDeductionsPaise} />}
                negative={(payslip.otherDeductionsPaise ?? 0) > 0}
              />
            </div>
          </div>
        </div>

        {/* 5 — bg-forest Net Pay card */}
        <div className="px-6 py-6">
          <div className="bg-forest text-white rounded-xl text-center py-6">
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">NET PAY</p>
            {payslip.netPayPaise === null ? (
              <p className="font-heading text-3xl font-bold mb-2">— Hidden —</p>
            ) : (
              <>
                <p className="font-heading text-5xl font-bold mb-2">
                  {formatPaise(payslip.netPayPaise)}
                </p>
                <p className="text-sm opacity-90 italic">
                  {paiseToWords(payslip.netPayPaise)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Reversal notice */}
        {payslip.reversalOfPayslipId && (
          <div className="mx-6 mb-4 bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3">
            <p className="text-sm text-crimson font-semibold">
              This is a reversal payslip. Original payslip ID: {payslip.reversalOfPayslipId}
            </p>
          </div>
        )}

        {/* 6 — Footer band */}
        <div className="bg-softmint/40 text-slate text-xs text-center px-6 py-3 rounded-b-xl border-t border-sage/20">
          This is a computer-generated payslip and does not require a signature.
          For any queries, contact HR at{' '}
          <a href="mailto:hr@nexoratech.in" className="underline hover:text-forest transition-colors">
            hr@nexoratech.in
          </a>.
        </div>
      </div>
    </div>
  );
}
