'use client';

/**
 * TwoStepFinaliseModal — destructive confirmation for payroll run finalisation.
 *
 * BL-034 requirements:
 * 1. Shows the full run summary (employee count, gross, LOP, tax, net).
 * 2. User must type the literal word "FINALISE" before the Submit button enables.
 * 3. On 409 RUN_ALREADY_FINALISED: renders a named inline conflict block with
 *    the winner's name + timestamp; adds a "Reload" button that invalidates the
 *    run query and closes the modal.
 * 4. Focus is trapped. The confirm input is auto-focused on open.
 *
 * This modal does NOT manage its own open state — the parent controls isOpen/onClose.
 */

import { useRef, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MoneyDisplay } from './MoneyDisplay';
import { useFinaliseRun } from '@/lib/hooks/usePayroll';
import { qk } from '@/lib/api/query-keys';
import { ApiError } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';
import type { PayrollRun } from '@nexora/contracts/payroll';
import type { RunAlreadyFinalisedDetails } from '@nexora/contracts/payroll';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface TwoStepFinaliseModalProps {
  run: PayrollRun;
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful finalisation to navigate/refresh parent. */
  onSuccess?: () => void;
}

export function TwoStepFinaliseModal({
  run,
  isOpen,
  onClose,
  onSuccess,
}: TwoStepFinaliseModalProps) {
  const [confirmValue, setConfirmValue] = useState('');
  const [conflictDetails, setConflictDetails] = useState<RunAlreadyFinalisedDetails | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const mutation = useFinaliseRun(run.id);

  const isMatch = confirmValue === 'FINALISE';

  // Auto-focus the confirm input when modal opens; reset state.
  useEffect(() => {
    if (isOpen) {
      setConfirmValue('');
      setConflictDetails(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  async function handleSubmit() {
    if (!isMatch) return;
    try {
      await mutation.mutateAsync({ confirm: 'FINALISE', version: run.version });
      showToast({
        type: 'success',
        title: 'Run finalised',
        message: `${MONTH_NAMES[run.month]} ${run.year} payroll is now locked.`,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RUN_ALREADY_FINALISED') {
        // BL-034: render the named conflict block inside the modal.
        const details = err.details as RunAlreadyFinalisedDetails | undefined;
        if (details) {
          setConflictDetails(details);
        } else {
          setConflictDetails({ winnerId: 0, winnerName: 'Another user', winnerAt: new Date().toISOString() });
        }
      } else {
        showToast({
          type: 'error',
          title: 'Finalisation failed',
          message: err instanceof ApiError ? err.message : 'Please try again.',
        });
      }
    }
  }

  function handleReload() {
    void queryClient.invalidateQueries({ queryKey: qk.payroll.run(run.id) });
    onClose();
  }

  const monthLabel = `${MONTH_NAMES[run.month]} ${run.year}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Finalise Payroll — ${monthLabel}`}
      size="lg"
    >
      {/* Run summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Employees', value: run.employeeCount.toString() },
          { label: 'Gross Total', value: <MoneyDisplay paise={run.totalGrossPaise} /> },
          { label: 'Total Tax', value: <MoneyDisplay paise={run.totalTaxPaise} /> },
          { label: 'Net Total', value: <MoneyDisplay paise={run.totalNetPaise} /> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-offwhite rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-slate uppercase tracking-wide">{label}</p>
            <p className="text-base font-bold text-charcoal mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Consequence callout — BL-034 */}
      <div className="bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 flex items-start gap-2.5 mb-5">
        <svg className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-crimson">
          <strong>This action is irreversible.</strong> Finalising locks all payslips permanently.
          Corrections require an Admin-initiated reversal that creates a new record. Exactly one
          concurrent finalise attempt will succeed.
        </p>
      </div>

      {/* Concurrent-finalisation conflict block — BL-034 */}
      {conflictDetails && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-umberbg border border-umber/30 rounded-lg px-4 py-3 mb-5"
        >
          <p className="text-sm font-semibold text-umber">
            Run already finalised by{' '}
            <strong>{conflictDetails.winnerName}</strong> at{' '}
            {new Date(conflictDetails.winnerAt).toLocaleString('en-IN')}.
          </p>
          <p className="text-xs text-umber/80 mt-1">
            Reload to view the latest state.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={handleReload}
          >
            Reload run
          </Button>
        </div>
      )}

      {/* Confirm input */}
      {!conflictDetails && (
        <div>
          <label
            htmlFor="finalise-confirm"
            className="block text-sm font-semibold text-charcoal mb-1.5"
          >
            Type{' '}
            <code className="font-mono bg-offwhite px-1.5 py-0.5 rounded text-forest text-xs">
              FINALISE
            </code>{' '}
            to confirm <span className="text-crimson" aria-hidden="true">*</span>
          </label>
          <input
            ref={inputRef}
            id="finalise-confirm"
            type="text"
            autoComplete="off"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && isMatch) void handleSubmit(); }}
            className={clsx(
              'w-full border rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest',
              'focus:outline-none focus:ring-2 transition',
              isMatch
                ? 'border-richgreen focus:ring-richgreen/20 text-richgreen'
                : 'border-sage/60 focus:ring-forest/20 text-charcoal',
            )}
            placeholder="FINALISE"
            aria-required="true"
            aria-describedby="finalise-hint"
          />
          <p id="finalise-hint" className="text-xs text-slate mt-1.5">
            Case-sensitive. The Submit button enables only when the word matches exactly.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-sage/20">
        <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        {!conflictDetails && (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isMatch || mutation.isPending}
            loading={mutation.isPending}
          >
            Finalise Run
          </Button>
        )}
      </div>
    </Modal>
  );
}
