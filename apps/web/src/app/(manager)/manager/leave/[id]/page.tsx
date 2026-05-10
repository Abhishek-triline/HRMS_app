'use client';

/**
 * Manager personal leave detail — reuses the same pattern as the employee
 * leave detail, just with manager-scoped paths.
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

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function isBeforeStart(fromDate: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(fromDate + 'T00:00:00') > today;
}

export default function ManagerLeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: request, isLoading, error } = useLeave(id);
  const cancelMutation = useCancelLeave(id);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function handleCancel(note: string) {
    if (!request) return;
    try {
      const result = await cancelMutation.mutateAsync({ version: request.version, note: note || undefined });
      toast.success('Leave cancelled', result.restoredDays > 0 ? `${result.restoredDays} days restored.` : 'No days restored.');
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
      setCancelOpen(false);
    } catch (err) {
      toast.error('Cancellation failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-20 p-8"><Spinner size="lg" /></div>;
  if (error || !request) return (
    <div className="p-8">
      <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-6 py-4 text-sm text-crimson" role="alert">Could not load leave request.</div>
      <Link href="/manager/leave" className="text-sm text-forest hover:underline mt-4 block">Back to My Leave</Link>
    </div>
  );

  const beforeStart = isBeforeStart(request.fromDate);
  const canCancel = (request.status === 'Pending' || request.status === 'Approved') && (beforeStart || request.status === 'Approved');

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6">
        <div className="text-xs text-slate flex items-center gap-1">
          <Link href="/manager/leave" className="hover:text-forest transition-colors">My Leave</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">{request.code}</span>
        </div>
      </div>

      <div className="bg-umberbg border border-umber/20 rounded-xl px-6 py-4 mb-6 flex items-center gap-3">
        <LeaveStatusBadge status={request.status} />
        <span className="text-sm text-charcoal ml-2">{request.type} Leave · {request.days} day{request.days !== 1 ? 's' : ''}</span>
        <span className="ml-auto text-xs text-slate">{request.code}</span>
      </div>

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
              {request.fromDate === request.toDate ? formatDate(request.fromDate) : `${formatDate(request.fromDate)} – ${formatDate(request.toDate)}`}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Days</div>
            <div className="text-sm font-semibold text-charcoal">{request.days}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-1">Status</div>
            <div className="mt-1"><LeaveStatusBadge status={request.status} /></div>
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

      {canCancel && (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-2">Cancellation</h3>
          <p className="text-sm text-slate mb-4">
            {beforeStart ? 'Full balance will be restored (BL-019).' : 'Only remaining days restored (BL-020).'}
          </p>
          <Button variant="destructive" size="md" onClick={() => setCancelOpen(true)}>
            Cancel Leave Request
          </Button>
        </div>
      )}

      {cancelOpen && (
        <CancelLeaveModal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} request={request} onConfirm={handleCancel} isLoading={cancelMutation.isPending} />
      )}
    </div>
  );
}
