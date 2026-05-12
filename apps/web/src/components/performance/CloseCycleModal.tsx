'use client';

/**
 * CloseCycleModal — two-step close confirmation. BL-041.
 *
 * User must type 'CLOSE' to enable submit.
 * Consequence callout states final rating lock and irreversibility.
 * Handles CYCLE_CLOSED cleanly if another admin closed first.
 */

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PerformanceCycle } from '@nexora/contracts/performance';

interface CloseCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycle: Pick<PerformanceCycle, 'id' | 'code' | 'version'>;
  onConfirm: (cycleId: number, version: number) => Promise<void>;
  isSubmitting?: boolean;
}

export function CloseCycleModal({
  isOpen,
  onClose,
  cycle,
  onConfirm,
  isSubmitting = false,
}: CloseCycleModalProps) {
  const [confirmText, setConfirmText] = useState('');

  const canSubmit = confirmText === 'CLOSE' && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await onConfirm(cycle.id, cycle.version);
    setConfirmText('');
    onClose();
  }

  function handleClose() {
    setConfirmText('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Close Cycle — ${cycle.code}`}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            form="close-cycle-form"
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            Close cycle permanently
          </Button>
        </>
      }
    >
      <form id="close-cycle-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Consequence callout */}
        <div className="bg-crimsonbg border border-crimson/30 rounded-lg px-4 py-3 flex items-start gap-2.5">
          <svg
            className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-crimson leading-relaxed">
            <strong>This action is irreversible (BL-041).</strong> Closing this cycle will lock all
            final ratings immediately. No edits — by any employee, manager, or admin — will be
            possible after closure. All pending self-ratings and manager ratings will be frozen
            in their current state.
          </p>
        </div>

        {/* Confirm input */}
        <div>
          <p className="text-sm text-slate mb-3">
            Type <strong className="text-charcoal font-mono">CLOSE</strong> to confirm:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type CLOSE to confirm"
            aria-label="Type CLOSE to confirm cycle closure"
            autoComplete="off"
          />
        </div>
      </form>
    </Modal>
  );
}
