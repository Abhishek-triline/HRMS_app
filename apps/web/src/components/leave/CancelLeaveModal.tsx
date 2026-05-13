'use client';

/**
 * CancelLeaveModal — confirmation modal for leave cancellation.
 *
 * Shows the restored-days preview based on the request's status and dates
 * (BL-019/020). Full restore if cancelled before start; partial if after.
 */

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { LeaveRequest } from '@nexora/contracts/leave';

interface CancelLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest;
  onConfirm: (note: string) => Promise<void>;
  isLoading: boolean;
}

function isBeforeStart(fromDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(fromDate + 'T00:00:00');
  return start > today;
}

export function CancelLeaveModal({
  isOpen,
  onClose,
  request,
  onConfirm,
  isLoading,
}: CancelLeaveModalProps) {
  const [note, setNote] = useState('');
  const beforeStart = isBeforeStart(request.fromDate);

  async function handleConfirm() {
    await onConfirm(note);
    setNote('');
  }

  const restoreHint = beforeStart
    ? `All ${request.days} day${request.days !== 1 ? 's' : ''} will be restored to your balance.`
    : `Only the remaining days (from today onwards) will be restored. Days already taken will not be returned.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Leave Request"
      requireConfirm
      consequenceText={`This will cancel request ${request.code} (${request.leaveTypeName} leave, ${request.fromDate}${request.toDate !== request.fromDate ? ` – ${request.toDate}` : ''}). ${restoreHint}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Keep Request
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={isLoading}
            onClick={handleConfirm}
          >
            Cancel Leave
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-softmint rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate">Leave type</span>
            <span className="font-semibold text-charcoal">{request.leaveTypeName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Duration</span>
            <span className="font-semibold text-charcoal">
              {request.days} day{request.days !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Status</span>
            <StatusBadge entity="leaveStatus" code={request.status} />
          </div>
        </div>

        {/* Balance restore preview */}
        <div
          className={`rounded-lg p-4 text-sm ${beforeStart ? 'bg-greenbg' : 'bg-umberbg'}`}
        >
          <div className={`font-semibold mb-1 ${beforeStart ? 'text-richgreen' : 'text-umber'}`}>
            {beforeStart ? 'Full balance restore' : 'Partial balance restore'}
          </div>
          <div className={`text-xs ${beforeStart ? 'text-richgreen/80' : 'text-umber/80'}`}>
            {restoreHint}
          </div>
        </div>

        {/* Optional note */}
        <div>
          <Label htmlFor="cancel-note">Cancellation Note (optional)</Label>
          <textarea
            id="cancel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Reason for cancellation..."
            className="w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors resize-none mt-1"
          />
          <div className="text-xs text-slate mt-1 text-right">{note.length}/500</div>
        </div>
      </div>
    </Modal>
  );
}
