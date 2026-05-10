'use client';

/**
 * E-09 — Payslip Detail (Employee).
 * Visual reference: prototype/employee/payslip.html
 *
 * Read-only payslip viewer with print / download PDF actions.
 */

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePayslip } from '@/lib/hooks/usePayslips';
import { PayslipViewer } from '@/components/payroll/PayslipViewer';
import { Spinner } from '@/components/ui/Spinner';

export default function EmployeePayslipDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? '';

  const { data: payslip, isLoading, isError } = usePayslip(id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner /><span className="ml-2 text-sm text-slate">Loading payslip…</span>
      </div>
    );
  }

  if (isError || !payslip) {
    return (
      <div className="p-6 text-center text-crimson text-sm">
        Failed to load payslip.{' '}
        <Link href="/employee/payslips" className="underline text-forest">Back to My Payslips</Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-slate mb-4 print:hidden">
        <Link href="/employee/payslips" className="hover:text-forest transition-colors">My Payslips</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{payslip.code}</span>
      </div>
      <PayslipViewer payslip={payslip} backHref="/employee/payslips" backLabel="My Payslips" />
    </div>
  );
}
