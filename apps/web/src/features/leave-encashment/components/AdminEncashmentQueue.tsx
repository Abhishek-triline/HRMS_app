'use client';

/**
 * AdminEncashmentQueue — Admin view of all pending/manager-approved encashments.
 *
 * Decided admin queue behaviour:
 *   Tab 1: Manager-Approved (action needed) — finalise or reject
 *   Tab 2: Pending (awaiting manager) — read-only; escalate button if SLA breached
 *   Tab 3: All this year — full org view
 *
 * Admin Finalise modal: shows requested days, editable daysApproved (clamped by server),
 * live amount preview note, optional note. Calls /admin-finalise.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  useEncashmentQueue,
  useMyEncashments,
  useAdminFinaliseEncashment,
  useRejectEncashment,
} from '@/lib/hooks/useLeaveEncashment';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EncashmentStatusBadge } from './EncashmentStatusBadge';
import { LEAVE_ENCASHMENT_STATUS } from '@/lib/status/maps';
import type { LeaveEncashmentSummary } from '@nexora/contracts/leave-encashment';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function workingDaysSince(iso: string): number {
  const from = new Date(iso);
  const to = new Date();
  let days = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ── Admin Finalise modal ──────────────────────────────────────────────────────

interface FinaliseModalProps {
  enc: LeaveEncashmentSummary;
  onClose: () => void;
  onSuccess: () => void;
}

function FinaliseModal({ enc, onClose, onSuccess }: FinaliseModalProps) {
  // Default to requested days; server will clamp to 50% of current balance
  const [daysApproved, setDaysApproved] = useState(String(enc.daysRequested));
  const [note, setNote] = useState('');
  const finaliseMutation = useAdminFinaliseEncashment(enc.id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const days = Number(daysApproved);
    if (!Number.isInteger(days) || days < 1) return;
    try {
      await finaliseMutation.mutateAsync({
        daysApproved: days,
        note: note.trim() || undefined,
        version: enc.version,
      });
      onSuccess();
      onClose();
    } catch {
      // hook handles toast
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalise-enc-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-sage/20">
          <h2 id="finalise-enc-title" className="font-heading text-lg font-bold text-charcoal">
            Finalise Encashment
          </h2>
          <p className="text-xs text-slate mt-0.5">
            Balance will be deducted immediately. Amount queued for next payroll run.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Employee info */}
          <div className="bg-softmint rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-charcoal">{enc.employeeName}</p>
            <p className="text-xs text-slate font-mono mt-0.5">{enc.code} · Year {enc.year}</p>
            <p className="text-xs text-slate mt-0.5">Requested: {enc.daysRequested} day{enc.daysRequested !== 1 ? 's' : ''}</p>
          </div>

          {/* Days approved */}
          <div>
            <label htmlFor="admin-days" className="block text-sm font-semibold text-charcoal mb-1">
              Days to approve <span className="text-crimson" aria-hidden="true">*</span>
            </label>
            <input
              id="admin-days"
              type="number"
              min={1}
              value={daysApproved}
              onChange={(e) => setDaysApproved(e.target.value)}
              required
              className="w-28 border border-sage/50 rounded-lg px-3 py-2 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
            />
            <p className="text-xs text-slate mt-1">
              Server will clamp to floor(current Annual balance × 50%) if this exceeds the limit.
            </p>
          </div>

          {/* Rate preview note */}
          <div className="bg-softmint rounded-xl px-4 py-3 text-xs text-slate space-y-0.5">
            <p className="font-semibold text-forest">Amount locked at finalise</p>
            <p>Rate = (Basic + DA) ÷ working days in the paying month. Computed from the employee&apos;s active salary structure.</p>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="admin-note" className="block text-xs font-semibold text-slate mb-1">
              Note (optional)
            </label>
            <textarea
              id="admin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Internal note for audit trail…"
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={finaliseMutation.isPending}
              className="flex-1"
            >
              Finalise
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={finaliseMutation.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Admin Reject modal ────────────────────────────────────────────────────────

interface AdminRejectModalProps {
  enc: LeaveEncashmentSummary;
  onClose: () => void;
  onSuccess: () => void;
}

function AdminRejectModal({ enc, onClose, onSuccess }: AdminRejectModalProps) {
  const [note, setNote] = useState('');
  const rejectMutation = useRejectEncashment(enc.id);

  async function handleConfirm() {
    if (!note.trim()) return;
    try {
      await rejectMutation.mutateAsync({ note: note.trim(), version: enc.version });
      onSuccess();
      onClose();
    } catch {
      // hook handles toast
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-reject-enc-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 id="admin-reject-enc-title" className="font-heading text-base font-bold text-charcoal">
          Reject Encashment Request
        </h2>
        <div className="bg-crimsonbg/50 rounded-xl px-4 py-3 text-sm">
          <p className="text-charcoal font-semibold">{enc.employeeName}</p>
          <p className="text-xs text-slate mt-0.5 font-mono">{enc.code} · {enc.daysRequested} day{enc.daysRequested !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <label htmlFor="admin-reject-note" className="block text-xs font-semibold text-slate mb-1">
            Rejection reason <span className="text-crimson" aria-hidden="true">*</span>
          </label>
          <textarea
            id="admin-reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            required
            placeholder="Enter reason for rejection…"
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson resize-none"
          />
          {note.length > 0 && (
            <p className="text-xs text-slate mt-1 text-right">{note.length}/2000</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!note.trim()}
            loading={rejectMutation.isPending}
            className="flex-1"
          >
            Reject
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={rejectMutation.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

interface QueueTableProps {
  items: LeaveEncashmentSummary[];
  showActions: boolean;
  onFinalise?: (enc: LeaveEncashmentSummary) => void;
  onReject?: (enc: LeaveEncashmentSummary) => void;
}

function QueueTable({ items, showActions, onFinalise, onReject }: QueueTableProps) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <svg className="w-10 h-10 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-slate text-sm font-medium">No items in this queue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Encashment queue">
        <thead>
          <tr className="bg-offwhite border-b border-sage/20">
            <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Employee</th>
            <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Code</th>
            <th scope="col" className="text-center px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Year</th>
            <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Requested</th>
            <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
            <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Submitted</th>
            <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Waiting</th>
            {showActions && <th scope="col" className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-sage/10" aria-live="polite">
          {items.map((enc) => {
            const wdSince = workingDaysSince(enc.createdAt);
            const slaBreached = wdSince > 5 || Boolean(enc.escalatedAt);
            return (
              <tr key={enc.id} className="hover:bg-offwhite/50 transition-colors">
                <td className="px-6 py-3">
                  <p className="font-semibold text-charcoal text-sm">{enc.employeeName}</p>
                  <p className="text-xs font-mono text-slate">{enc.employeeCode}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-forest font-semibold">{enc.code}</td>
                <td className="px-4 py-3 text-sm text-charcoal text-center">{enc.year}</td>
                <td className="px-4 py-3 text-sm text-charcoal text-right">{enc.daysRequested} d</td>
                <td className="px-4 py-3">
                  <EncashmentStatusBadge status={enc.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate">{fmtDate(enc.createdAt)}</td>
                <td className="px-4 py-3">
                  {slaBreached ? (
                    <span className="inline-flex items-center gap-1 bg-umberbg text-umber text-xs font-semibold px-2 py-0.5 rounded-full">
                      {wdSince}d
                    </span>
                  ) : (
                    <span className="text-xs text-slate">{wdSince}d</span>
                  )}
                </td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {enc.status === LEAVE_ENCASHMENT_STATUS.ManagerApproved && onFinalise && (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => onFinalise(enc)}
                          className="min-h-[44px] px-3 py-1.5 text-xs"
                        >
                          Finalise
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => onReject(enc)}
                          className="min-h-[44px] px-3 py-1.5 text-xs"
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading…">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-sage/10">
          <div className="h-3 bg-sage/20 rounded w-28" />
          <div className="h-3 bg-sage/20 rounded w-20" />
          <div className="h-3 bg-sage/20 rounded w-12" />
          <div className="h-3 bg-sage/20 rounded w-8" />
          <div className="h-5 bg-sage/20 rounded-full w-28" />
          <div className="h-3 bg-sage/20 rounded w-16" />
          <div className="h-8 bg-sage/20 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'manager-approved' | 'pending' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'manager-approved', label: 'Manager Approved (Action needed)' },
  { key: 'pending', label: 'Pending (Awaiting manager)' },
  { key: 'all', label: 'All this year' },
];

// ── Main component ────────────────────────────────────────────────────────────

export function AdminEncashmentQueue() {
  const [activeTab, setActiveTab] = useState<Tab>('manager-approved');
  const queueQuery = useEncashmentQueue();
  const allQuery = useMyEncashments(); // Admin's useMyEncashments shows all (scoped server-side)

  const [finaliseTarget, setFinaliseTarget] = useState<LeaveEncashmentSummary | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveEncashmentSummary | null>(null);

  const queueItems = queueQuery.data?.data ?? [];
  const managerApprovedItems = queueItems.filter((e) => e.status === LEAVE_ENCASHMENT_STATUS.ManagerApproved);
  const pendingItems = queueItems.filter((e) => e.status === LEAVE_ENCASHMENT_STATUS.Pending);
  const allItems = allQuery.data?.data ?? [];

  const currentYear = new Date().getFullYear();

  const isLoading =
    activeTab === 'all' ? allQuery.isLoading : queueQuery.isLoading;

  const isError =
    activeTab === 'all' ? allQuery.isError : queueQuery.isError;

  function refetchActive() {
    if (activeTab === 'all') {
      allQuery.refetch();
    } else {
      queueQuery.refetch();
    }
    // Also bust the other query
    queueQuery.refetch();
  }

  return (
    <>
      {/* Action notice */}
      {managerApprovedItems.length > 0 && (
        <div className="bg-greenbg border border-richgreen/30 rounded-xl px-4 py-3 flex gap-3 mb-5">
          <svg className="w-5 h-5 text-richgreen shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-richgreen font-medium">
            <strong>{managerApprovedItems.length}</strong> request{managerApprovedItems.length !== 1 ? 's' : ''} awaiting your finalisation.
            Finalise before Jan 1 00:01 IST to ensure balance deduction before carry-forward runs.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-sage/30 mb-0" role="tablist" aria-label="Encashment queue tabs">
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
            {tab.key === 'manager-approved' && managerApprovedItems.length > 0 && !queueQuery.isLoading && (
              <span className="ml-2 bg-richgreen text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {managerApprovedItems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 rounded-tl-none">
        {isLoading ? (
          <QueueSkeleton />
        ) : isError ? (
          <div className="px-6 py-8 flex items-center justify-between gap-4">
            <span className="text-sm text-crimson" role="alert">
              Could not load queue. Please refresh.
            </span>
            <button
              type="button"
              onClick={refetchActive}
              className="text-xs font-semibold text-forest hover:underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : activeTab === 'manager-approved' ? (
          <QueueTable
            items={managerApprovedItems}
            showActions={true}
            onFinalise={setFinaliseTarget}
            onReject={setRejectTarget}
          />
        ) : activeTab === 'pending' ? (
          <QueueTable
            items={pendingItems}
            showActions={false}
          />
        ) : (
          <>
            <div className="px-6 pt-5 pb-4 border-b border-sage/20">
              <p className="text-xs text-slate">All encashment requests — Year {currentYear}</p>
            </div>
            <QueueTable
              items={allItems}
              showActions={false}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {finaliseTarget && (
        <FinaliseModal
          enc={finaliseTarget}
          onClose={() => setFinaliseTarget(null)}
          onSuccess={refetchActive}
        />
      )}
      {rejectTarget && (
        <AdminRejectModal
          enc={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={refetchActive}
        />
      )}
    </>
  );
}
