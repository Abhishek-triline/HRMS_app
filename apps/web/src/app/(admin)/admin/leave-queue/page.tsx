'use client';

/**
 * A-06 — Leave Queue (Admin)
 * Visual reference: prototype/admin/leave-queue.html
 *
 * Tabs are URL-driven via ?tab=<key>. Tabs:
 *   all-pending | escalated | maternity | approved | rejected
 *
 * Pagination strategy:
 *   - All tabs except Maternity use server-side cursor pagination (limit 20).
 *   - Maternity is a rare-event tab — fetched in a single bulk request
 *     (limit 100) and client-filtered to Maternity || Paternity types, since
 *     the API doesn't accept a multi-value leaveTypeId filter.
 *
 * Filters:
 *   - Leave type (server-side, ignored on Maternity tab — already constrained).
 *   - Date (client-side, narrows the visible page to rows covering that date).
 *   - Search (client-side post-filter on the current page — the server
 *     doesn't support a search filter yet; v1.1 backlog).
 *
 * Note: the prototype shows a department dropdown but LeaveRequestSummary
 * doesn't carry department, so the control was a no-op. Dropped until the
 * contract exposes it.
 *
 * Tab count badges are best-effort: they show the count up to the API max
 * (100), suffixed with "+" if more exist. A bare limit=1 query (the old
 * implementation) would always read back "1" — that was misleading.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LeaveQueueCard,
  LeaveQueueCardSkeleton,
} from '@/features/leave-queue/components/LeaveQueueCard';
import { useLeaveList } from '@/lib/hooks/useLeave';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { CursorPaginator } from '@/components/ui/CursorPaginator';
import { LEAVE_STATUS, LEAVE_TYPE_ID, ROUTED_TO } from '@/lib/status/maps';
import type { LeaveListQuery } from '@nexora/contracts/leave';

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabKey = 'all-pending' | 'escalated' | 'maternity' | 'approved' | 'rejected';

const TAB_KEYS: readonly TabKey[] = ['all-pending', 'escalated', 'maternity', 'approved', 'rejected'] as const;

interface TabDef {
  key: TabKey;
  label: string;
  countBadgeClass: string;
}

const TABS: TabDef[] = [
  { key: 'all-pending', label: 'All Pending', countBadgeClass: 'bg-forest text-white' },
  { key: 'escalated',   label: 'Escalated',   countBadgeClass: 'bg-crimsonbg text-crimson' },
  { key: 'maternity',   label: 'Maternity',   countBadgeClass: 'bg-umberbg text-umber' },
  { key: 'approved',    label: 'Approved (Today)', countBadgeClass: 'bg-greenbg text-richgreen' },
  { key: 'rejected',    label: 'Rejected (Today)', countBadgeClass: 'bg-crimsonbg text-crimson' },
];

function parseTab(raw: string | null): TabKey {
  return TAB_KEYS.includes(raw as TabKey) ? (raw as TabKey) : 'all-pending';
}

// ── Per-tab server-side query (excluding pagination) ──────────────────────────

function tabFilters(tab: TabKey, typeFilter: string): Partial<LeaveListQuery> {
  const base: Partial<LeaveListQuery> = { routedToId: ROUTED_TO.Admin };
  switch (tab) {
    case 'all-pending': base.status = LEAVE_STATUS.Pending;   break;
    case 'escalated':   base.status = LEAVE_STATUS.Escalated; break;
    case 'maternity':   base.status = LEAVE_STATUS.Pending;   break;
    case 'approved':    base.status = LEAVE_STATUS.Approved;  break;
    case 'rejected':    base.status = LEAVE_STATUS.Rejected;  break;
  }
  // Maternity tab: leaveType is constrained client-side, ignore the dropdown.
  if (typeFilter && tab !== 'maternity') base.leaveTypeId = Number(typeFilter);
  return base;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLeaveQueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));

  // Other filters stay client-side (URL would balloon, and they're cheap).
  // If/when we move to URL-driven filters we'd do the same trick as `tab`.
  const typeFilter = searchParams.get('type') ?? '';
  const searchQuery = searchParams.get('q') ?? '';
  const dateFilter = searchParams.get('date') ?? '';

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  const isMaternity = activeTab === 'maternity';

  // Server-side cursor pagination — resets when tab/type changes.
  const pager = useCursorPagination({
    pageSize: 20,
    filtersKey: `${activeTab}|${typeFilter}`,
  });

  // Maternity fetches the bounded set at once; everything else paginates.
  const query = useLeaveList({
    ...tabFilters(activeTab, typeFilter),
    ...(isMaternity ? { limit: 100 } : { limit: pager.pageSize, cursor: pager.cursor }),
  });

  useEffect(() => {
    if (!isMaternity && query.data) pager.cacheNextCursor(query.data.nextCursor);
  }, [isMaternity, query.data, pager]);

  // Tab count chips — single small fetch per tab at limit=100 (API max).
  // Honest "100+" when nextCursor != null.
  const allPendingCount  = useLeaveList({ routedToId: ROUTED_TO.Admin, status: LEAVE_STATUS.Pending,   limit: 100 });
  const escalatedCount   = useLeaveList({ routedToId: ROUTED_TO.Admin, status: LEAVE_STATUS.Escalated, limit: 100 });
  const approvedCount    = useLeaveList({ routedToId: ROUTED_TO.Admin, status: LEAVE_STATUS.Approved,  limit: 100 });
  const rejectedCount    = useLeaveList({ routedToId: ROUTED_TO.Admin, status: LEAVE_STATUS.Rejected,  limit: 100 });

  function countLabel(rows: number, hasMore: boolean): string {
    return hasMore ? `${rows}+` : String(rows);
  }

  const tabCountLabel: Record<TabKey, string | null> = {
    'all-pending': allPendingCount.data ? countLabel(allPendingCount.data.data.length, allPendingCount.data.nextCursor !== null) : null,
    'escalated':   escalatedCount.data  ? countLabel(escalatedCount.data.data.length,  escalatedCount.data.nextCursor  !== null) : null,
    'maternity':   allPendingCount.data ? String((allPendingCount.data.data ?? []).filter((r) => r.leaveTypeId === LEAVE_TYPE_ID.Maternity || r.leaveTypeId === LEAVE_TYPE_ID.Paternity).length) : null,
    'approved':    approvedCount.data   ? countLabel(approvedCount.data.data.length,   approvedCount.data.nextCursor   !== null) : null,
    'rejected':    rejectedCount.data   ? countLabel(rejectedCount.data.data.length,   rejectedCount.data.nextCursor   !== null) : null,
  };

  // Visible rows on the current page after client-side filters.
  const pageRows = query.data?.data ?? [];
  const displayedRequests = (() => {
    let list = pageRows;
    if (isMaternity) {
      list = list.filter((r) => r.leaveTypeId === LEAVE_TYPE_ID.Maternity || r.leaveTypeId === LEAVE_TYPE_ID.Paternity);
    }
    if (dateFilter) {
      list = list.filter((r) => r.fromDate <= dateFilter && r.toDate >= dateFilter);
    }
    if (searchQuery) {
      const needle = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r.employeeName ?? '').toLowerCase().includes(needle) ||
          (r.employeeCode ?? '').toLowerCase().includes(needle),
      );
    }
    return list;
  })();

  const showActions = activeTab === 'all-pending' || activeTab === 'escalated' || activeTab === 'maternity';

  return (
    <>
      {/* Tabs */}
      <div
        id="lq-tabs"
        className="flex items-center gap-1 mb-5 border-b border-sage/30 overflow-x-auto"
        role="tablist"
        aria-label="Leave queue categories"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const countLbl = tabCountLabel[tab.key];
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setParam('tab', tab.key)}
              className={clsx(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'text-forest border-forest'
                  : 'text-slate border-transparent hover:text-charcoal',
              )}
            >
              {tab.label}
              {countLbl !== null && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${tab.countBadgeClass}`}>
                  {countLbl}
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
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Search current page by name or EMP code..."
              aria-label="Search by employee name or code (current page)"
              className="w-full border border-sage/50 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
          </div>

          {/* Leave type filter (server-side) */}
          <select
            aria-label="Filter by leave type"
            value={typeFilter}
            onChange={(e) => setParam('type', e.target.value)}
            disabled={isMaternity}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-offwhite disabled:cursor-not-allowed"
          >
            <option value="">All Leave Types</option>
            <option value={String(LEAVE_TYPE_ID.Annual)}>Annual</option>
            <option value={String(LEAVE_TYPE_ID.Sick)}>Sick</option>
            <option value={String(LEAVE_TYPE_ID.Casual)}>Casual</option>
            <option value={String(LEAVE_TYPE_ID.Maternity)}>Maternity</option>
            <option value={String(LEAVE_TYPE_ID.Paternity)}>Paternity</option>
            <option value={String(LEAVE_TYPE_ID.Unpaid)}>Unpaid</option>
          </select>

          {/* Date filter — client-side on current page */}
          <input
            type="date"
            aria-label="Filter current page by date (request covers this date)"
            value={dateFilter}
            onChange={(e) => setParam('date', e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white"
          />
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

      {/* Paginator — hidden for Maternity (bounded fetch). */}
      {!isMaternity && (
        <div className="mt-4">
          <CursorPaginator
            currentPage={pager.currentPage}
            pageSize={pager.pageSize}
            currentPageCount={pageRows.length}
            hasMore={pager.hasMore}
            highestReachablePage={pager.highestReachablePage}
            onPageChange={pager.goToPage}
            onPrev={pager.goPrev}
            onNext={pager.goNext}
          />
        </div>
      )}
    </>
  );
}
