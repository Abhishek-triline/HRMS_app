'use client';

/**
 * A-24 — Reversal History (Admin).
 * Visual reference: prototype/admin/reversal-history.html
 *
 * Admin can view all reversals. Admin can also initiate reversals from
 * the run detail page — there is no "initiate" action on this list page.
 */

import Link from 'next/link';
import { useReversals } from '@/lib/hooks/usePayroll';
import { ReversalHistoryTable } from '@/components/payroll/ReversalHistoryTable';

export default function ReversalHistoryPage() {
  const { data, isLoading, isError } = useReversals();
  const items = data?.data ?? [];

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-charcoal">Reversal History</h1>
          <p className="text-xs text-slate mt-0.5">All Admin-initiated payroll run reversals</p>
        </div>
        <Link
          href="/admin/payroll-runs"
          className="text-xs text-emerald font-semibold hover:underline"
        >
          ← Payroll Runs
        </Link>
      </div>

      {isError ? (
        <div className="text-center py-12 text-crimson text-sm">
          Failed to load reversal history. Please refresh.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-sage/20">
            <h2 className="text-sm font-semibold text-charcoal">
              {items.length} reversal{items.length !== 1 ? 's' : ''} on record
            </h2>
          </div>
          <ReversalHistoryTable items={items} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
