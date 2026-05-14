'use client';

/**
 * Payslip detail under a Payroll Run context.
 *
 * Keeping this nested under /admin/payroll-runs/[id]/... means the sidebar
 * "Payroll Runs" item stays highlighted while admin drills into a specific
 * employee's payslip from a run. The flat /admin/payslips/[id] route is
 * reserved for the "My Payslips" self-service drill-down.
 */

import { useParams } from 'next/navigation';
import { PayslipDetailView } from '@/features/payslips/components/PayslipDetailView';

export default function AdminRunPayslipDetailPage() {
  const params = useParams();
  const runId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const slipId = Array.isArray(params.slipId) ? params.slipId[0] : (params.slipId ?? '');
  return (
    <PayslipDetailView
      payslipId={slipId}
      backHref={`/admin/payroll-runs/${runId}`}
      backLabel="Payroll Run"
    />
  );
}
