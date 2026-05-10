'use client';

/**
 * E-04 — Leave Request Detail (Employee)
 * Visual reference: prototype/employee/leave-detail.html
 *
 * Status banner, request details, balance impact, timeline, cancel CTA.
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

function StatusBanner({ request }: { request: LeaveRequest }) {
  const configs = {
    Pending: {
      bg: 'bg-umberbg border-umber/20',
      icon: 'text-umber',
      textColor: 'text-umber',
      subColor: 'text-umber/70',
      label: 'Pending Approval',
      sub: `Awaiting review by ${request.approverName ?? 'approver'}`,
    },
    Approved: {
      bg: 'bg-greenbg border-richgreen/20',
      icon: 'text-richgreen',
      textColor: 'text-richgreen',
      subColor: 'text-richgreen/70',
      label: 'Approved',
      sub: request.decidedAt ? `Approved on ${formatDate(request.decidedAt)}` : 'Approved',
    },
    Rejected: {
      bg: 'bg-crimsonbg border-crimson/20',
      icon: 'text-crimson',
      textColor: 'text-crimson',
      subColor: 'text-crimson/70',
      label: 'Rejected',
      sub: request.decisionNote ? `Reason: ${request.decisionNote}` : 'Request was rejected.',
    },
    Cancelled: {
      bg: 'bg-lockedbg border-lockedfg/20',
      icon: 'text-lockedfg',
      textColor: 'text-lockedfg',
      subColor: 'text-lockedfg/70',
      label: 'Cancelled',
      sub: 'This leave request has been cancelled.',
    },
    Escalated: {
      bg: 'bg-umberbg border-umber/20',
      icon: 'text-umber',
      textColor: 'text-umber',
      subColor: 'text-umber/70',
      label: 'Escalated to Admin',
      sub: 'Manager did not respond within 5 working days (BL-018).',
    },
  };

  const cfg = configs[request.status];

  return (
    <div className={`border rounded-xl px-6 py-4 mb-6 flex items-center gap-3 ${cfg.bg}`}>
      <svg className={`w-5 h-5 flex-shrink-0 ${cfg.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <div className={`font-semibold text-sm ${cfg.textColor}`}>{cfg.label}</div>
        <div className={`text-xs mt-0.5 ${cfg.subColor}`}>{cfg.sub}</div>
      </div>
      <span className={`ml-auto border text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.textColor} border-current/30`}>
        {request.code}
      </span>
    </div>
  );
}

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: request, isLoading, error } = useLeave(id);
  const cancelMutation = useCancelLeave(id);
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
      <div className="p-8">
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
    (request.status === 'Pending' || request.status === 'Approved') &&
    (beforeStart || request.status === 'Approved');

  const submittedDate = formatDate(request.createdAt);
  const escalationDeadline = (() => {
    const d = new Date(request.createdAt);
    d.setDate(d.getDate() + 7); // approx 5 working days
    return formatDate(d.toISOString());
  })();

  return (
    <div className="p-6 md:p-8 max-w-3xl">
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
            <div className="text-sm font-semibold text-charcoal">{request.type} Leave</div>
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
              {request.days} calendar day{request.days !== 1 ? 's' : ''}
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
          {request.approverName && (
            <div>
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">
                {request.status === 'Pending' || request.status === 'Escalated'
                  ? 'Assigned To'
                  : 'Decided By'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-7 h-7 rounded-full bg-emerald text-white flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">
                  {request.approverName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">{request.approverName}</div>
                  <div className="text-xs text-slate">
                    {request.routedTo === 'Admin' ? 'Admin' : 'Reporting Manager'}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(request.status === 'Pending' || request.status === 'Escalated') && (
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

      {/* Balance impact */}
      {request.status !== 'Rejected' && request.status !== 'Cancelled' && (
        <div className="bg-softmint border border-mint rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-forest mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Leave Balance Impact
          </h3>
          <div className="text-sm text-slate">
            {request.status === 'Approved' && request.deductedDays !== null ? (
              <span>
                <span className="font-semibold text-charcoal">{request.deductedDays} day{request.deductedDays !== 1 ? 's' : ''}</span> deducted from your {request.type} balance on approval (BL-021).
              </span>
            ) : (
              <span>
                <span className="font-semibold text-charcoal">{request.days} day{request.days !== 1 ? 's' : ''}</span> will be deducted from your {request.type} balance if approved.
              </span>
            )}
          </div>
          {request.restoredDays !== null && request.restoredDays > 0 && (
            <div className="mt-2 text-sm text-forest font-semibold">
              {request.restoredDays} day{request.restoredDays !== 1 ? 's' : ''} restored on cancellation.
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <h3 className="font-heading text-sm font-semibold text-charcoal mb-5">Request Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-sage/30" aria-hidden="true" />
          <ol className="space-y-6">
            {/* Submitted */}
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-richgreen text-white flex items-center justify-center flex-shrink-0 z-10" aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="pt-1">
                <div className="text-sm font-semibold text-charcoal">Submitted</div>
                <div className="text-xs text-slate mt-0.5">{formatDateTime(request.createdAt)}</div>
              </div>
            </li>

            {/* Escalated (if applicable) */}
            {request.escalatedAt && (
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-umberbg border-2 border-umber text-umber flex items-center justify-center flex-shrink-0 z-10" aria-hidden="true">
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

            {/* Decision */}
            {request.decidedAt ? (
              <li className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${request.status === 'Approved' ? 'bg-richgreen text-white' : 'bg-crimson text-white'}`} aria-hidden="true">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {request.status === 'Approved'
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                  </svg>
                </div>
                <div className="pt-1">
                  <div className={`text-sm font-semibold ${request.status === 'Approved' ? 'text-richgreen' : 'text-crimson'}`}>
                    {request.status}
                  </div>
                  <div className="text-xs text-slate mt-0.5">{formatDateTime(request.decidedAt)}</div>
                  {request.decisionNote && (
                    <div className="text-xs text-slate mt-1 italic">"{request.decisionNote}"</div>
                  )}
                </div>
              </li>
            ) : request.status === 'Cancelled' ? (
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-lockedbg border-2 border-lockedfg text-lockedfg flex items-center justify-center flex-shrink-0 z-10" aria-hidden="true">
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
              <li className="flex items-start gap-4 opacity-40">
                <div className="w-8 h-8 rounded-full bg-sage/30 border-2 border-sage text-slate flex items-center justify-center flex-shrink-0 z-10" aria-hidden="true">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-slate">Awaiting Decision</div>
                  <div className="text-xs text-slate mt-0.5">Approved / Rejected / Escalated</div>
                  <span className="inline-block mt-1.5 text-xs bg-umberbg text-umber font-bold px-2 py-0.5 rounded">Current</span>
                </div>
              </li>
            )}
          </ol>
        </div>
      </div>

      {/* Cancel section */}
      {canCancel && (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-2">Cancellation</h3>
          <p className="text-sm text-slate mb-4">
            {beforeStart
              ? 'You can cancel this request before it starts. Full balance will be restored (BL-019).'
              : 'This leave has already started. Only the remaining days will be restored on cancellation (BL-020).'}
          </p>
          <Button
            variant="destructive"
            size="md"
            onClick={() => setCancelOpen(true)}
          >
            Cancel Leave Request
          </Button>
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
    </div>
  );
}
