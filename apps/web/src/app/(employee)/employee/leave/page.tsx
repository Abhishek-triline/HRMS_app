'use client';

/**
 * E-02 — My Leave (Employee)
 * Visual reference: prototype/employee/my-leave.html
 *
 * - Balance grid at top
 * - Tabbed history: All / Pending / Approved / Rejected
 * - "Apply for Leave" CTA
 * - Cancel button on cancellable rows; fires useCancelLeave, toasts restoredDays
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useQueryClient } from '@tanstack/react-query';

import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { LeaveBalanceGrid } from '@/components/leave/LeaveBalanceGrid';
import { LeaveRequestRow, LeaveRequestCard } from '@/components/leave/LeaveRequestRow';
import { CancelLeaveModal } from '@/components/leave/CancelLeaveModal';
import { useLeaveBalances, useLeaveList, useCancelLeave, useLeave } from '@/lib/hooks/useLeave';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { CursorPaginator } from '@/components/ui/CursorPaginator';
import { useMe } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { qk } from '@/lib/api/query-keys';
import type { LeaveRequestSummary } from '@nexora/contracts/leave';
import type { LeaveRequest } from '@nexora/contracts/leave';
import { LEAVE_STATUS } from '@/lib/status/maps';

type TabKey = 'all' | 'pending' | 'approved' | 'rejected';

const tabs: { key: TabKey; label: string; status?: number }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', status: LEAVE_STATUS.Pending },
  { key: 'approved', label: 'Approved', status: LEAVE_STATUS.Approved },
  { key: 'rejected', label: 'Rejected', status: LEAVE_STATUS.Rejected },
];

// Inner component that handles cancel after we fetch the full request
function CancelWrapper({
  summaryId,
  isOpen,
  onClose,
}: {
  summaryId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: fullRequest, isLoading } = useLeave(summaryId);
  const cancelMutation = useCancelLeave(summaryId);

  async function handleConfirm(note: string) {
    if (!fullRequest) return;
    try {
      const result = await cancelMutation.mutateAsync({
        version: fullRequest.version,
        note: note || undefined,
      });
      toast.success(
        'Leave cancelled',
        result.restoredDays > 0
          ? `${result.restoredDays} day${result.restoredDays !== 1 ? 's' : ''} restored to your balance.`
          : 'No days were restored (leave had already started).',
      );
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
      onClose();
    } catch (err) {
      toast.error('Cancellation failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (isLoading || !fullRequest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <CancelLeaveModal
      isOpen={isOpen}
      onClose={onClose}
      request={fullRequest as LeaveRequest}
      onConfirm={handleConfirm}
      isLoading={cancelMutation.isPending}
    />
  );
}

export default function MyLeavePage() {
  const { data: me, isLoading: meLoading } = useMe();
  const employeeId = me?.data?.user?.id ?? 0;

  const balancesQuery = useLeaveBalances(employeeId);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const activeStatus = tabs.find((t) => t.key === activeTab)?.status;
  // Server-side cursor pagination; resets to page 1 on tab change.
  const pager = useCursorPagination({ pageSize: 10, filtersKey: activeTab });
  const listQuery = useLeaveList({
    ...(activeStatus !== undefined ? { status: activeStatus } : {}),
    limit: pager.pageSize,
    cursor: pager.cursor,
  });
  useEffect(() => {
    if (listQuery.data) pager.cacheNextCursor(listQuery.data.nextCursor);
  }, [listQuery.data, pager]);

  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isCancellable(req: LeaveRequestSummary): boolean {
    if (req.status === LEAVE_STATUS.Pending) return true;
    if (req.status === LEAVE_STATUS.Approved) {
      const start = new Date(req.fromDate + 'T00:00:00');
      return start > today;
    }
    return false;
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-charcoal">Leave Balances</h2>
          <p className="text-sm text-slate mt-0.5">
            {balancesQuery.data
              ? `FY ${balancesQuery.data.year} — as of ${today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'Loading…'}
          </p>
        </div>
        <Link href="/employee/leave/new">
          <Button
            variant="primary"
            leadingIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Apply for Leave
          </Button>
        </Link>
      </div>

      {/* Balance grid */}
      {meLoading || balancesQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-sage/30 p-5 animate-pulse">
              <div className="h-3 bg-sage/30 rounded w-16 mb-3" />
              <div className="h-10 bg-sage/20 rounded w-12 mb-2" />
              <div className="h-2 bg-sage/30 rounded-full mb-3" />
              <div className="h-8 bg-softmint rounded" />
            </div>
          ))}
        </div>
      ) : balancesQuery.error ? (
        <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-6 py-4 mb-8 text-sm text-crimson" role="alert">
          Could not load leave balances. Please refresh.
        </div>
      ) : balancesQuery.data ? (
        <div className="mb-8">
          <LeaveBalanceGrid data={balancesQuery.data} />
        </div>
      ) : null}

      {/* History table */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-semibold text-charcoal">Leave History</h2>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 border-b border-sage/30" role="tablist" aria-label="Leave history tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                id={`tab-btn-${tab.key}`}
                aria-selected={activeTab === tab.key}
                aria-controls={`tab-panel-${tab.key}`}
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

        {/* Tab panel */}
        <div
          role="tabpanel"
          id={`tab-panel-${activeTab}`}
          aria-labelledby={`tab-btn-${activeTab}`}
        >
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" aria-label="Loading leave history" />
            </div>
          ) : listQuery.error ? (
            <div className="px-6 py-8 text-sm text-crimson" role="alert">
              Could not load leave history. Please refresh.
            </div>
          ) : !listQuery.data || listQuery.data.data.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate text-sm">
              No {activeTab !== 'all' ? activeTab : ''} leave requests found.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm" aria-label="Leave history">
                  <thead>
                    <tr className="bg-offwhite border-b border-sage/20">
                      <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Type</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Duration</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Days</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/20">
                    {listQuery.data.data.map((req) => (
                      <LeaveRequestRow
                        key={req.id}
                        request={req}
                        detailPath="/employee/leave"
                        showEmployee={false}
                        onCancel={isCancellable(req) ? (r) => setCancelTarget(r.id) : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden px-4 py-4 space-y-3">
                {listQuery.data.data.map((req) => (
                  <LeaveRequestCard
                    key={req.id}
                    request={req}
                    detailPath="/employee/leave"
                    onCancel={isCancellable(req) ? (r) => setCancelTarget(r.id) : undefined}
                  />
                ))}
              </div>

              <CursorPaginator
                currentPage={pager.currentPage}
                pageSize={pager.pageSize}
                currentPageCount={listQuery.data.data.length}
                hasMore={pager.hasMore}
                highestReachablePage={pager.highestReachablePage}
                onPageChange={pager.goToPage}
                onPrev={pager.goPrev}
                onNext={pager.goNext}
              />
            </>
          )}
        </div>
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelWrapper
          summaryId={cancelTarget}
          isOpen={Boolean(cancelTarget)}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  );
}
