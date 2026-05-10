'use client';

/**
 * StatusChangeModal — destructive modal for On-Notice / Exited / Active transitions.
 *
 * Shows consequence callout text per target status (BL-006).
 * Active option only appears when current status is On-Notice (revert path).
 * Refuses On-Leave (system-set only).
 *
 * Consumes useChangeStatus(id) and surfaces API errors via toast.
 */

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { useChangeStatus } from '@/lib/hooks/useEmployees';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { EmployeeStatus } from '@nexora/contracts/common';
import type { EmployeeDetail } from '@nexora/contracts/employees';

const TODAY = new Date().toISOString().slice(0, 10);

const CONSEQUENCE: Record<'On-Notice' | 'Exited' | 'Active', string> = {
  'On-Notice':
    'Employee will be placed on a notice period. Pending leave approvals route to Admin if no manager is assigned. Active sessions remain valid until the employee logs out.',
  Exited:
    'Employee access will be revoked on the effective date. All future approvals route to Admin. Historical records are preserved per BL-007. This cannot be reversed — use "Active" (revert from On-Notice) if this was set in error.',
  Active:
    'Employee will revert from On-Notice to Active status. This only applies when the employee is currently On-Notice.',
};

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeDetail;
}

type AllowedStatus = 'On-Notice' | 'Exited' | 'Active';

function getAllowedTransitions(current: EmployeeStatus): AllowedStatus[] {
  switch (current) {
    case 'Active':
      return ['On-Notice', 'Exited'];
    case 'On-Notice':
      return ['Active', 'Exited'];
    case 'Exited':
      return []; // No transitions from Exited
    case 'On-Leave':
    case 'Inactive':
      return ['On-Notice', 'Exited'];
    default:
      return [];
  }
}

export function StatusChangeModal({ isOpen, onClose, employee }: StatusChangeModalProps) {
  const [targetStatus, setTargetStatus] = useState<AllowedStatus | ''>('');
  const [effectiveDate, setEffectiveDate] = useState(TODAY);
  const [exitDate, setExitDate] = useState('');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');

  const changeStatus = useChangeStatus(employee.id);
  const allowed = getAllowedTransitions(employee.status);

  function handleClose() {
    setTargetStatus('');
    setEffectiveDate(TODAY);
    setExitDate('');
    setNote('');
    setFieldError('');
    onClose();
  }

  async function handleSubmit() {
    if (!targetStatus) {
      setFieldError('Please select a target status.');
      return;
    }
    if (!effectiveDate) {
      setFieldError('Effective date is required.');
      return;
    }
    if (targetStatus === 'Exited' && !exitDate) {
      setFieldError('Exit date is required when status is Exited.');
      return;
    }
    setFieldError('');

    try {
      await changeStatus.mutateAsync({
        status: targetStatus,
        effectiveDate,
        exitDate: targetStatus === 'Exited' ? exitDate : undefined,
        note: note.trim() || undefined,
        version: employee.version,
      });
      showToast({
        type: 'success',
        title: 'Status updated',
        message: `${employee.name} is now ${targetStatus}.`,
      });
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VERSION_MISMATCH') {
          showToast({
            type: 'error',
            title: 'Record was updated by someone else',
            message: 'Reloading the latest data…',
          });
          handleClose();
        } else {
          showToast({ type: 'error', title: 'Failed to change status', message: err.message });
        }
      }
    }
  }

  const consequence = targetStatus ? CONSEQUENCE[targetStatus] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Employee Status"
      size="md"
      requireConfirm={Boolean(consequence && targetStatus === 'Exited')}
      consequenceText={targetStatus === 'Exited' ? consequence ?? undefined : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={changeStatus.isPending}>
            Cancel
          </Button>
          <Button
            variant={targetStatus === 'Exited' ? 'destructive' : 'primary'}
            loading={changeStatus.isPending}
            onClick={handleSubmit}
            disabled={!targetStatus}
          >
            Apply Status Change
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate">
          Current status:{' '}
          <span className="font-semibold text-charcoal">{employee.status}</span>
        </p>

        {allowed.length === 0 ? (
          <p className="text-sm text-slate bg-offwhite rounded-lg px-4 py-3">
            No manual status transitions are available from <strong>{employee.status}</strong>.
          </p>
        ) : (
          <>
            <div>
              <Label htmlFor="target-status" required>
                New Status
              </Label>
              <select
                id="target-status"
                value={targetStatus}
                onChange={(e) => {
                  setTargetStatus(e.target.value as AllowedStatus | '');
                  setFieldError('');
                }}
                className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
              >
                <option value="">Select status…</option>
                {allowed.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FieldError id="target-status-error" message={fieldError} />
            </div>

            {consequence && targetStatus !== 'Exited' && (
              <div className="bg-softmint border border-mint rounded-lg px-4 py-3 text-xs text-forest leading-relaxed">
                {consequence}
              </div>
            )}

            <div>
              <Label htmlFor="effective-date" required>
                Effective Date
              </Label>
              <input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                min={TODAY}
                className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
              />
            </div>

            {targetStatus === 'Exited' && (
              <div>
                <Label htmlFor="exit-date" required>
                  Last Working Day (Exit Date)
                </Label>
                <input
                  id="exit-date"
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
                />
              </div>
            )}

            <div>
              <Label htmlFor="status-note">Admin Note (optional)</Label>
              <textarea
                id="status-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Reason for status change…"
                className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition resize-none"
              />
              <p className="text-xs text-slate mt-0.5 text-right">{note.length}/500</p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
