'use client';

/**
 * M-03 — Leave Queue (Manager)
 * Visual reference: prototype/manager/leave-queue.html
 *
 * Pending-first sort. Approve / Reject inline with modal for reject.
 * API scopes list to manager's queue automatically.
 */

import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { LeaveApprovalActions } from '@/components/leave/LeaveApprovalActions';
import { useLeaveList, useLeave } from '@/lib/hooks/useLeave';
import type { LeaveRequestSummary, LeaveStatus } from '@nexora/contracts/leave';

type FilterStatus = 'Pending' | 'Escalated' | 'All';

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// Inner component to fetch full request for approve/reject actions
function QueueRowActions({ summary, onDecision }: { summary: LeaveRequestSummary; onDecision: () => void }) {
  const { data: request, isLoading } = useLeave(summary.id);
  if (isLoading) return <Spinner size="sm" />;
  if (!request) return null;
  return <LeaveApprovalActions request={request} onDecision={onDecision} />;
}

export default function ManagerLeaveQueuePage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Pending');
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useLeaveList(
    filterStatus === 'All'
      ? {}
      : { status: filterStatus as LeaveStatus },
  );

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'Pending', label: 'Pending' },
    { key: 'Escalated', label: 'Escalated' },
    { key: 'All', label: 'All Requests' },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-charcoal">Leave Queue</h1>
          <p className="text-sm text-slate mt-0.5">Review and action leave requests from your team</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        {/* Tabs */}
        <div className="px-6 pt-5 pb-0 border-b border-sage/30">
          <div className="flex gap-0" role="tablist" aria-label="Leave queue filters">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={filterStatus === tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                  filterStatus === tab.key
                    ? 'border-forest text-forest'
                    : 'border-transparent text-slate hover:text-charcoal',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {query.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" aria-label="Loading leave queue" />
          </div>
        ) : query.error ? (
          <div className="px-6 py-8 text-sm text-crimson" role="alert">
            Could not load leave requests. Please refresh.
          </div>
        ) : !query.data || query.data.data.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-slate text-sm">No {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} leave requests in your queue.</div>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" aria-label="Leave queue">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/20">
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Employee</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Type</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Duration</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Days</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {query.data.data.map((req) => (
                    <tr key={req.id} className="hover:bg-offwhite transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-charcoal">{req.employeeName}</div>
                        <div className="text-xs text-slate">{req.employeeCode}</div>
                      </td>
                      <td className="px-4 py-4 text-charcoal">{req.type}</td>
                      <td className="px-4 py-4 text-slate">
                        {req.fromDate === req.toDate
                          ? formatDate(req.fromDate)
                          : `${formatDate(req.fromDate)} – ${formatDate(req.toDate)}`}
                      </td>
                      <td className="px-4 py-4 text-slate">{req.days}</td>
                      <td className="px-4 py-4">
                        <LeaveStatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/manager/leave-queue/${req.id}`}
                            className="text-xs font-semibold text-forest hover:underline"
                          >
                            View
                          </Link>
                          {(req.status === 'Pending' || req.status === 'Escalated') && (
                            <QueueRowActions
                              summary={req}
                              onDecision={() => {
                                setRefreshKey((k) => k + 1);
                                query.refetch();
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden px-4 py-4 space-y-3">
              {query.data.data.map((req) => (
                <div key={req.id} className="bg-white rounded-xl border border-sage/30 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-charcoal text-sm">{req.employeeName}</div>
                      <div className="text-xs text-slate">{req.type} · {req.days} day{req.days !== 1 ? 's' : ''}</div>
                    </div>
                    <LeaveStatusBadge status={req.status} />
                  </div>
                  <div className="text-xs text-slate">
                    {formatDate(req.fromDate)}{req.fromDate !== req.toDate ? ` – ${formatDate(req.toDate)}` : ''}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/manager/leave-queue/${req.id}`} className="text-xs font-semibold text-forest hover:underline">
                      View details
                    </Link>
                    {(req.status === 'Pending' || req.status === 'Escalated') && (
                      <QueueRowActions summary={req} onDecision={() => query.refetch()} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
