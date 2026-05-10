'use client';

/**
 * ReassignManagerModal — pick new manager, effective date, optional note.
 *
 * Surfaces CIRCULAR_REPORTING (BL-005) inline against the manager field.
 * Surfaces VERSION_MISMATCH as a toast then closes.
 */

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { HierarchyPicker } from './HierarchyPicker';
import { useReassignManager } from '@/lib/hooks/useEmployees';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { EmployeeDetail } from '@nexora/contracts/employees';

const TODAY = new Date().toISOString().slice(0, 10);

interface ReassignManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeDetail;
}

export function ReassignManagerModal({ isOpen, onClose, employee }: ReassignManagerModalProps) {
  const [newManagerId, setNewManagerId] = useState<string | null>(
    employee.reportingManagerId ?? null,
  );
  const [effectiveDate, setEffectiveDate] = useState(TODAY);
  const [note, setNote] = useState('');
  const [circularError, setCircularError] = useState('');
  const [dateError, setDateError] = useState('');

  const reassign = useReassignManager(employee.id);

  function handleClose() {
    setNewManagerId(employee.reportingManagerId ?? null);
    setEffectiveDate(TODAY);
    setNote('');
    setCircularError('');
    setDateError('');
    onClose();
  }

  async function handleSubmit() {
    if (!effectiveDate) {
      setDateError('Effective date is required.');
      return;
    }
    setCircularError('');
    setDateError('');

    try {
      await reassign.mutateAsync({
        newManagerId,
        effectiveDate,
        note: note.trim() || undefined,
        version: employee.version,
      });
      showToast({
        type: 'success',
        title: 'Manager reassigned',
        message: `${employee.name} now reports to ${newManagerId ? 'the selected manager' : 'no one (top of tree)'}.`,
      });
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CIRCULAR_REPORTING') {
          setCircularError(
            `BL-005: A manager cannot, directly or indirectly, report to anyone in their own subtree. ${
              (err.details as { path?: string })?.path
                ? `Conflict path: ${(err.details as { path: string }).path}`
                : ''
            }`,
          );
        } else if (err.code === 'VERSION_MISMATCH') {
          showToast({
            type: 'error',
            title: 'Record was updated by someone else',
            message: 'Reloading the latest data…',
          });
          handleClose();
        } else {
          showToast({ type: 'error', title: 'Reassignment failed', message: err.message });
        }
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reassign Reporting Manager"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={reassign.isPending}>
            Cancel
          </Button>
          <Button variant="primary" loading={reassign.isPending} onClick={handleSubmit}>
            Reassign Manager
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate">
          Reassigning reporting manager for{' '}
          <span className="font-semibold text-charcoal">{employee.name}</span>.
          Current manager:{' '}
          <span className="font-semibold">
            {employee.reportingManagerName ?? 'None (top of tree)'}
          </span>
        </p>

        {/* Manager picker */}
        <div className="relative">
          <HierarchyPicker
            value={newManagerId}
            onChange={(id) => {
              setNewManagerId(id);
              setCircularError('');
            }}
            excludeId={employee.id}
            label="New Reporting Manager"
            error={circularError || undefined}
          />

          {/* Circular reporting error block */}
          {circularError && (
            <div className="mt-2 bg-crimsonbg border border-crimson/30 rounded-lg px-4 py-3 flex items-start gap-2">
              <svg
                className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-xs text-crimson leading-relaxed">{circularError}</p>
            </div>
          )}
        </div>

        {/* Effective date */}
        <div>
          <Label htmlFor="reassign-effective-date" required>
            Effective Date
          </Label>
          <input
            id="reassign-effective-date"
            type="date"
            value={effectiveDate}
            onChange={(e) => {
              setEffectiveDate(e.target.value);
              setDateError('');
            }}
            className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
          />
          <FieldError id="reassign-date-error" message={dateError} />
        </div>

        {/* Note */}
        <div>
          <Label htmlFor="reassign-note">Note (optional)</Label>
          <textarea
            id="reassign-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Reason for reassignment…"
            className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition resize-none"
          />
          <p className="text-xs text-slate mt-0.5 text-right">{note.length}/500</p>
        </div>

        {/* Pending approvals info */}
        <div className="bg-softmint border border-mint rounded-lg px-4 py-3 text-xs text-forest leading-relaxed">
          <span className="font-semibold">BL-022:</span> Pending leave/regularisation approvals from this employee will continue routing to their previous manager until resolved. If the employee exits, they route to Admin.
        </div>
      </div>
    </Modal>
  );
}
