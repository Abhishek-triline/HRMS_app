'use client';

/**
 * E-04 — Leave Request Detail (Employee)
 * Visual reference: prototype/employee/leave-detail.html
 *
 * Status banner, request details, balance impact (before→after arrow row),
 * 3-step timeline with optional Escalated 4th step, cancel CTA.
 * Explains BL-019/020 cancellation rules.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { CancelLeaveModal } from '@/components/leave/CancelLeaveModal';
import { useCancelLeave, useLeave } from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import { qk } from '@/lib/api/query-keys';
import type { LeaveRequest } from '@nexora/contracts/leave';
import { LEAVE_STATUS, LEAVE_STATUS_MAP, LEAVE_TYPE_MAP, CANCELLED_BY_ROLE, ROUTED_TO } from '@/lib/status/maps';

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function isBeforeStart(fromDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(fromDate + 'T00:00:00');
  return start > today;
}

// ── Status banner ─────────────────────────────────────────────────────────────
// Fix: avoid border-current/30 (invalid Tailwind opacity modifier on border-current).
// Each status gets explicit (bg, border, text) tuple classes.

type StatusConfig = {
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
  subColor: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  label: string;
  sub: string;
};

function buildStatusConfig(request: LeaveRequest): StatusConfig {
  switch (request.status) {
    case LEAVE_STATUS.Pending:
      return {
        bg: 'bg-umberbg',
        border: 'border-umber/20',
        iconColor: 'text-umber',
        textColor: 'text-umber',
        subColor: 'text-umber/70',
        pillBg: 'bg-umberbg',
        pillBorder: 'border-umber/30',
        pillText: 'text-umber',
        label: 'Pending Approval',
        sub: `Awaiting review by ${request.approverName ?? 'approver'}`,
      };
    case LEAVE_STATUS.Approved:
      return {
        bg: 'bg-greenbg',
        border: 'border-richgreen/20',
        iconColor: 'text-richgreen',
        textColor: 'text-richgreen',
        subColor: 'text-richgreen/70',
        pillBg: 'bg-greenbg',
        pillBorder: 'border-richgreen/30',
        pillText: 'text-richgreen',
        label: 'Approved',
        sub: request.decidedAt ? `Approved on ${formatDateTime(request.decidedAt)}` : 'Approved',
      };
    case LEAVE_STATUS.Rejected:
      return {
        bg: 'bg-crimsonbg',
        border: 'border-crimson/20',
        iconColor: 'text-crimson',
        textColor: 'text-crimson',
        subColor: 'text-crimson/70',
        pillBg: 'bg-crimsonbg',
        pillBorder: 'border-crimson/30',
        pillText: 'text-crimson',
        label: 'Rejected',
        sub: request.decisionNote ? `Reason: ${request.decisionNote}` : 'Request was rejected.',
      };
    case LEAVE_STATUS.Cancelled: {
      const cancellerLabel =
        request.cancelledByRoleId === CANCELLED_BY_ROLE.Self
          ? 'by you'
          : request.cancelledByRoleId === CANCELLED_BY_ROLE.Admin
            ? `by Admin${request.cancelledByName ? ` (${request.cancelledByName})` : ''}`
            : request.cancelledByName
              ? `by your reporting manager (${request.cancelledByName})`
              : 'by your reporting manager';
      const cancelledOnText = request.cancelledAt
        ? `Cancelled on ${formatDateTime(request.cancelledAt)} ${cancellerLabel}`
        : `Cancelled ${cancellerLabel}`;
      return {
        bg: 'bg-lockedbg',
        border: 'border-lockedfg/20',
        iconColor: 'text-lockedfg',
        textColor: 'text-lockedfg',
        subColor: 'text-lockedfg/70',
        pillBg: 'bg-lockedbg',
        pillBorder: 'border-lockedfg/30',
        pillText: 'text-lockedfg',
        label: 'Cancelled',
        sub: cancelledOnText,
      };
    }
    case LEAVE_STATUS.Escalated:
      return {
        bg: 'bg-umberbg',
        border: 'border-umber/20',
        iconColor: 'text-umber',
        textColor: 'text-umber',
        subColor: 'text-umber/70',
        pillBg: 'bg-umberbg',
        pillBorder: 'border-umber/30',
        pillText: 'text-umber',
        label: 'Escalated to Admin',
        sub: 'Manager did not respond within 5 working days (BL-018).',
      };
    default:
      return {
        bg: 'bg-umberbg', border: 'border-umber/20', iconColor: 'text-umber',
        textColor: 'text-umber', subColor: 'text-umber/70',
        pillBg: 'bg-umberbg', pillBorder: 'border-umber/30', pillText: 'text-umber',
        label: LEAVE_STATUS_MAP[request.status]?.label ?? 'Unknown',
        sub: '',
      };
  }
}

function StatusBanner({ request }: { request: LeaveRequest }) {
  const cfg = buildStatusConfig(request);
  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl px-6 py-4 mb-6 flex items-center gap-3`}>
      <svg
        className={`w-5 h-5 flex-shrink-0 ${cfg.iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <div className={`font-semibold text-sm ${cfg.textColor}`}>{cfg.label}</div>
        <div className={`text-xs mt-0.5 ${cfg.subColor}`}>{cfg.sub}</div>
      </div>
      <span className={`ml-auto ${cfg.pillBg} ${cfg.pillBorder} ${cfg.pillText} border text-xs font-bold px-3 py-1 rounded-full`}>
        {request.code}
      </span>
    </div>
  );
}

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  // `id` may be a numeric primary key OR a leave code like "L-2026-0018"
  // (the latter comes from notification deep-links). useLeave accepts both;
  // the cancel mutation needs the real numeric id, which we read back off
  // the loaded request once it's resolved.
  const { data: request, isLoading, error } = useLeave(id);
  const cancelMutation = useCancelLeave(request?.id ?? 0);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function handleCancel(note: string) {
    if (!request) return;
    try {
      const result = await cancelMutation.mutateAsync({
        version: request.version,
        note: note || undefined,
      });
      toast.success(
        'Leave cancelled',
        result.restoredDays > 0
          ? `${result.restoredDays} day${result.restoredDays !== 1 ? 's' : ''} restored to your balance.`
          : 'No days were restored (leave had already started).',
      );
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
      setCancelOpen(false);
    } catch (err) {
      toast.error('Cancellation failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 p-8">
        <Spinner size="lg" aria-label="Loading leave request" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div>
        <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-6 py-4 text-sm text-crimson" role="alert">
          Could not load leave request. It may not exist or you may not have permission to view it.
        </div>
        <div className="mt-4">
          <Link href="/employee/leave" className="text-sm text-forest hover:underline">
            Back to My Leave
          </Link>
        </div>
      </div>
    );
  }

  const beforeStart = isBeforeStart(request.fromDate);
  const canCancel =
    (request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Approved) &&
    (beforeStart || request.status === LEAVE_STATUS.Approved);

  // createdAt is a full ISO timestamp — formatDateTime handles it correctly.
  // formatDate is reserved for date-only YYYY-MM-DD strings (fromDate / toDate).
  const submittedDate = formatDateTime(request.createdAt);
  const escalationDeadline = (() => {
    const d = new Date(request.createdAt);
    d.setDate(d.getDate() + 7); // approx 5 working days
    return formatDate(d.toISOString());
  })();

  // Balance impact: compute before/after for structured card
  const balanceBefore = request.deductedDays !== null
    ? (request.deductedDays)
    : request.days;
  // We don't have the actual "before" balance from the request, so we show
  // deductedDays as the impact. The structured row shows the impact direction.
  const showBalanceCard = request.status !== LEAVE_STATUS.Rejected && request.status !== LEAVE_STATUS.Cancelled;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="text-xs text-slate flex items-center gap-1">
          <Link href="/employee/leave" className="hover:text-forest transition-colors">
            My Leave
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">{request.code}</span>
        </div>
      </div>

      {/* Status banner */}
      <StatusBanner request={request} />

      {/* Details card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-sage/20">
          <h2 className="font-heading text-base font-semibold text-charcoal">Leave Request Details</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Leave Type</div>
            <div className="text-sm font-semibold text-charcoal">{LEAVE_TYPE_MAP[request.leaveTypeId]?.label ?? request.leaveTypeName} Leave</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Duration</div>
            <div className="text-sm font-semibold text-charcoal">
              {request.fromDate === request.toDate
                ? formatDate(request.fromDate)
                : `${formatDate(request.fromDate)} – ${formatDate(request.toDate)}`}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Total Days</div>
            <div className="text-sm font-semibold text-charcoal">
              {request.days} working {request.days !== 1 ? 'days' : 'day'}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Submitted On</div>
            <div className="text-sm font-semibold text-charcoal">{submittedDate}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Reason</div>
            <div className="text-sm text-charcoal">{request.reason}</div>
          </div>
          {request.status === LEAVE_STATUS.Cancelled ? (
            request.cancelledByName && (
              <div>
                <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Cancelled By</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-7 h-7 rounded-full bg-lockedfg text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                    aria-hidden="true"
                  >
                    {request.cancelledByName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-charcoal">{request.cancelledByName}</div>
                    <div className="text-xs text-slate">
                      {request.cancelledByRoleId === CANCELLED_BY_ROLE.Self
                        ? 'You (self-cancelled)'
                        : request.cancelledByRoleId === CANCELLED_BY_ROLE.Admin
                          ? 'Admin'
                          : 'Reporting Manager'}
                    </div>
                    {request.cancelledAt && (
                      <div className="text-xs text-slate/70 mt-0.5">{formatDateTime(request.cancelledAt)}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            request.approverName && (
              <div>
                <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">
                  {request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Escalated
                    ? 'Assigned To'
                    : 'Decided By'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-7 h-7 rounded-full bg-emerald text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                    aria-hidden="true"
                  >
                    {request.approverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-charcoal">{request.approverName}</div>
                    <div className="text-xs text-slate">
                      {request.routedToId === ROUTED_TO.Admin ? 'Admin' : 'Reporting Manager'}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
          {(request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Escalated) && (
            <div>
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Escalation Deadline</div>
              <div className="text-sm font-semibold text-umber">{escalationDeadline}</div>
              <div className="text-xs text-slate mt-0.5">5 working days from submission (BL-018)</div>
            </div>
          )}
          {request.decisionNote && (
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Decision Note</div>
              <div className="text-sm text-charcoal">{request.decisionNote}</div>
            </div>
          )}
        </div>
      </div>

      {/* Balance impact — structured before→after card */}
      {showBalanceCard && (
        <div className="bg-softmint border border-mint rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-forest mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Leave Balance Impact
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-slate">{LEAVE_TYPE_MAP[request.leaveTypeId]?.label ?? request.leaveTypeName} Leave</div>
            <div className="flex items-center gap-2 font-semibold">
              {request.status === LEAVE_STATUS.Approved && request.deductedDays !== null ? (
                <>
                  <span className="text-sm text-charcoal">
                    {/* We show deducted impact — the API does not return the before-balance in the request */}
                    {request.deductedDays} day{request.deductedDays !== 1 ? 's' : ''} deducted
                  </span>
                  <svg className="w-4 h-4 text-slate flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm text-richgreen">balance updated</span>
                </>
              ) : (
                <>
                  <span className="text-sm text-charcoal">
                    {request.days} day{request.days !== 1 ? 's' : ''} remaining
                  </span>
                  <svg className="w-4 h-4 text-slate flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm text-richgreen">
                    {request.days} fewer remaining (if approved)
                  </span>
                </>
              )}
            </div>
            <span className="text-xs text-slate bg-white rounded px-2 py-0.5 border border-sage/30">
              {request.status === LEAVE_STATUS.Approved ? 'deducted on approval' : 'if approved'}
            </span>
          </div>
          {request.restoredDays !== null && request.restoredDays > 0 && (
            <div className="mt-3 text-sm text-forest font-semibold">
              {request.restoredDays} day{request.restoredDays !== 1 ? 's' : ''} restored on cancellation.
            </div>
          )}
        </div>
      )}

      {/* Timeline — 3 fixed steps + optional Escalated 4th */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold text-charcoal mb-5">Request Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-sage/30" aria-hidden="true" />
          <ol className="space-y-6">
            {/* Step 1: Submitted ✓ */}
            <li className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full bg-richgreen text-white flex items-center justify-center flex-shrink-0 z-10"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="pt-1">
                <div className="text-sm font-semibold text-charcoal">Submitted</div>
                <div className="text-xs text-slate mt-0.5">{formatDateTime(request.createdAt)}</div>
              </div>
            </li>

            {/* Step 2: Pending Manager Review ⏱ (current when pending/escalated, completed when decided) */}
            {request.decidedAt || request.status === LEAVE_STATUS.Cancelled ? (
              /* Already decided — show as completed or skip */
              null
            ) : (
              <li className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full bg-umberbg border-2 border-umber text-umber flex items-center justify-center flex-shrink-0 z-10"
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-umber">Pending Manager Review</div>
                  <div className="text-xs text-slate mt-0.5">
                    {request.approverName
                      ? `Awaiting ${request.approverName} — deadline ${escalationDeadline}`
                      : `Deadline ${escalationDeadline}`}
                  </div>
                  <span className="inline-block mt-1.5 text-xs bg-umberbg text-umber font-bold px-2 py-0.5 rounded">
                    Current
                  </span>
                </div>
              </li>
            )}

            {/* Step 3 (optional): Escalated — shown only when escalatedAt is set */}
            {request.escalatedAt && (
              <li className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full bg-umberbg border-2 border-umber text-umber flex items-center justify-center flex-shrink-0 z-10"
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-umber">Escalated to Admin</div>
                  <div className="text-xs text-slate mt-0.5">{formatDateTime(request.escalatedAt)}</div>
                </div>
              </li>
            )}

            {/* Final step: Decision ❍ ghosted when pending, filled when decided/cancelled */}
            {request.decidedAt ? (
              <li className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    request.status === LEAVE_STATUS.Approved ? 'bg-richgreen text-white' : 'bg-crimson text-white'
                  }`}
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {request.status === LEAVE_STATUS.Approved ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <div className="pt-1">
                  <div className={`text-sm font-semibold ${request.status === LEAVE_STATUS.Approved ? 'text-richgreen' : 'text-crimson'}`}>
                    {LEAVE_STATUS_MAP[request.status]?.label ?? String(request.status)}
                  </div>
                  <div className="text-xs text-slate mt-0.5">{formatDateTime(request.decidedAt)}</div>
                  {request.decisionNote && (
                    <div className="text-xs text-slate mt-1 italic">"{request.decisionNote}"</div>
                  )}
                </div>
              </li>
            ) : request.status === LEAVE_STATUS.Cancelled ? (
              <li className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full bg-lockedbg border-2 border-lockedfg text-lockedfg flex items-center justify-center flex-shrink-0 z-10"
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-lockedfg">Cancelled</div>
                  {request.cancelledAt && (
                    <div className="text-xs text-slate mt-0.5">{formatDateTime(request.cancelledAt)}</div>
                  )}
                </div>
              </li>
            ) : (
              /* Ghosted "Decision" step when still pending */
              <li className="flex items-start gap-4 opacity-40">
                <div
                  className="w-8 h-8 rounded-full bg-sage/30 border-2 border-sage text-slate flex items-center justify-center flex-shrink-0 z-10"
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-slate">Decision</div>
                  <div className="text-xs text-slate mt-0.5">Approved / Rejected / Escalated</div>
                </div>
              </li>
            )}
          </ol>
        </div>
      </div>

      {/* Cancel section */}
      {canCancel && (
        <div className="bg-white rounded-xl shadow-sm border border-crimson/20 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-2">Cancel This Request</h3>
          <p className="text-sm text-slate mb-4">
            {beforeStart
              ? `The leave hasn't started yet (start date ${formatDate(request.fromDate)}), so you can cancel it yourself. Doing so restores your ${LEAVE_TYPE_MAP[request.leaveTypeId]?.label ?? request.leaveTypeName} leave balance (BL-019).`
              : 'This leave has already started. Only the remaining unused days will be restored on cancellation (BL-020).'}
          </p>
          <Button
            variant="destructive"
            size="md"
            onClick={() => setCancelOpen(true)}
          >
            Cancel Request
          </Button>
          {beforeStart && (
            <p className="text-xs text-slate mt-3">
              After the leave starts, only your Manager or Admin can cancel it (partial-day restoration needs review).
            </p>
          )}
        </div>
      )}

      {/* Cancel modal */}
      {cancelOpen && (
        <CancelLeaveModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          request={request}
          onConfirm={handleCancel}
          isLoading={cancelMutation.isPending}
        />
      )}
    </>
  );
}
