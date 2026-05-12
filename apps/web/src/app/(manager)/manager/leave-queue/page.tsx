'use client';

/**
 * M-03 — Leave Queue (Manager)
 * Visual reference: prototype/manager/leave-queue.html
 *
 * Card-list layout matching the prototype: severity stripe, avatar, reason quote,
 * inline approve/reject actions. No table.
 *
 * Tabs: Pending | Escalated | All Requests
 * Filters: status select, leave type select
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  LeaveQueueCard,
  LeaveQueueCardSkeleton,
} from '@/features/leave-queue/components/LeaveQueueCard';
import { useLeaveList } from '@/lib/hooks/useLeave';
import { LEAVE_STATUS, LEAVE_TYPE_ID } from '@/lib/status/maps';

type FilterTab = 'pending' | 'escalated' | 'all';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'all', label: 'All Requests' },
];

export default function ManagerLeaveQueuePage() {
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [typeFilter, setTypeFilter] = useState<number | ''>('');

  const query = useLeaveList({
    ...(filterTab === 'pending' ? { status: LEAVE_STATUS.Pending } : filterTab === 'escalated' ? { status: LEAVE_STATUS.Escalated } : {}),
    ...(typeFilter ? { leaveTypeId: typeFilter } : {}),
  });

  const requests = query.data?.data ?? [];

  const isActionable = filterTab === 'pending' || filterTab === 'escalated';

  function clearFilters() {
    setTypeFilter('');
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-charcoal">Leave Approval Queue</h1>
        <p className="text-sm text-slate mt-0.5">
          Review and action leave requests from your team
        </p>
      </div>

      {/* Escalation notice */}
      <div className="bg-umberbg border border-umber/30 rounded-xl px-4 py-3 flex gap-3 mb-5">
        <svg
          className="w-5 h-5 text-umber shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm text-umber font-medium">
          Requests not actioned within{' '}
          <span className="font-bold">5 days</span> are automatically escalated to Admin.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-0 border-b border-sage/30 mb-5"
        role="tablist"
        aria-label="Leave queue filters"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={filterTab === tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              filterTab === tab.key
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
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate" htmlFor="mgr-type-filter">
              Leave Type
            </label>
            <select
              id="mgr-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value ? Number(e.target.value) : '')}
              className="border border-sage/50 rounded-lg px-3 py-1.5 text-sm bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-colors"
            >
              <option value="">All Types</option>
              <option value={LEAVE_TYPE_ID.Annual}>Annual</option>
              <option value={LEAVE_TYPE_ID.Sick}>Sick</option>
              <option value={LEAVE_TYPE_ID.Casual}>Casual</option>
              <option value={LEAVE_TYPE_ID.Paternity}>Paternity</option>
              <option value={LEAVE_TYPE_ID.Maternity}>Maternity</option>
              <option value={LEAVE_TYPE_ID.Unpaid}>Unpaid</option>
            </select>
          </div>

          {typeFilter && (
            <button
              type="button"
              onClick={clearFilters}
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
              Could not load leave requests. Please refresh.
            </span>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="text-xs font-semibold text-forest hover:underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-slate text-sm font-medium">
              No {filterTab !== 'all' ? filterTab : ''} leave requests in your queue.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <LeaveQueueCard
                key={req.id}
                request={req}
                detailHrefBase="/manager/leave-queue"
                showActions={isActionable}
                onDecision={() => query.refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
