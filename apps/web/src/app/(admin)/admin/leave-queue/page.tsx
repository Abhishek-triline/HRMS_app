'use client';

/**
 * A-06 — Leave Queue (Admin)
 * Visual reference: prototype/admin/leave-queue.html
 *
 * Tabs: Escalated / Maternity-Paternity / All Pending Admin Queue
 * Filters: status, type, employee
 * Approve/Reject inline with modal for reject.
 */

import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { LeaveApprovalActions } from '@/components/leave/LeaveApprovalActions';
import { useLeaveList, useLeave } from '@/lib/hooks/useLeave';
import type { LeaveType, LeaveStatus } from '@nexora/contracts/leave';

type TabKey = 'escalated' | 'event-based' | 'all-admin';

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

function QueueRowActions({ id, onDecision }: { id: string; onDecision: () => void }) {
  const { data: request, isLoading } = useLeave(id);
  if (isLoading) return <Spinner size="sm" />;
  if (!request) return null;
  return (
    <LeaveApprovalActions
      request={request}
      actorLabel="Admin"
      onDecision={onDecision}
    />
  );
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'escalated', label: 'Escalated' },
  { key: 'event-based', label: 'Maternity / Paternity' },
  { key: 'all-admin', label: 'All Admin Queue' },
];

export default function AdminLeaveQueuePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('escalated');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  function buildQuery() {
    const base: Record<string, string> = { routedTo: 'Admin' };
    if (activeTab === 'escalated') base.status = 'Escalated';
    if (activeTab === 'all-admin') base.status = statusFilter || 'Pending';
    if (activeTab === 'event-based') {
      // fetch both Maternity and Paternity — we filter client-side after
      base.routedTo = 'Admin';
    }
    if (typeFilter) base.type = typeFilter;
    return base;
  }

  const query = useLeaveList(buildQuery());

  const displayedRequests = (() => {
    if (!query.data?.data) return [];
    if (activeTab === 'event-based') {
      return query.data.data.filter(
        (r) => r.type === 'Maternity' || r.type === 'Paternity',
      );
    }
    return query.data.data;
  })();

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-charcoal">Leave Approvals</h1>
          <p className="text-sm text-slate mt-0.5">Admin leave queue — escalations, event-based, and all pending</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        {/* Tabs */}
        <div className="px-6 pt-5 pb-0 border-b border-sage/30">
          <div className="flex gap-0 flex-wrap" role="tablist" aria-label="Admin leave queue tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                  activeTab === tab.key
                    ? 'border-forest text-forest'
                    : 'border-transparent text-slate hover:text-charcoal',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-sage/20 flex items-center gap-4 flex-wrap">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Escalated">Escalated</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            aria-label="Filter by leave type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors"
          >
            <option value="">All Types</option>
            <option value="Annual">Annual</option>
            <option value="Sick">Sick</option>
            <option value="Casual">Casual</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Maternity">Maternity</option>
            <option value="Paternity">Paternity</option>
          </select>
          {(statusFilter || typeFilter) && (
            <button
              type="button"
              onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
              className="text-xs text-slate hover:text-crimson transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {query.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" aria-label="Loading leave queue" />
          </div>
        ) : query.error ? (
          <div className="px-6 py-8 text-sm text-crimson" role="alert">
            Could not load leave requests.
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate text-sm">
            No requests found for this view.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" aria-label="Admin leave queue">
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
                  {displayedRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-offwhite transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-charcoal">{req.employeeName}</div>
                        <div className="text-xs text-slate">{req.employeeCode}</div>
                      </td>
                      <td className="px-4 py-4 text-charcoal">
                        <div className="flex items-center gap-2">
                          {req.type}
                          {(req.type === 'Maternity' || req.type === 'Paternity') && (
                            <span className="text-xs bg-softmint text-forest font-bold px-1.5 py-0.5 rounded">Event-based</span>
                          )}
                        </div>
                      </td>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/leave-queue/${req.id}`}
                            className="text-xs font-semibold text-forest hover:underline"
                          >
                            View
                          </Link>
                          {(req.status === 'Pending' || req.status === 'Escalated') && (
                            <QueueRowActions
                              id={req.id}
                              onDecision={() => query.refetch()}
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
              {displayedRequests.map((req) => (
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
                    <Link href={`/admin/leave-queue/${req.id}`} className="text-xs font-semibold text-forest hover:underline">
                      View details
                    </Link>
                    {(req.status === 'Pending' || req.status === 'Escalated') && (
                      <QueueRowActions id={req.id} onDecision={() => query.refetch()} />
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
