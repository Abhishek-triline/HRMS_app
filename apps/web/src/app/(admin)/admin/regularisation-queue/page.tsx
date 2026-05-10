'use client';

/**
 * A-10 — Admin Regularisation Queue
 * Visual reference: prototype/admin/regularisation-queue.html
 *
 * Defaults to ?routedTo=Admin&status=Pending (the >7d queue).
 * Filters: status, employee.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { RegularisationStatusBadge } from '@/components/attendance/RegularisationStatusBadge';
import { RegularisationApprovalActions } from '@/components/attendance/RegularisationApprovalActions';
import { useRegularisations } from '@/lib/hooks/useRegularisations';
import type { RegStatus } from '@nexora/contracts/attendance';

type FilterStatus = 'all' | RegStatus;

export default function AdminRegularisationQueuePage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('Pending');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const query = {
    routedTo: 'Admin' as const,
    ...(statusFilter !== 'all' ? { status: statusFilter as RegStatus } : {}),
    ...(employeeFilter ? { employeeId: employeeFilter } : {}),
  };
  const { data, isLoading, isError, error, refetch } = useRegularisations(query);

  const rows = data?.data ?? [];

  const sorted = [...rows].sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = rows.filter((r) => r.status === 'Pending').length;

  return (
    <div className="p-8">

      {/* Info banner */}
      <div className="bg-softmint border border-mint rounded-xl p-4 flex gap-3 mb-6" role="note">
        <svg className="w-5 h-5 text-forest shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <p className="text-sm font-semibold text-forest mb-0.5">Admin Queue — Requests older than 7 days (BL-029)</p>
          <p className="text-sm text-forest/80">
            Regularisation requests submitted more than 7 days after the date are automatically routed here. You can approve or reject these directly.
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-sage/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-semibold text-sm text-charcoal">Regularisation Queue</h2>
            {pendingCount > 0 && (
              <span className="bg-umberbg text-umber text-xs font-bold px-2.5 py-1 rounded">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              aria-label="Filter by status"
              className="border border-sage rounded-lg px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="Pending">Pending</option>
              <option value="all">All statuses</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <input
              type="text"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              placeholder="Employee ID…"
              aria-label="Filter by employee"
              className="border border-sage rounded-lg px-3 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading admin regularisation queue…" />
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
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3">Employee</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Code</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">For Date</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Days Old</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Status</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Submitted</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-slate py-10">
                      No regularisation requests in the admin queue.
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
                      <td className="px-4 py-4 font-mono text-xs text-charcoal">{r.code}</td>
                      <td className="px-4 py-4 font-medium text-charcoal">{r.date}</td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-umberbg text-umber">
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
                            href={`/admin/regularisation-queue/${r.id}`}
                            className="text-xs font-semibold text-forest hover:text-emerald transition-colors"
                          >
                            View
                          </Link>
                          {r.status === 'Pending' && (
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
