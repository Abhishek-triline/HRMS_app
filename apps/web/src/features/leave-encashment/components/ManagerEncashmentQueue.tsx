'use client';

/**
 * ManagerEncashmentQueue — encashment requests assigned to the current manager.
 *
 * GET /api/v1/leave-encashments/queue (Manager sees Pending items where approverId = self)
 *
 * Table columns: Employee, Code, Year, Days requested, Estimated amount
 *   (computed: days × rate, approximate), Submitted on, Days since submission
 *   (escalation warning at >4 working days), Actions (Approve / Reject).
 *
 * OQ-4: Manager approval transitions Pending → ManagerApproved.
 *   Admin must still finalise.
 */

import { useState } from 'react';
import { useEncashmentQueue, useManagerApproveEncashment, useRejectEncashment } from '@/lib/hooks/useLeaveEncashment';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { EncashmentStatusBadge } from './EncashmentStatusBadge';
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

// ── Approve modal ─────────────────────────────────────────────────────────────

interface ApproveModalProps {
  enc: LeaveEncashmentSummary;
  onClose: () => void;
  onSuccess: () => void;
}

function ApproveModal({ enc, onClose, onSuccess }: ApproveModalProps) {
  const [note, setNote] = useState('');
  const approveMutation = useManagerApproveEncashment(enc.id);

  async function handleConfirm() {
    try {
      await approveMutation.mutateAsync({ note: note || undefined, version: enc.version });
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
      aria-labelledby="approve-enc-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 id="approve-enc-title" className="font-heading text-base font-bold text-charcoal">
          Approve Encashment Request
        </h2>
        <div className="bg-softmint rounded-xl px-4 py-3 text-sm">
          <p className="text-charcoal font-semibold">{enc.employeeName}</p>
          <p className="text-xs text-slate mt-0.5 font-mono">{enc.code} · Year {enc.year} · {enc.daysRequested} day{enc.daysRequested !== 1 ? 's' : ''} requested</p>
        </div>
        <p className="text-xs text-slate">
          This will move the request to <strong>Manager Approved</strong>.
          Admin must still finalise and lock the amount before it queues for payroll.
        </p>
        <div>
          <label htmlFor="approve-note" className="block text-xs font-semibold text-slate mb-1">
            Note (optional)
          </label>
          <textarea
            id="approve-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Optional note for Admin…"
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest resize-none"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            loading={approveMutation.isPending}
            className="flex-1"
          >
            Approve
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={approveMutation.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

interface RejectModalProps {
  enc: LeaveEncashmentSummary;
  onClose: () => void;
  onSuccess: () => void;
}

function RejectModal({ enc, onClose, onSuccess }: RejectModalProps) {
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
      aria-labelledby="reject-enc-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 id="reject-enc-title" className="font-heading text-base font-bold text-charcoal">
          Reject Encashment Request
        </h2>
        <div className="bg-crimsonbg/50 rounded-xl px-4 py-3 text-sm">
          <p className="text-charcoal font-semibold">{enc.employeeName}</p>
          <p className="text-xs text-slate mt-0.5 font-mono">{enc.code} · {enc.daysRequested} day{enc.daysRequested !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <label htmlFor="reject-note" className="block text-xs font-semibold text-slate mb-1">
            Rejection reason <span className="text-crimson" aria-hidden="true">*</span>
          </label>
          <textarea
            id="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            required
            placeholder="Enter the reason for rejection…"
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

// ── Row ───────────────────────────────────────────────────────────────────────

interface QueueRowProps {
  enc: LeaveEncashmentSummary;
  onApprove: (enc: LeaveEncashmentSummary) => void;
  onReject: (enc: LeaveEncashmentSummary) => void;
}

function QueueRow({ enc, onApprove, onReject }: QueueRowProps) {
  const wdSince = workingDaysSince(enc.createdAt);
  const isEscalation = wdSince > 4;

  return (
    <tr className="hover:bg-offwhite/50 transition-colors">
      <td className="px-6 py-3">
        <p className="font-semibold text-charcoal text-sm">{enc.employeeName}</p>
        <p className="text-xs font-mono text-slate">{enc.employeeCode}</p>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-forest font-semibold">{enc.code}</td>
      <td className="px-4 py-3 text-sm text-charcoal text-center">{enc.year}</td>
      <td className="px-4 py-3 text-sm text-charcoal text-right">{enc.daysRequested}</td>
      <td className="px-4 py-3 text-xs text-slate text-right">
        <span title="Approximate — actual rate locked at Admin-Finalise">
          Rate locked at finalise
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate">{fmtDate(enc.createdAt)}</td>
      <td className="px-4 py-3">
        {isEscalation ? (
          <span className="inline-flex items-center gap-1 bg-umberbg text-umber text-xs font-semibold px-2 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {wdSince}d — SLA breached
          </span>
        ) : (
          <span className="text-xs text-slate">{wdSince} working day{wdSince !== 1 ? 's' : ''}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => onApprove(enc)}
            className="min-h-[44px] px-3 py-1.5 text-xs"
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onReject(enc)}
            className="min-h-[44px] px-3 py-1.5 text-xs"
          >
            Reject
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Queue skeleton ────────────────────────────────────────────────────────────

function QueueSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading encashment queue…">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-sage/10">
          <div className="h-3 bg-sage/20 rounded w-28" />
          <div className="h-3 bg-sage/20 rounded w-20" />
          <div className="h-3 bg-sage/20 rounded w-12" />
          <div className="h-3 bg-sage/20 rounded w-8" />
          <div className="h-3 bg-sage/20 rounded w-20" />
          <div className="h-3 bg-sage/20 rounded w-16" />
          <div className="h-8 bg-sage/20 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ManagerEncashmentQueue() {
  const queueQuery = useEncashmentQueue();
  const [approveTarget, setApproveTarget] = useState<LeaveEncashmentSummary | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveEncashmentSummary | null>(null);

  // Manager sees only Pending items
  const items = (queueQuery.data?.data ?? []).filter((e) => e.status === 'Pending');

  return (
    <>
      {/* SLA notice */}
      <div className="bg-umberbg border border-umber/30 rounded-xl px-4 py-3 flex gap-3 mb-5">
        <svg className="w-5 h-5 text-umber shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-umber font-medium">
          Requests not actioned within <strong>5 working days</strong> are automatically escalated to Admin.
          Approve or reject promptly to keep the workflow moving.
        </p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-6 pt-5 pb-4 border-b border-sage/20 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-charcoal">Pending Encashment Requests</h2>
          {!queueQuery.isLoading && (
            <span className="text-xs text-slate">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {queueQuery.isLoading ? (
          <QueueSkeleton />
        ) : queueQuery.isError ? (
          <div className="px-6 py-8 flex items-center justify-between gap-4">
            <span className="text-sm text-crimson" role="alert">
              Could not load encashment queue. Please refresh.
            </span>
            <button
              type="button"
              onClick={() => queueQuery.refetch()}
              className="text-xs font-semibold text-forest hover:underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg className="w-10 h-10 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate text-sm font-medium">No pending encashment requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Pending encashment requests">
              <thead>
                <tr className="bg-offwhite border-b border-sage/20">
                  <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Employee</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Code</th>
                  <th scope="col" className="text-center px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Year</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Days</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Est. Amount</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Submitted</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Days since</th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10" aria-live="polite">
                {items.map((enc) => (
                  <QueueRow
                    key={enc.id}
                    enc={enc}
                    onApprove={setApproveTarget}
                    onReject={setRejectTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {approveTarget && (
        <ApproveModal
          enc={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={() => queueQuery.refetch()}
        />
      )}
      {rejectTarget && (
        <RejectModal
          enc={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={() => queueQuery.refetch()}
        />
      )}
    </>
  );
}
