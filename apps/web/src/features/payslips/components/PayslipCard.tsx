'use client';

/**
 * PayslipCard — individual card in the 3-column payslip grid.
 * Visual reference: prototype/admin/my-payslips.html (payslip card blocks)
 *
 * Latest payslip:   border-2 border-emerald + Finalised badge includes lock icon
 * Other payslips:   border border-sage/30
 * Status colours:
 *   Finalised  → bg-greenbg text-richgreen
 *   Draft      → bg-umberbg text-umber
 *   Review     → bg-umberbg text-umber
 *   Reversed   → bg-crimsonbg text-crimson
 */

import Link from 'next/link';
import type { PayslipSummary } from '@nexora/contracts/payroll';
import { PAYROLL_STATUS, PAYROLL_STATUS_MAP } from '@/lib/status/maps';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.floor(paise / 100));
}

function StatusBadge({
  status,
  isLatest,
}: {
  status: PayslipSummary['status'];
  isLatest: boolean;
}) {
  if (status === PAYROLL_STATUS.Finalised) {
    return (
      <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1">
        Finalised
        {isLatest && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </span>
    );
  }
  if (status === PAYROLL_STATUS.Reversed) {
    return (
      <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">
        Reversed
      </span>
    );
  }
  // Draft | Review
  return (
    <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">
      {PAYROLL_STATUS_MAP[status]?.label ?? String(status)}
    </span>
  );
}

interface PayslipCardProps {
  payslip: PayslipSummary;
  /** True for the most recent payslip — gets emerald border + lock icon. */
  isLatest: boolean;
  /** e.g. "/admin/payslips" — card links to {basePath}/{payslip.id} */
  basePath: string;
}

export function PayslipCard({ payslip, isLatest, basePath }: PayslipCardProps) {
  const monthName = MONTH_NAMES[(payslip.month ?? 1) - 1];
  const borderClass = isLatest
    ? 'border-2 border-emerald'
    : 'border border-sage/30';

  return (
    <Link
      href={`${basePath}/${payslip.id}`}
      className={`bg-white rounded-xl shadow-sm ${borderClass} p-5 hover:shadow-md transition-shadow block`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-heading text-lg font-bold text-charcoal">
          {monthName} {payslip.year}
        </div>
        <StatusBadge status={payslip.status} isLatest={isLatest} />
      </div>

      {/* Amounts */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate">Gross:</span>
          <span className="text-charcoal">{formatPaise(payslip.grossPaise)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Tax:</span>
          <span className="text-charcoal">{formatPaise(payslip.finalTaxPaise)}</span>
        </div>
        <div className="flex justify-between font-semibold pt-1.5 border-t border-sage/20 mt-1.5">
          <span className="text-charcoal">Net:</span>
          <span className="text-richgreen">{formatPaise(payslip.netPayPaise)}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-3 text-xs text-emerald font-semibold">View payslip →</div>
    </Link>
  );
}
