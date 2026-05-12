'use client';

/**
 * PayslipDetailView — prototype-faithful payslip detail view.
 *
 * Visual reference (primary):  prototype/admin/payslip.html
 * Cross-checked against:       prototype/manager/payslip.html
 *                               prototype/employee/payslip.html
 *                               prototype/payroll-officer/payslip.html
 *
 * All four prototypes share the same structure. Minor per-role differences:
 *   - Admin / PO:     employee grid is 3-column (Name, EMP Code, Designation /
 *                     Department, PAN, Bank / Working Days, LOP, Net Working)
 *   - Employee / Mgr: employee grid is 2-column (same fields, fewer columns)
 *   This component uses 3-col on md+ and collapses to 2-col on small screens,
 *   which satisfies every role without branching.
 *
 * Sections (matching prototype top-to-bottom):
 *   1. Finalised notice banner  (bg-greenbg/70, screen-only, print:hidden)
 *      OR Reversed banner       (bg-crimsonbg/70, screen-only, print:hidden)
 *   2. Payslip card
 *      a. bg-forest company header band (two-col: company info | Salary Slip box)
 *      b. bg-softmint employee info grid (3-col)
 *      c. Earnings + Deductions two-col table grid
 *      d. mx-8 bg-forest Net Pay box
 *      e. Footer band (Run ID + Generated + Fiscal Year)
 *
 * Props:
 *   payslipId — fetches via usePayslip()
 *   backHref  — role-correct "← Back" href (e.g. "/admin/payslips")
 *
 * Data notes:
 *   - PAN and Bank A/C are NOT in the Payslip contract — rendered as "—"
 *     (flagged for v1.1, see comment below)
 *   - Earnings breakdown (Basic, HRA, Transport…) is NOT in the contract —
 *     the contract only exposes basicPaise + allowancesPaise. We render two
 *     rows (Basic Salary + Allowances) which is contract-faithful. Individual
 *     component breakdown is flagged for v1.1.
 *   - Professional Tax is rolled into otherDeductionsPaise — no separate field.
 *     Flagged for v1.1.
 */

import Link from 'next/link';
import { usePayslip, useDownloadPayslipPdf } from '@/lib/hooks/usePayslips';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { Payslip, PayslipStatus } from '@nexora/contracts/payroll';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTH = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format paise as Indian rupee string, no symbol prefix in tables (just digits). */
function fmtRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.floor(paise / 100));
}

/** Format paise with ₹ symbol — used for the Net Pay card. */
function fmtRupeesWithSymbol(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.floor(paise / 100));
}

/**
 * numberToWords — Indian numbering (lakh / crore).
 * Used for the "Rupees … Only" line in the Net Pay card.
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

function paiseToWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  let result = 'Rupees ' + numberToWords(rupees);
  if (p > 0) result += ' and ' + numberToWords(p) + ' Paise';
  result += ' Only';
  return result;
}

/** Format an ISO date string as "DD Mon YYYY", e.g. "30 Apr 2026". */
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getUTCDate();
  const mon = SHORT_MONTH[d.getUTCMonth() + 1] ?? '';
  const year = d.getUTCFullYear();
  return `${day} ${mon} ${year}`;
}

