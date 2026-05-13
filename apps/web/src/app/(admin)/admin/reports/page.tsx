'use client';

/**
 * Admin Payroll Reports — same catalogue as PayrollOfficer (BL-031 / BL-033
 * audit overlap). Delegates to the shared PayrollReportsView.
 */

import { PayrollReportsView } from '@/features/payroll/components/PayrollReportsView';

export default function AdminReportsPage() {
  return <PayrollReportsView />;
}
