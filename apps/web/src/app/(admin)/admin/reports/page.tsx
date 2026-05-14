'use client';

/**
 * Admin Payroll Reports — DISABLED until v1.1.
 *
 * The download/export pipeline (Salary Register, Tax, LOP, Bank Transfer)
 * is not yet implemented; every action currently falls through to a
 * "Coming soon" toast. The sidebar nav entry is commented out (see
 * roleNavConfig.ts:adminNav). This route remains in place so existing
 * bookmarks resolve to a polite placeholder instead of a 404.
 *
 * To re-enable in v1.1:
 *   1. Restore the <PayrollReportsView /> render below.
 *   2. Uncomment the Reports entry in adminNav (roleNavConfig.ts).
 */

// import { PayrollReportsView } from '@/features/payroll/components/PayrollReportsView';

export default function AdminReportsPage() {
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
