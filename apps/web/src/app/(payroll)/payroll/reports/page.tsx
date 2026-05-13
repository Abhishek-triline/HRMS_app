'use client';

/**
 * P-REP — Payroll Reports (PayrollOfficer).
 * Delegates to the shared PayrollReportsView so Admin sees the same page.
 */

import { PayrollReportsView } from '@/features/payroll/components/PayrollReportsView';

export default function PayrollReportsPage() {
  return <PayrollReportsView />;
}
