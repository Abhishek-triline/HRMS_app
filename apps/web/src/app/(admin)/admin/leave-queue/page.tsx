'use client';

/**
 * A-06 — Leave Queue (Admin)
 * Visual reference: prototype/admin/leave-queue.html
 *
 * Card-list layout matching the prototype: severity stripe, avatar,
 * inline approve/reject actions. No table.
 *
 * Tabs: All Pending | Escalated | Maternity / Paternity | Approved | Rejected
 * Filters: search (name/code), leave type
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  LeaveQueueCard,
  LeaveQueueCardSkeleton,
} from '@/features/leave-queue/components/LeaveQueueCard';
import { useLeaveList } from '@/lib/hooks/useLeave';

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabKey = 'all-pending' | 'escalated' | 'event-based' | 'approved' | 'rejected';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all-pending', label: 'All Pending' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'event-based', label: 'Maternity / Paternity' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

// ── Build query params from active tab + filters ──────────────────────────────

function buildQuery(
  activeTab: TabKey,
  typeFilter: string,
  searchQuery: string,
): Record<string, string> {
  const base: Record<string, string> = { routedTo: 'Admin' };

  if (activeTab === 'escalated') base.status = 'Escalated';
  else if (activeTab === 'all-pending') base.status = 'Pending';
  else if (activeTab === 'approved') base.status = 'Approved';
  else if (activeTab === 'rejected') base.status = 'Rejected';
  // event-based: no status filter — filter client-side

  if (typeFilter) base.type = typeFilter;
  if (searchQuery) base.search = searchQuery;

  return base;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLeaveQueuePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all-pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const query = useLeaveList(buildQuery(activeTab, typeFilter, searchQuery));

  const displayedRequests = (() => {
    if (!query.data?.data) return [];
    if (activeTab === 'event-based') {
      return query.data.data.filter(
        (r) => r.type === 'Maternity' || r.type === 'Paternity',
      );
    }
    return query.data.data;
  })();

  const showActions =
    activeTab === 'all-pending' ||
    activeTab === 'escalated' ||
    activeTab === 'event-based';

  const hasFilters = Boolean(typeFilter || searchQuery);

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-charcoal">Leave Approval Queue</h1>
        <p className="text-sm text-slate mt-0.5">
          Escalated requests, maternity / paternity approvals, and all admin-routed leave
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-0 border-b border-sage/30 overflow-x-auto mb-5"
        role="tablist"
        aria-label="Leave queue categories"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-forest text-forest'
                : 'border-transparent text-slate hover:text-charcoal',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <svg
              className="w-4 h-4 text-sage absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or EMP code..."
              aria-label="Search by employee name or code"
              className="w-full border border-sage/50 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-colors"
            />
          </div>

          {/* Leave type filter */}
          <select
            aria-label="Filter by leave type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-colors"
          >
            <option value="">All Leave Types</option>
            <option value="Annual">Annual</option>
            <option value="Sick">Sick</option>
            <option value="Casual">Casual</option>
            <option value="Maternity">Maternity</option>
            <option value="Paternity">Paternity</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setTypeFilter(''); setSearchQuery(''); }}
              className="text-xs text-slate hover:text-crimson transition-colors underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Card list */}
      <div role="tabpanel" aria-live="polite">
        {query.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <LeaveQueueCardSkeleton key={i} />
            ))}
          </div>
        ) : query.error ? (
          <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-crimson" role="alert">
              Could not load leave requests.
            </span>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="text-xs font-semibold text-forest hover:underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="w-10 h-10 mx-auto text-sage/50 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-slate text-sm font-medium">No requests in this view</p>
            {hasFilters && (
              <p className="text-slate text-xs mt-1">
                Try clearing the filters to see more results.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedRequests.map((req) => (
              <LeaveQueueCard
                key={req.id}
                request={req}
                detailHrefBase="/admin/leave-queue"
                showActions={showActions}
                onDecision={() => query.refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
