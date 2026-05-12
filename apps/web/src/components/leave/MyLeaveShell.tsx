'use client';

/**
 * MyLeaveShell — shared leave management UI used by Employee, Manager, Admin,
 * and PayrollOfficer personal leave pages.
 *
 * Props drive the role-specific back/forward paths; the underlying components
 * and API hooks are identical for all roles (BL-004 — every role is an employee).
 *
 * v2: employeeId is a number; status filter uses INT constants.
 */

import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useQueryClient } from '@tanstack/react-query';

import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { LeaveBalanceGrid } from './LeaveBalanceGrid';
import { LeaveRequestRow, LeaveRequestCard } from './LeaveRequestRow';
import { CancelLeaveModal } from './CancelLeaveModal';
import { useLeaveBalances, useLeaveList, useCancelLeave, useLeave } from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import { qk } from '@/lib/api/query-keys';
import { LEAVE_STATUS } from '@/lib/status/maps';
import type { LeaveRequestSummary } from '@nexora/contracts/leave';
import type { LeaveRequest } from '@nexora/contracts/leave';

type TabKey = 'all' | 'pending' | 'approved' | 'rejected';

const tabs: { key: TabKey; label: string; status?: number }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', status: LEAVE_STATUS.Pending },
  { key: 'approved', label: 'Approved', status: LEAVE_STATUS.Approved },
  { key: 'rejected', label: 'Rejected', status: LEAVE_STATUS.Rejected },
];

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

interface MyLeaveShellProps {
  /** Current authenticated user's employee ID (INT) */
  employeeId: number;
  /** Role-aware base path, e.g. "/manager/leave" */
  basePath: string;
  /** Page title shown in header section */
  pageTitle?: string;
}

export function MyLeaveShell({ employeeId, basePath, pageTitle = 'My Leave' }: MyLeaveShellProps) {
  const balancesQuery = useLeaveBalances(employeeId);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const activeStatus = tabs.find((t) => t.key === activeTab)?.status;
  const listQuery = useLeaveList(activeStatus ? { status: activeStatus } : {});

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

  // ── FY subtitle ──────────────────────────────────────────────────────────
  const todayDate = new Date();
  const fiscalYear = todayDate.getMonth() >= 3 ? todayDate.getFullYear() : todayDate.getFullYear() - 1;
  const fiscalYearLabel = `FY ${fiscalYear}-${String(fiscalYear + 1).slice(-2)}`;
  const asOfLabel = todayDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const fySubtitle = `${fiscalYearLabel} — as of ${asOfLabel}`;

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-charcoal">Leave Balances</h2>
          <p className="text-sm text-slate mt-0.5">
            {fySubtitle}
          </p>
        </div>
        <Link href={`${basePath}/new`}>
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
      {balancesQuery.isLoading ? (
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

        <div role="tabpanel" id={`tab-panel-${activeTab}`} aria-labelledby={`tab-btn-${activeTab}`}>
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !listQuery.data || listQuery.data.data.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate text-sm">
              No {activeTab !== 'all' ? activeTab : ''} leave requests found.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm" aria-label={`${pageTitle} history`}>
                  <thead>
                    <tr className="bg-offwhite border-b border-sage/20">
                      <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Type</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Duration</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Days</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Reason</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Approved By</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/20">
                    {listQuery.data.data.map((req) => (
                      <LeaveRequestRow
                        key={req.id}
                        request={req}
                        detailPath={basePath}
                        showEmployee={false}
                        onCancel={isCancellable(req) ? (r) => setCancelTarget(r.id) : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden px-4 py-4 space-y-3">
                {listQuery.data.data.map((req) => (
                  <LeaveRequestCard
                    key={req.id}
                    request={req}
                    detailPath={basePath}
                    onCancel={isCancellable(req) ? (r) => setCancelTarget(r.id) : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancellation policy footer banner */}
      <div className="bg-softmint border border-mint/30 rounded-xl px-5 py-4 mt-6 text-sm text-forest">
        <p className="font-semibold mb-1">Cancellation policy</p>
        <p>
          You can self-cancel a pending or approved leave only before the start date.
          After the leave starts, only your Manager or Admin can cancel it. Approved
          days are restored to your balance automatically on cancellation.
        </p>
      </div>

      {cancelTarget !== null && (
        <CancelWrapper
          summaryId={cancelTarget}
          isOpen={cancelTarget !== null}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  );
}
