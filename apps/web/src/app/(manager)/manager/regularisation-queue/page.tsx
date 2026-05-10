'use client';

/**
 * M-06 — Regularisation Approvals (Manager)
 * Visual reference: prototype/manager/regularisation-queue.html
 *
 * - Policy note: manager handles ≤7d, admin handles >7d
 * - Table: employee, for date, days old, original record, correction, status, actions
 * - Pending-first sort
 * - Approve/Reject inline via RegularisationApprovalActions
 */

import { useState } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { RegularisationStatusBadge } from '@/components/attendance/RegularisationStatusBadge';
import { RegularisationApprovalActions } from '@/components/attendance/RegularisationApprovalActions';
import { useRegularisations } from '@/lib/hooks/useRegularisations';
import type { RegStatus } from '@nexora/contracts/attendance';

type FilterStatus = 'all' | RegStatus;

export default function ManagerRegularisationQueuePage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const query = statusFilter !== 'all' ? { status: statusFilter } : {};
  const { data, isLoading, isError, error, refetch } = useRegularisations(query);

  const rows = data?.data ?? [];

  // Pending first
  const sorted = [...rows].sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = rows.filter((r) => r.status === 'Pending').length;
  const adminRoutedCount = rows.filter((r) => r.routedTo === 'Admin').length;

  return (
    <div className="p-8">

      {/* Policy note */}
      <div className="bg-softmint border border-mint rounded-xl p-4 flex gap-3 mb-6" role="note">
        <svg className="w-5 h-5 text-forest shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <p className="text-sm font-semibold text-forest mb-0.5">Regularisation Policy (BL-029)</p>
          <p className="text-sm text-forest/80">
            You can approve regularisation requests for your team members up to{' '}
            <strong>7 days old</strong>. Older requests are automatically routed to Admin.
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-sage/20 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading font-semibold text-sm text-charcoal">Regularisation Requests</h2>
          <div className="flex flex-wrap items-center gap-3">
            {pendingCount > 0 && (
              <span className="bg-umberbg text-umber text-xs font-bold px-2.5 py-1 rounded">
                {pendingCount} Pending
              </span>
            )}
            {adminRoutedCount > 0 && (
              <span className="bg-sage/20 text-slate text-xs font-bold px-2.5 py-1 rounded">
                {adminRoutedCount} Admin Routed
              </span>
            )}
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              aria-label="Filter by status"
              className="border border-sage rounded-lg px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading regularisation queue…" />
          </div>
        ) : isError ? (
          <div role="alert" className="text-crimson text-sm py-8 text-center px-5">
            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-offwhite border-b border-sage/30">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate px-5 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">For Date</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Days Old</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Submitted</th>
                  <th className="text-left text-xs font-semibold text-slate px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-slate py-10">
                      No regularisation requests found.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => (
                    <tr key={r.id} className="hover:bg-offwhite/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">
                            {r.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-charcoal">{r.employeeName}</div>
                            <div className="text-xs text-slate">{r.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-charcoal">{r.date}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.ageDaysAtSubmit <= 7 ? 'bg-greenbg text-richgreen' : 'bg-umberbg text-umber'}`}>
                          {r.ageDaysAtSubmit} days
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <RegularisationStatusBadge status={r.status} routedTo={r.routedTo} />
                      </td>
                      <td className="px-4 py-4 text-slate text-xs">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/manager/regularisation-queue/${r.id}`}
                            className="text-xs font-semibold text-forest hover:text-emerald transition-colors"
                          >
                            View
                          </Link>
                          {r.status === 'Pending' && r.routedTo === 'Manager' && (
                            <RegularisationApprovalActions
                              regularisationId={r.id}
                              version={0}
                              onDecision={() => refetch()}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
