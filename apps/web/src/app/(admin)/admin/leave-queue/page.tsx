'use client';

/**
 * A-06 — Leave Queue (Admin)
 * Visual reference: prototype/admin/leave-queue.html
 *
 * Card-list layout matching the prototype: severity border-l-4 stripe, avatar,
 * inline approve/reject actions. No table.
 *
 * Tabs: All Pending (with count) | Escalated (crimsonbg count) | Maternity (umberbg) |
 *       Approved Today (greenbg) | Rejected Today (crimsonbg)
 * Filters: search (name/code), leave type, department, date
 * Paginator at bottom with Prev/1/2/Next
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  LeaveQueueCard,
  LeaveQueueCardSkeleton,
} from '@/features/leave-queue/components/LeaveQueueCard';
import { useLeaveList } from '@/lib/hooks/useLeave';

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabKey = 'all-pending' | 'escalated' | 'maternity' | 'approved' | 'rejected';

interface TabDef {
  key: TabKey;
  label: string;
  countBadgeClass: string;
}

const TABS: TabDef[] = [
  { key: 'all-pending', label: 'All Pending', countBadgeClass: 'bg-forest text-white' },
  { key: 'escalated', label: 'Escalated', countBadgeClass: 'bg-crimsonbg text-crimson' },
  { key: 'maternity', label: 'Maternity', countBadgeClass: 'bg-umberbg text-umber' },
  { key: 'approved', label: 'Approved (Today)', countBadgeClass: 'bg-greenbg text-richgreen' },
  { key: 'rejected', label: 'Rejected (Today)', countBadgeClass: 'bg-crimsonbg text-crimson' },
];

// ── Build query params from active tab + filters ──────────────────────────────

function buildQuery(
  activeTab: TabKey,
  typeFilter: string,
  deptFilter: string,
  searchQuery: string,
): Record<string, string> {
  const base: Record<string, string> = { routedTo: 'Admin' };

  if (activeTab === 'escalated') {
    base.status = 'Escalated';
  } else if (activeTab === 'all-pending') {
    base.status = 'Pending';
  } else if (activeTab === 'maternity') {
    // maternity/paternity route direct to admin — fetch pending + event-based types
    base.status = 'Pending';
  } else if (activeTab === 'approved') {
    base.status = 'Approved';
  } else if (activeTab === 'rejected') {
    base.status = 'Rejected';
  }

  if (typeFilter) base.type = typeFilter;
  if (deptFilter) base.department = deptFilter;
  if (searchQuery) base.search = searchQuery;

  return base;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLeaveQueuePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all-pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const query = useLeaveList(buildQuery(activeTab, typeFilter, deptFilter, searchQuery));

  const displayedRequests = (() => {
    if (!query.data?.data) return [];
    if (activeTab === 'maternity') {
      return query.data.data.filter(
        (r) => r.type === 'Maternity' || r.type === 'Paternity',
      );
    }
    return query.data.data;
  })();

  const showActions =
    activeTab === 'all-pending' ||
    activeTab === 'escalated' ||
    activeTab === 'maternity';

  const total = displayedRequests.length;

  return (
    <div className="px-6 py-6">

      {/* Tabs */}
      <div
        id="lq-tabs"
        className="flex items-center gap-1 mb-5 border-b border-sage/30 overflow-x-auto"
        role="tablist"
        aria-label="Leave queue categories"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'text-forest border-forest'
                  : 'text-slate border-transparent hover:text-charcoal',
              )}
            >
              {tab.label}
              {query.data && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${tab.countBadgeClass}`}>
                  {activeTab === tab.key ? displayedRequests.length : ''}
                </span>
              )}
            </button>
          );
        })}
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or EMP code..."
              aria-label="Search by employee name or code"
              className="w-full border border-sage/50 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
          </div>

          {/* Leave type filter */}
          <select
            aria-label="Filter by leave type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Leave Types</option>
            <option value="Annual">Annual</option>
            <option value="Sick">Sick</option>
            <option value="Casual">Casual</option>
            <option value="Maternity">Maternity</option>
            <option value="Paternity">Paternity</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          {/* Department filter */}
          <select
            aria-label="Filter by department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
            <option value="HR">HR</option>
          </select>
        </div>
      </div>

      {/* Card list */}
      <div id="lq-cards" className="space-y-3" role="tabpanel" aria-live="polite">
        {query.isLoading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <LeaveQueueCardSkeleton key={i} />
            ))}
          </>
        ) : query.error ? (
          <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-crimson" role="alert">
              Could not load leave requests.
            </span>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="text-xs font-semibold text-forest hover:underline"
            >
              Retry
            </button>
          </div>
        ) : displayedRequests.length === 0 ? (
          <div id="lq-empty" className="bg-white rounded-xl border border-dashed border-sage/40 px-6 py-10 text-center">
            <p className="text-sm text-slate">No requests in this view.</p>
          </div>
        ) : (
          displayedRequests.map((req) => (
            <LeaveQueueCard
              key={req.id}
              request={req}
              detailHrefBase="/admin/leave-queue"
              showActions={showActions}
              onDecision={() => query.refetch()}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div id="lq-pagination" className="mt-6 flex justify-between items-center text-xs text-slate">
          <span id="lq-count">Showing {total} of {total} requests</span>
          <div className="flex gap-1.5">
            <button className="border border-sage/50 px-3 py-1.5 rounded text-slate hover:bg-white">Prev</button>
            <button className="bg-forest text-white px-3 py-1.5 rounded">1</button>
            <button className="border border-sage/50 px-3 py-1.5 rounded text-slate hover:bg-white">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
