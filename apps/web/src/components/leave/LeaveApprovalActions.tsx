'use client';

/**
 * LeaveApprovalActions — Approve / Reject buttons with consequence-stating modal.
 *
 * Reject requires a note (REQUIRED per RejectLeaveRequestSchema).
 * Uses React Hook Form + zod for reject modal validation.
 * On VERSION_MISMATCH: shows toast and invalidates the query.
 *
 * v2: request.status is an INT code (1=Pending, 5=Escalated), request.type → request.leaveTypeName.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

import { Modal, useModal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { useApproveLeave, useRejectLeave } from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import { qk } from '@/lib/api/query-keys';
import { LEAVE_STATUS } from '@/lib/status/maps';
import type { LeaveRequest } from '@nexora/contracts/leave';

// ── Reject form schema ────────────────────────────────────────────────────────

const RejectFormSchema = z.object({
  note: z.string().min(3, 'Rejection note must be at least 3 characters').max(500),
});
type RejectFormValues = z.infer<typeof RejectFormSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeaveApprovalActionsProps {
  request: LeaveRequest;
  /** Badge label shown in the admin queue (e.g. 'Admin') */
  actorLabel?: string;
  /** Called after a successful decision so the page can navigate/refresh */
  onDecision?: () => void;
}

export function LeaveApprovalActions({
  request,
  actorLabel,
  onDecision,
}: LeaveApprovalActionsProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const approveModal = useModal();
  const rejectModal = useModal();

  const approveMutation = useApproveLeave(request.id);
  const rejectMutation = useRejectLeave(request.id);

  const [approveNote, setApproveNote] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: rejectErrors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(RejectFormSchema),
  });

  function handleVersionMismatch(id: number) {
    toast.error(
      'Request was modified',
      'This request was modified by someone else. Reloading…',
    );
    queryClient.invalidateQueries({ queryKey: qk.leave.detail(id) });
    queryClient.invalidateQueries({ queryKey: qk.leave.all() });
  }

  async function handleApprove() {
    try {
      await approveMutation.mutateAsync({
        version: request.version,
        note: approveNote || undefined,
      });
      toast.success('Leave approved', `Request ${request.code} has been approved.`);
      approveModal.close();
      onDecision?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.VERSION_MISMATCH) {
        handleVersionMismatch(request.id);
        approveModal.close();
        return;
      }
      toast.error('Approval failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  async function handleReject(values: RejectFormValues) {
    try {
      await rejectMutation.mutateAsync({
        note: values.note,
        version: request.version,
      });
      toast.success('Leave rejected', `Request ${request.code} has been rejected.`);
      rejectModal.close();
      reset();
      onDecision?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.VERSION_MISMATCH) {
        handleVersionMismatch(request.id);
        rejectModal.close();
        return;
      }
      toast.error('Rejection failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  const isPending =
    request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Escalated;
  if (!isPending) return null;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {actorLabel && (
          <span className="text-xs bg-softmint text-forest font-bold px-2 py-0.5 rounded-full">
            {actorLabel}
          </span>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={approveModal.open}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          size="md"
          onClick={rejectModal.open}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        >
          Reject
        </Button>
      </div>

      {/* Approve confirmation modal */}
      <Modal
        isOpen={approveModal.isOpen}
        onClose={approveModal.close}
        title="Approve Leave Request"
        requireConfirm
        consequenceText={`You are approving ${request.code} (${request.leaveTypeName} leave, ${request.days} day${request.days !== 1 ? 's' : ''} for ${request.employeeName}). The balance will be deducted immediately on approval.`}
        footer={
          <>
            <Button variant="secondary" onClick={approveModal.close} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={approveMutation.isPending}
              onClick={handleApprove}
            >
              Confirm Approval
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-softmint rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate">Employee</span>
              <span className="font-semibold text-charcoal">{request.employeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Leave type</span>
              <span className="font-semibold text-charcoal">{request.leaveTypeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Duration</span>
              <span className="font-semibold text-charcoal">{request.days} day{request.days !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="approve-note">Approval Note (optional)</Label>
            <textarea
              id="approve-note"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Optional note..."
              className="w-full border border-sage rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors resize-none mt-1"
            />
          </div>
        </div>
      </Modal>

      {/* Reject confirmation modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => { rejectModal.close(); reset(); }}
        title="Reject Leave Request"
        requireConfirm
        consequenceText={`You are rejecting ${request.code} for ${request.employeeName}. The employee will be notified. A rejection note is required.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { rejectModal.close(); reset(); }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={rejectMutation.isPending}
              onClick={handleSubmit(handleReject)}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(handleReject)} noValidate className="space-y-4">
          <div className="bg-softmint rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate">Employee</span>
              <span className="font-semibold text-charcoal">{request.employeeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Leave type</span>
              <span className="font-semibold text-charcoal">{request.leaveTypeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Duration</span>
              <span className="font-semibold text-charcoal">{request.days} day{request.days !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="reject-note" required>
              Rejection Note
            </Label>
            <textarea
              id="reject-note"
              rows={3}
              aria-required="true"
              aria-describedby={rejectErrors.note ? 'reject-note-error' : undefined}
              placeholder="State the reason for rejection (required)..."
              className={`w-full border rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors resize-none mt-1 ${rejectErrors.note ? 'border-crimson' : 'border-sage'}`}
              {...register('note')}
            />
            {rejectErrors.note && (
              <FieldError id="reject-note-error" message={rejectErrors.note.message ?? 'Required'} />
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
