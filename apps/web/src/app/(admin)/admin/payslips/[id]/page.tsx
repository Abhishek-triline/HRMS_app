'use client';

/**
 * A-16 — Payslip Detail Viewer (Admin).
 * Visual reference: prototype/admin/payslip.html
 *
 * Uses PayslipViewer shared component.
 * Print stylesheet: sidebar/topbar hidden via print:hidden on layout elements.
 */

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePayslip } from '@/lib/hooks/usePayslips';
import { PayslipViewer } from '@/components/payroll/PayslipViewer';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminPayslipDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? '';

  const { data: payslip, isLoading, isError } = usePayslip(id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
        <span className="ml-2 text-sm text-slate">Loading payslip…</span>
      </div>
    );
  }

  if (isError || !payslip) {
    return (
      <div className="p-6 text-center text-crimson text-sm">
        Failed to load payslip.{' '}
        <Link href="/admin/payroll-runs" className="underline text-forest">
          Back to Payroll Runs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate mb-4 print:hidden">
        <Link href="/admin/payroll-runs" className="hover:text-forest transition-colors">Payroll</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/admin/payroll-runs/${payslip.runId}`} className="hover:text-forest transition-colors">
          {payslip.runCode}
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{payslip.employeeName}</span>
      </div>

      <PayslipViewer
        payslip={payslip}
        backHref={`/admin/payroll-runs/${payslip.runId}`}
        backLabel={payslip.runCode}
      />
    </div>
  );
}
