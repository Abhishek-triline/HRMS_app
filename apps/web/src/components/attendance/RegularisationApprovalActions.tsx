'use client';

/**
 * RegularisationApprovalActions — Approve / Reject with consequence modal.
 *
 * Reject requires a note (TC-REG-005). The Modal component from Phase 0
 * handles focus-trapping and Escape-to-close.
 * VERSION_MISMATCH from the backend is surfaced as an error toast;
 * the query client is invalidated so the stale version is refreshed.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Modal, useModal } from '@/components/ui/Modal';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { useApproveRegularisation, useRejectRegularisation } from '@/lib/hooks/useRegularisations';

interface RegularisationApprovalActionsProps {
  regularisationId: number;
  version: number;
  /** Called after a successful decision so the parent can refresh/navigate */
  onDecision?: () => void;
}

const rejectSchema = z.object({
  note: z.string().min(3, 'Rejection note must be at least 3 characters.').max(500),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

export function RegularisationApprovalActions({
  regularisationId,
  version,
  onDecision,
}: RegularisationApprovalActionsProps) {
  const approveModal = useModal();
  const rejectModal = useModal();

  const approveMutation = useApproveRegularisation(regularisationId);
  const rejectMutation = useRejectRegularisation(regularisationId);

  const [approveNote, setApproveNote] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
  });

  const handleApprove = () => {
    approveMutation.mutate(
      { note: approveNote || undefined, version },
      {
        onSuccess: () => {
          approveModal.close();
          setApproveNote('');
          onDecision?.();
        },
      },
    );
  };

  const handleReject = handleSubmit((data) => {
    rejectMutation.mutate(
      { note: data.note, version },
      {
        onSuccess: () => {
          rejectModal.close();
          reset();
          onDecision?.();
        },
      },
    );
  });

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={approveModal.open}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={rejectModal.open}
          disabled={approveMutation.isPending || rejectMutation.isPending}
        >
          Reject
        </Button>
      </div>

      {/* Approve modal */}
      <Modal
        isOpen={approveModal.isOpen}
        onClose={approveModal.close}
        title="Approve Regularisation"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={approveModal.close} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={approveMutation.isPending}
            >
              Confirm Approval
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate mb-4">
          Approving this request will overlay a corrected attendance record. This action cannot be reversed.
        </p>
        <div>
          <Label htmlFor="approve-note">Note (optional)</Label>
          <textarea
            id="approve-note"
            rows={3}
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            maxLength={500}
            placeholder="Optional approval note…"
            className="mt-1 w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors resize-none"
          />
          <div className="text-xs text-slate text-right mt-0.5">{approveNote.length}/500</div>
        </div>
      </Modal>

      {/* Reject modal — consequence-stating, note REQUIRED */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={rejectModal.close}
        title="Reject Regularisation"
        size="sm"
        requireConfirm
        consequenceText="Rejecting will dismiss this regularisation request. The original attendance record will remain unchanged."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={rejectModal.close}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              loading={rejectMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <form onSubmit={handleReject} noValidate>
          <div>
            <Label htmlFor="reject-note">
              Rejection Note <span className="text-crimson" aria-hidden="true">*</span>
            </Label>
            <textarea
              id="reject-note"
              rows={3}
              {...register('note')}
              placeholder="State the reason for rejection (required)…"
              aria-required="true"
              aria-describedby={errors.note ? 'reject-note-error' : undefined}
              className="mt-1 w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors resize-none"
            />
            <FieldError id="reject-note-error" message={errors.note?.message} />
          </div>
        </form>
      </Modal>
    </>
  );
}