/** Format an ISO datetime string as "DD Mon YYYY, H:MM AM/PM". */
function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/** Fiscal year label for a given month + year, e.g. "Apr 2026 – Mar 2027". */
function fiscalYearLabel(month: number, year: number): string {
  const fyStart = month >= 4 ? year : year - 1;
  return `Apr ${fyStart} – Mar ${fyStart + 1}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps { status: PayslipStatus }

function InlineStatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Finalised':
      return (
        <span className="bg-greenbg text-richgreen text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Finalised
        </span>
      );
    case 'Reversed':
      return (
        <span className="bg-crimsonbg text-crimson text-xs font-bold px-3 py-1 rounded-full">
          Reversed
        </span>
      );
    case 'Review':
      return (
        <span className="bg-umberbg text-umber text-xs font-bold px-3 py-1 rounded-full">
          Under Review
        </span>
      );
    case 'Draft':
    default:
      return (
        <span className="bg-umberbg text-umber text-xs font-bold px-3 py-1 rounded-full">
          Draft
        </span>
      );
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PayslipSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading payslip…">
      {/* Banner skeleton */}
      <div className="bg-sage/20 rounded-xl h-14 mb-6" />
      {/* Card skeleton */}
      <div className="bg-white rounded-xl border border-sage/30 overflow-hidden">
        {/* Header band */}
        <div className="bg-forest/80 px-8 py-7">
          <div className="h-6 bg-white/20 rounded w-64 mb-2" />
          <div className="h-3 bg-white/10 rounded w-80 mb-1" />
          <div className="h-3 bg-white/10 rounded w-72" />
        </div>
        {/* Employee grid */}
        <div className="px-8 py-6 bg-softmint border-b border-sage/20">
          <div className="grid grid-cols-3 gap-x-8 gap-y-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i}>
                <div className="h-2.5 bg-sage/40 rounded w-20 mb-2" />
                <div className="h-4 bg-sage/20 rounded w-28" />
              </div>
            ))}
          </div>
        </div>
        {/* Tables area */}
        <div className="px-8 py-6 border-b border-sage/20">
          <div className="grid grid-cols-2 gap-8">
            {[0, 1].map((col) => (
              <div key={col}>
                <div className="h-3 bg-sage/30 rounded w-16 mb-4" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-sage/10">
                    <div className="h-3 bg-sage/20 rounded w-32" />
                    <div className="h-3 bg-sage/20 rounded w-16" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Net pay */}
        <div className="mx-8 my-6 bg-forest/80 rounded-xl px-8 py-6 text-center">
          <div className="h-3 bg-white/20 rounded w-16 mx-auto mb-3" />
          <div className="h-10 bg-white/20 rounded w-40 mx-auto mb-2" />
          <div className="h-3 bg-white/10 rounded w-64 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// ── Main document component ───────────────────────────────────────────────────

interface PayslipDocumentProps {
  payslip: Payslip;
  onDownload: () => void;
  isDownloading: boolean;
}

function PayslipDocument({ payslip, onDownload, isDownloading }: PayslipDocumentProps) {
  const isFinalised = payslip.status === 'Finalised';
  const isReversed = payslip.status === 'Reversed';
  const netWorkingDays = payslip.workingDays - payslip.lopDays;
  const monthLabel = `${MONTH_NAMES[payslip.month] ?? ''} ${payslip.year}`;
  const monthLabelUpper = `${(MONTH_NAMES[payslip.month] ?? '').toUpperCase()} ${payslip.year}`;
  const fyLabel = fiscalYearLabel(payslip.month, payslip.year);

  // Taxable income annual estimate — gross × 12 as a rough display figure
  const taxableAnnualRupees = Math.floor((payslip.grossPaise / 100) * 12);

  return (
    <>
      {/* ── Finalised notice banner (screen only) ─────────────────────────── */}
      {isFinalised && (
        <div className="print:hidden bg-greenbg/70 border border-richgreen/40 rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-richgreen shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-charcoal font-semibold text-sm">
              <strong>Finalised — locked permanently.</strong>{' '}
              This payslip is immutable. Corrections require an Admin-initiated reversal that creates a new record (BL-031 / BL-032).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isDownloading ? 'Downloading…' : 'Download PDF'}
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

      {/* ── Reversed notice banner (screen only) ──────────────────────────── */}
      {isReversed && (
        <div className="print:hidden bg-crimsonbg/70 border border-crimson/40 rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-crimson shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-crimson font-semibold text-sm">
                This payslip has been reversed.
              </p>
              {payslip.reversalOfPayslipId && (
                <p className="text-xs text-slate mt-0.5">
                  Reversal of payslip ID: <span className="font-mono">{payslip.reversalOfPayslipId}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className="border border-sage/60 text-slate hover:border-crimson hover:text-crimson px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isDownloading ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-sage/60 text-slate hover:border-crimson hover:text-crimson px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      )}

      {/* ── Draft / Review action bar (no lock banner) ────────────────────── */}
      {!isFinalised && !isReversed && (
        <div className="print:hidden flex items-center justify-between mb-6 flex-wrap gap-3">
          <InlineStatusBadge status={payslip.status} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className="border border-sage/60 text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isDownloading ? 'Downloading…' : 'Download PDF'}
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

      {/* ── Payslip document card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">

        {/* a — bg-forest company header band ─────────────────────────────── */}
        <div className="bg-forest px-8 py-7 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading font-bold text-2xl text-white tracking-tight">
                Nexora Technologies Pvt. Ltd.
              </h2>
              <p className="text-white/70 text-sm mt-1">
                4th Floor, Orchid Business Park, Pune — 411006, Maharashtra, India
              </p>
              <p className="text-white/70 text-sm">
                GSTIN: 27AABCN1234F1Z5 &nbsp;|&nbsp; CIN: U72200MH2018PTC123456
              </p>
            </div>
            <div className="text-right shrink-0 ml-6">
              <div className="bg-white/15 rounded-lg px-4 py-2.5 inline-block">
                <p className="font-heading font-bold text-base text-white uppercase tracking-widest">
                  Salary Slip
                </p>
                <p className="text-mint text-sm font-semibold mt-0.5">{monthLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* b — bg-softmint employee info grid ────────────────────────────── */}
        <div className="px-8 py-6 bg-softmint border-b border-sage/20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Employee Name</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{payslip.employeeName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">EMP Code</p>
              <p className="text-sm font-mono font-semibold text-forest mt-0.5">{payslip.employeeCode}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Designation</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{payslip.designation ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Department</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{payslip.department ?? '—'}</p>
            </div>
            {/*
              PAN and Bank Account are NOT in the Payslip contract (v1 gap).
              Rendered as masked dashes. Flagged for v1.1: backend to expose
              masked PAN (e.g. AAAP*****N) and masked bank account.
            */}
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">PAN</p>
              <p className="text-sm font-mono font-semibold text-charcoal mt-0.5">—</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Bank Account</p>
              <p className="text-sm font-mono font-semibold text-charcoal mt-0.5">—</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Working Days</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{payslip.workingDays}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">LOP Days</p>
              <p className={`text-sm font-semibold mt-0.5 ${payslip.lopDays > 0 ? 'text-crimson' : 'text-charcoal'}`}>
                {payslip.lopDays}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Net Working Days</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{netWorkingDays}</p>
            </div>
          </div>
        </div>

        {/* c — Earnings + Deductions two-col table grid ───────────────────── */}
        <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-8 border-b border-sage/20">

          {/* Earnings table */}
          <div>
            <h3 className="font-heading font-semibold text-sm text-charcoal uppercase tracking-wider mb-3">
              Earnings
            </h3>
            <table className="w-full text-sm" data-nx-no-filter="true">
              <thead>
                <tr className="border-b border-sage/30">
                  <th className="text-left py-2 font-semibold text-slate text-xs">Component</th>
                  <th className="text-right py-2 font-semibold text-slate text-xs">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                <tr>
                  <td className="py-2.5 text-slate">Basic Salary</td>
                  <td className="py-2.5 text-right text-charcoal font-medium">
                    {fmtRupees(payslip.basicPaise)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate">Allowances</td>
                  <td className="py-2.5 text-right text-charcoal font-medium">
                    {fmtRupees(payslip.allowancesPaise)}
                  </td>
                </tr>
                {/* Leave encashment line — BL-LE-09 / BL-LE-11 */}
                {payslip.encashmentDays > 0 && payslip.encashmentPaise > 0 && (
                  <tr>
                    <td className="py-2.5 text-slate">
                      Leave Encashment ({payslip.encashmentDays} day{payslip.encashmentDays !== 1 ? 's' : ''}{' '}
                      @ ₹{Math.floor(payslip.encashmentPaise / (payslip.encashmentDays * 100)).toLocaleString('en-IN')}/day)
                    </td>
                    <td className="py-2.5 text-right text-richgreen font-medium">
                      {fmtRupees(payslip.encashmentPaise)}
                    </td>
                  </tr>
                )}
                {/* Encashment reversal line — BL-LE-11 (negative encashmentPaise) */}
                {(payslip.encashmentPaise as number) < 0 && (
                  <tr>
                    <td className="py-2.5 text-slate">
                      <div>
                        Leave Encashment Reversal ({payslip.encashmentDays} day{payslip.encashmentDays !== 1 ? 's' : ''})
                        <p className="text-xs text-slate/70 italic mt-0.5">
                          Money reversed; leave days remain encashed for the year (BL-LE-11)
                        </p>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-crimson font-medium">
                      {fmtRupees(payslip.encashmentPaise)}
                    </td>
                  </tr>
                )}
                {/* Pro-ration row — only visible when days worked < working days (BL-036) */}
                {payslip.daysWorked < payslip.workingDays && (
                  <tr>
                    <td className="py-2.5 text-slate text-xs italic" colSpan={2}>
                      Pro-rated: {payslip.daysWorked}/{payslip.workingDays} days worked (BL-036)
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-forest text-white">
                  <td className="py-3 px-2 rounded-l-lg font-heading font-bold text-sm">
                    Gross Earnings
                  </td>
                  <td className="py-3 px-2 rounded-r-lg text-right font-heading font-bold text-sm">
                    {fmtRupees(payslip.grossPaise)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions table */}
          <div>
            <h3 className="font-heading font-semibold text-sm text-charcoal uppercase tracking-wider mb-3">
              Deductions
            </h3>
            <table className="w-full text-sm" data-nx-no-filter="true">
              <thead>
                <tr className="border-b border-sage/30">
                  <th className="text-left py-2 font-semibold text-slate text-xs">Component</th>
                  <th className="text-right py-2 font-semibold text-slate text-xs">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                <tr>
                  <td className="py-2.5 text-slate">LOP Deduction</td>
                  <td className={`py-2.5 text-right font-medium ${payslip.lopDeductionPaise > 0 ? 'text-charcoal' : 'text-slate'}`}>
                    {fmtRupees(payslip.lopDeductionPaise)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate">Other Deductions</td>
                  <td className={`py-2.5 text-right font-medium ${payslip.otherDeductionsPaise > 0 ? 'text-charcoal' : 'text-slate'}`}>
                    {fmtRupees(payslip.otherDeductionsPaise)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate">Income Tax (TDS)</td>
                  <td className={`py-2.5 text-right font-medium ${payslip.finalTaxPaise > 0 ? 'text-charcoal' : 'text-slate'}`}>
                    {fmtRupees(payslip.finalTaxPaise)}
                  </td>
                </tr>
                {/* Taxable income annotation row — matches prototype */}
                <tr className="bg-offwhite/60">
                  <td className="py-2.5 px-1 text-xs text-slate italic" colSpan={2}>
                    Taxable Income (annual est.): ₹{new Intl.NumberFormat('en-IN').format(taxableAnnualRupees)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sage/40">
                  <td className="py-3 font-heading font-bold text-sm text-charcoal">Total Deductions</td>
                  <td className="py-3 text-right font-heading font-bold text-sm text-crimson">
                    {fmtRupees(payslip.lopDeductionPaise + payslip.otherDeductionsPaise + payslip.finalTaxPaise)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* d — bg-forest Net Pay box ───────────────────────────────────────── */}
        <div className="mx-8 mb-6 mt-6 bg-forest rounded-xl px-8 py-6 text-center text-white">
          <p className="text-mint text-sm font-semibold uppercase tracking-widest mb-1">Net Pay</p>
          <p className="font-heading font-bold text-4xl text-white">
            {fmtRupeesWithSymbol(payslip.netPayPaise)}
          </p>
          <p className="text-white/70 text-sm mt-2 italic">
            {paiseToWords(payslip.netPayPaise)}
          </p>
        </div>

        {/* e — Footer band ─────────────────────────────────────────────────── */}
        <div className="px-8 py-5 border-t border-sage/20 bg-offwhite/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate italic">
              This is a system-generated payslip and does not require a signature.
            </p>
            <div className="flex items-center gap-2">
              {isFinalised && (
                <>
                  <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked
                  </span>
                  <p className="text-xs text-slate">
                    Finalised: {formatDate(payslip.finalisedAt)}
                  </p>
                </>
              )}
              {isReversed && (
                <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">
                  Reversed
                </span>
              )}
              {!isFinalised && !isReversed && (
                <InlineStatusBadge status={payslip.status} />
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-sage/10 grid grid-cols-1 sm:grid-cols-3 text-xs text-slate gap-4">
            <div>
              <span className="font-semibold text-charcoal">Run ID:</span>{' '}
              {payslip.runCode}
            </div>
            <div>
              <span className="font-semibold text-charcoal">Pay Period:</span>{' '}
              {formatDate(payslip.periodStart)} – {formatDate(payslip.periodEnd)}
            </div>
            <div>
              <span className="font-semibold text-charcoal">Fiscal Year:</span>{' '}
              {fyLabel}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

// ── PayslipDetailView — the exported shared component ────────────────────────

interface PayslipDetailViewProps {
  /** The payslip ID from the URL param. */
  payslipId: string;
  /** Role-prefixed back-link, e.g. "/admin/payslips" or "/employee/payslips". */
  backHref: string;
}

export function PayslipDetailView({ payslipId, backHref }: PayslipDetailViewProps) {
  const { data: payslip, isLoading, isError } = usePayslip(payslipId);

  const downloadMutation = useDownloadPayslipPdf(payslip?.code ?? payslipId);

  async function handleDownload() {
    if (!payslip) return;
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

  return (
    <div>
      {/* ── Back link + breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-slate mb-4 print:hidden">
        <Link href={backHref} className="hover:text-forest transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          My Payslips
        </Link>
        {payslip && (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-charcoal font-medium">
              {MONTH_NAMES[payslip.month] ?? ''} {payslip.year}
            </span>
          </>
        )}
      </div>

      {/* ── Loading state ───────────────────────────────────────────────────── */}
      {isLoading && <PayslipSkeleton />}

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <div role="alert" className="bg-crimsonbg/60 border border-crimson/30 rounded-xl px-6 py-8 text-center">
          <p className="text-crimson font-semibold text-sm mb-2">
            Failed to load payslip.
          </p>
          <p className="text-slate text-xs mb-4">
            The payslip may not exist or you may not have permission to view it.
          </p>
          <Link href={backHref} className="text-forest underline text-sm hover:text-emerald transition-colors">
            Back to My Payslips
          </Link>
        </div>
      )}

      {/* ── Empty / 404 state ───────────────────────────────────────────────── */}
      {!isLoading && !isError && !payslip && (
        <div className="text-center py-12">
          <p className="text-slate text-sm mb-3">Payslip not found.</p>
          <Link href={backHref} className="text-forest underline text-sm hover:text-emerald transition-colors">
            Back to My Payslips
          </Link>
        </div>
      )}

      {/* ── Payslip document ────────────────────────────────────────────────── */}
      {!isLoading && !isError && payslip && (
        <PayslipDocument
          payslip={payslip}
          onDownload={handleDownload}
          isDownloading={downloadMutation.isPending}
        />
      )}
    </div>
  );
}
