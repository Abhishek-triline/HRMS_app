'use client';

/**
 * Payslip detail under a Payroll Run context (Payroll Officer variant).
 * Sibling of the admin nested route — see that file for rationale.
 */

import { useParams } from 'next/navigation';
import { PayslipDetailView } from '@/features/payslips/components/PayslipDetailView';

export default function POPayrollRunPayslipDetailPage() {
  const params = useParams();
  const runId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const slipId = Array.isArray(params.slipId) ? params.slipId[0] : (params.slipId ?? '');
  return (
    <PayslipDetailView
      payslipId={slipId}
      backHref={`/payroll/payroll-runs/${runId}`}
      backLabel="Payroll Run"
    />
  );
}
