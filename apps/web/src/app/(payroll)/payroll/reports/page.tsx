'use client';

/**
 * P-08 — Payroll Reports (PayrollOfficer) — DISABLED until v1.1.
 *
 * The SRS lists this page (P-08) but the download/export pipeline is not
 * yet implemented; every action falls through to a "Coming soon" toast.
 * The sidebar nav entry is commented out (see roleNavConfig.ts:payrollNav).
 * This route remains in place so existing bookmarks resolve to a polite
 * placeholder instead of a 404.
 *
 * To re-enable in v1.1:
 *   1. Restore the <PayrollReportsView /> render below.
 *   2. Uncomment the Reports entry in payrollNav (roleNavConfig.ts).
 */

// import { PayrollReportsView } from '@/features/payroll/components/PayrollReportsView';

export default function PayrollReportsPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-10 text-center">
      <h1 className="font-heading text-lg font-bold text-charcoal mb-2">Reports</h1>
      <p className="text-sm text-slate">
        Payroll reports (Salary Register, Tax Summary, LOP, Bank Transfer) are coming in v1.1.
      </p>
    </div>
  );
  // return <PayrollReportsView />;
}
