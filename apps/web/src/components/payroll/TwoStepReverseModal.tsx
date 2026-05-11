'use client';

/**
 * TwoStepReverseModal — destructive confirmation for payroll run reversal.
 *
 * BL-032: Reversal creates a NEW reversal record; original run is never modified.
 * BL-033: Admin-only. The UI hides this modal from non-Admin roles; the backend
 *          enforces the role check on the POST endpoint.
 *
 * Requirements:
 * 1. User must type the literal word "REVERSE" (case-sensitive).
 * 2. User must supply a reason (min 10 chars, max 2000 chars).
 * 3. Both conditions must be met before Submit enables.
 * 4. Focus is trapped. The confirm input is auto-focused on open.
 */

import { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { MoneyDisplay } from './MoneyDisplay';
import { useReverseRun } from '@/lib/hooks/usePayroll';
import { ApiError } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';
import type { PayrollRun } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MIN_REASON = 10;
const MAX_REASON = 2000;

interface TwoStepReverseModalProps {
  run: PayrollRun;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TwoStepReverseModal({
  run,
  isOpen,
  onClose,
  onSuccess,
}: TwoStepReverseModalProps) {
  const [confirmValue, setConfirmValue] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useReverseRun(run.id);

  const isConfirmMatch = confirmValue === 'REVERSE';
  const isReasonValid = reason.trim().length >= MIN_REASON;
  const canSubmit = isConfirmMatch && isReasonValid && !mutation.isPending;

  useEffect(() => {
    if (isOpen) {
      setConfirmValue('');
      setReason('');
      setReasonError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  function validateReason() {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON) {
      setReasonError(`Reason must be at least ${MIN_REASON} characters.`);
    } else {
      setReasonError('');
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({ confirm: 'REVERSE', reason: reason.trim() });
      showToast({
        type: 'success',
        title: 'Run reversed',
        message: `A reversal record has been created for ${MONTH_NAMES[run.month]} ${run.year}.`,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Reversal failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  const monthLabel = `${MONTH_NAMES[run.month]} ${run.year}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reverse Payroll Run — ${monthLabel}`}
      size="lg"
    >
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Run Code', value: run.code },
          { label: 'Employees', value: run.employeeCount.toString() },
          { label: 'Net Paid', value: <MoneyDisplay paise={run.totalNetPaise} /> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-offwhite rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-slate uppercase tracking-wide">{label}</p>
            <p className="text-base font-bold text-charcoal mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Consequence callout — BL-032 / BL-033 */}
      <div className="bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 flex items-start gap-2.5 mb-5">
        <svg className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-crimson">
          <strong>Admin-only action.</strong> A new reversal payroll run will be created with
          negative values (BL-032). The original run remains unchanged and visible in history.
          This action is audit-logged and cannot be undone (BL-033). Only initiate if the
          original run contained errors requiring correction.
        </p>
      </div>

      {/* Reason textarea */}
      <div className="mb-4">
        <label
          htmlFor="reverse-reason"
          className="block text-sm font-semibold text-charcoal mb-1.5"
        >
          Reversal Reason <span className="text-crimson" aria-hidden="true">*</span>
        </label>
        <textarea
          id="reverse-reason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={validateReason}
          maxLength={MAX_REASON}
          className={clsx(
            'w-full border rounded-lg px-3 py-2.5 text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-forest/20 transition',
            reasonError ? 'border-crimson focus:ring-crimson/20' : 'border-sage/60',
          )}
          placeholder="Describe clearly why this run is being reversed…"
          aria-required="true"
          aria-describedby="reverse-reason-counter reverse-reason-error"
        />
        <div className="flex items-center justify-between mt-1">
          <FieldError id="reverse-reason-error" message={reasonError} />
          <p id="reverse-reason-counter" className="text-xs text-slate ml-auto">
            {reason.length} / {MAX_REASON}
          </p>
        </div>
      </div>

      {/* Confirm input */}
      <div className="mb-5">
        <label
          htmlFor="reverse-confirm"
          className="block text-sm font-semibold text-charcoal mb-1.5"
        >
          Type{' '}
          <code className="font-mono bg-offwhite px-1.5 py-0.5 rounded text-crimson text-xs">
            REVERSE
          </code>{' '}
          to confirm <span className="text-crimson" aria-hidden="true">*</span>
        </label>
        <input
          ref={inputRef}
          id="reverse-confirm"
          type="text"
          autoComplete="off"
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) void handleSubmit(); }}
          className={clsx(
            'w-full border rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest',
            'focus:outline-none focus:ring-2 transition',
            isConfirmMatch
              ? 'border-crimson focus:ring-crimson/20 text-crimson'
              : 'border-sage/60 focus:ring-forest/20 text-charcoal',
          )}
          placeholder="REVERSE"
          aria-required="true"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-5 border-t border-sage/20">
        <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={mutation.isPending}
        >
          Reverse Run
        </Button>
      </div>
    </Modal>
  );
}
