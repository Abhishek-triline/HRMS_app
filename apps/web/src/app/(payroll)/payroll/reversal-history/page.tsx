'use client';

/**
 * P-07 — Reversal History (PayrollOfficer).
 *
 * Read-only view — PO cannot initiate reversals (BL-033, Admin only).
 * A notice banner explains this restriction.
 */

import Link from 'next/link';
import { useReversals } from '@/lib/hooks/usePayroll';
import { ReversalHistoryTable } from '@/components/payroll/ReversalHistoryTable';

export default function POReversalHistoryPage() {
  const { data, isLoading, isError } = useReversals();
  const items = data?.data ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-charcoal">Reversal History</h1>
          <p className="text-xs text-slate mt-0.5">View-only — reversals are initiated by Admin</p>
        </div>
        <Link href="/payroll/payroll-runs" className="text-xs text-emerald font-semibold hover:underline">
          ← Payroll Runs
        </Link>
      </div>

      {isError ? (
        <div className="text-center py-12 text-crimson text-sm">Failed to load reversal history.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-sage/20">
            <h2 className="text-sm font-semibold text-charcoal">
              {items.length} reversal{items.length !== 1 ? 's' : ''} on record
            </h2>
          </div>
          <ReversalHistoryTable items={items} isLoading={isLoading} readOnly />
        </div>
      )}
    </>
  );
}
