'use client';

/**
 * M-04 — Leave Request Detail (Manager)
 * Visual reference: prototype/manager/leave-detail.html
 *
 * Full detail + decision form on the same page.
 */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { LeaveApprovalActions } from '@/components/leave/LeaveApprovalActions';
import { useLeave } from '@/lib/hooks/useLeave';
import { LEAVE_STATUS, LEAVE_TYPE_MAP, ROUTED_TO } from '@/lib/status/maps';

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

export default function ManagerLeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: request, isLoading, error } = useLeave(Number(id));

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
          Could not load leave request.
        </div>
        <div className="mt-4">
          <Link href="/manager/leave-queue" className="text-sm text-forest hover:underline">
            Back to Leave Queue
          </Link>
        </div>
      </div>
    );
  }

  const isPending = request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Escalated;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Leave Request</h1>
        <div className="text-xs text-slate flex items-center gap-1 mt-0.5">
          <Link href="/manager/leave-queue" className="hover:text-forest transition-colors">
            Leave Queue
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">{request.code}</span>
        </div>
      </div>

      {/* Status banner */}
      <div className={`border rounded-xl px-6 py-4 mb-6 flex items-center gap-3 ${
        request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Escalated
          ? 'bg-umberbg border-umber/20'
          : request.status === LEAVE_STATUS.Approved
          ? 'bg-greenbg border-richgreen/20'
          : 'bg-crimsonbg border-crimson/20'
      }`}>
        <LeaveStatusBadge status={request.status} />
        <span className="text-sm text-charcoal font-medium ml-2">
          {request.employeeName} — {LEAVE_TYPE_MAP[request.leaveTypeId]?.label ?? request.leaveTypeName} Leave
        </span>
        <span className="ml-auto text-xs text-slate">{request.code}</span>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-sage/20">
          <h2 className="font-heading text-base font-semibold text-charcoal">Request Details</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Employee</div>
            <div className="text-sm font-semibold text-charcoal">{request.employeeName}</div>
            <div className="text-xs text-slate">{request.employeeCode}</div>
          </div>
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
              {request.days} day{request.days !== 1 ? 's' : ''}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Submitted</div>
            <div className="text-sm font-semibold text-charcoal">{formatDateTime(request.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Routing</div>
            <div className="text-sm font-semibold text-charcoal">{request.routedToId === ROUTED_TO.Admin ? 'Admin' : 'Manager'}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Reason</div>
            <div className="text-sm text-charcoal">{request.reason}</div>
          </div>
          {request.decisionNote && (
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Decision Note</div>
              <div className="text-sm text-charcoal">{request.decisionNote}</div>
            </div>
          )}
        </div>
      </div>

      {/* Escalation warning */}
      {request.escalatedAt && (
        <div className="bg-umberbg border border-umber/20 rounded-xl p-4 mb-5 text-sm text-umber">
          <span className="font-semibold">Escalated:</span> This request was escalated to Admin on{' '}
          {formatDateTime(request.escalatedAt)} because it was not actioned within 5 working days (BL-018).
        </div>
      )}

      {/* Approval actions */}
      {isPending && (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4">Decision</h3>
          <LeaveApprovalActions
            request={request}
            onDecision={() => router.push('/manager/leave-queue')}
          />
        </div>
      )}
    </>
  );
}
