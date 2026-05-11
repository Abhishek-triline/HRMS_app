'use client';

/**
 * A-06 Detail — Leave Request Detail (Admin)
 * Same UI as M-04 with "Admin" badge.
 */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { LeaveApprovalActions } from '@/components/leave/LeaveApprovalActions';
import { useLeave } from '@/lib/hooks/useLeave';

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

export default function AdminLeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: request, isLoading, error } = useLeave(id);

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
          <Link href="/admin/leave-queue" className="text-sm text-forest hover:underline">
            Back to Leave Approvals
          </Link>
        </div>
      </div>
    );
  }

  const isPending = request.status === 'Pending' || request.status === 'Escalated';

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Leave Request</h1>
        <div className="text-xs text-slate flex items-center gap-1 mt-0.5">
          <Link href="/admin/leave-queue" className="hover:text-forest transition-colors">
            Leave Approvals
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">{request.code}</span>
        </div>
      </div>

      {/* Status banner with Admin badge */}
      <div className={`border rounded-xl px-6 py-4 mb-6 flex items-center gap-3 ${
        request.status === 'Pending' || request.status === 'Escalated'
          ? 'bg-umberbg border-umber/20'
          : request.status === 'Approved'
          ? 'bg-greenbg border-richgreen/20'
          : 'bg-crimsonbg border-crimson/20'
      }`}>
        <LeaveStatusBadge status={request.status} />
        <span className="text-sm text-charcoal font-medium ml-2">
          {request.employeeName} — {request.type} Leave
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-forest text-white font-bold px-2 py-0.5 rounded-full">Admin</span>
          <span className="text-xs text-slate">{request.code}</span>
        </span>
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
            <div className="text-sm font-semibold text-charcoal flex items-center gap-2">
              {request.type} Leave
              {(request.type === 'Maternity' || request.type === 'Paternity') && (
                <span className="text-xs bg-softmint text-forest font-bold px-1.5 py-0.5 rounded">Event-based</span>
              )}
            </div>
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
            <div className="text-sm font-semibold text-charcoal">{request.routedTo}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Reason</div>
            <div className="text-sm text-charcoal">{request.reason}</div>
          </div>
          {request.escalatedAt && (
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Escalated At</div>
              <div className="text-sm text-umber font-semibold">{formatDateTime(request.escalatedAt)}</div>
              <div className="text-xs text-slate mt-0.5">Manager did not respond within 5 working days (BL-018)</div>
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

      {/* Approval actions */}
      {isPending && (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4">Admin Decision</h3>
          <LeaveApprovalActions
            request={request}
            actorLabel="Admin"
            onDecision={() => router.push('/admin/leave-queue')}
          />
        </div>
      )}
    </>
  );
}
