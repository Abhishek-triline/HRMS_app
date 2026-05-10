'use client';

/**
 * AdminSelfProfileEditor — BL-004 self-service profile editing for Admin role.
 *
 * BL-004: Admin may update their own employee record. Every change is written
 * to the audit log against the actor's own ID and timestamp (BL-047).
 * This action emits an `employee.profile.self-update` audit row with actor=self.
 *
 * API contract: PATCH /api/v1/employees/{id}  (existing endpoint)
 *
 * Fields exposed in self-edit mode (per task spec):
 *   - name, designation, department  (available in current UpdateEmployeeRequest)
 *
 * API GAP (flag for team-lead): The prototype and task spec call for phone,
 * address line 1/2/city/state/pincode, emergency contact, and DOB fields on
 * self-edit. These fields do NOT exist in the current UpdateEmployeeRequest
 * contract (packages/contracts/src/employees.ts). They are shown as
 * "coming soon" placeholders in this component until the API contract is
 * extended. Tracked as open question in handoff notes.
 *
 * Read-only (locked) fields not shown in self-edit:
 *   EMP code, hire date, employment type, salary, status, reporting manager.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { useUpdateEmployee } from '@/lib/hooks/useEmployees';
import { ApiError } from '@/lib/api/client';
import type { EmployeeDetail } from '@nexora/contracts/employees';

// ── Schema — subset of UpdateEmployeeRequest safe for self-edit ───────────────

const SelfEditSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(200)
    .regex(/^[^\x00-\x08\x0A-\x1F\x7F]*$/u, 'Name must not contain control characters'),
  designation: z.string().min(1, 'Designation is required').max(150),
  department: z.string().min(1, 'Department is required').max(100),
  version: z.number().int().nonnegative(),
});

type SelfEditValues = z.infer<typeof SelfEditSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdminSelfProfileEditorProps {
  employee: EmployeeDetail;
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminSelfProfileEditor({ employee, onSuccess }: AdminSelfProfileEditorProps) {
  const updateEmployee = useUpdateEmployee(employee.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SelfEditValues>({
    resolver: zodResolver(SelfEditSchema),
    defaultValues: {
      name: employee.name,
      designation: employee.designation ?? '',
      department: employee.department ?? '',
      version: employee.version,
    },
  });

  // Re-sync if the employee record is refreshed externally (e.g. after save)
  useEffect(() => {
    reset({
      name: employee.name,
      designation: employee.designation ?? '',
      department: employee.department ?? '',
      version: employee.version,
    });
  }, [employee, reset]);

  async function onSubmit(values: SelfEditValues) {
    /**
     * BL-004: Admin self-update.
     * This PATCH call emits an `employee.profile.self-update` audit row
     * on the server side with actor = the admin's own employee ID (BL-047).
     * Salary edits apply from the next payroll run only — historical
     * payslips remain immutable (BL-030).
     */
    try {
      await updateEmployee.mutateAsync(values);
      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your changes have been saved and written to the audit log.',
      });
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VERSION_MISMATCH') {
          showToast({
            type: 'error',
            title: 'Record was updated elsewhere',
            message: 'The page will refresh with the latest data.',
          });
        } else {
          showToast({ type: 'error', title: 'Update failed', message: err.message });
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

      {/* Editable notice */}
      <div className="bg-mint/40 border border-emerald/30 rounded-xl px-5 py-3 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-emerald shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <div className="text-sm text-charcoal">
          <span className="font-semibold">Editable record.</span>{' '}
          As Admin you can edit your own employee record (A-04 / BL-004). Every change is
          written to the audit log against your name and timestamp (BL-047). Salary edits
          apply from the <span className="font-semibold">next payroll run</span> only —
          historical payslips remain immutable (BL-030).
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-base font-semibold text-charcoal">
            Personal Information
          </h3>
          <span className="text-[11px] text-slate">Editable fields</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              {...register('name')}
              label="Full Name"
              required
              error={errors.name?.message}
              maxLength={200}
            />
          </div>
          <div>
            <Input
              {...register('designation')}
              label="Designation / Job Title"
              required
              error={errors.designation?.message}
              maxLength={150}
            />
          </div>
          <div>
            <Input
              {...register('department')}
              label="Department"
              required
              error={errors.department?.message}
              maxLength={100}
            />
          </div>
        </div>

        {/*
          API GAP — phone / address / emergency contact / DOB fields are not yet
          in the UpdateEmployeeRequest contract. They will appear here once the
          API contract is extended to include them. See handoff open questions.
        */}
        <div className="mt-4 rounded-lg bg-offwhite border border-sage/30 px-4 py-3">
          <p className="text-xs text-slate">
            <span className="font-medium text-charcoal">Coming soon:</span>{' '}
            Phone, address, emergency contact, and date-of-birth fields will be
            editable once the backend contract is extended (open question — see
            handoff notes).
          </p>
        </div>
      </div>

      {/* Read-only: Job Details */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-base font-semibold text-charcoal">Job Details</h3>
          <span className="text-[11px] text-slate">EMP code is permanent (BL-008)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">EMP Code</label>
            <input
              type="text"
              value={employee.code}
              readOnly
              disabled
              className="w-full border border-sage/40 rounded-lg px-3 py-2 text-sm bg-offwhite text-slate font-mono cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Work Email</label>
            <input
              type="email"
              value={employee.email}
              readOnly
              disabled
              className="w-full border border-sage/40 rounded-lg px-3 py-2 text-sm bg-offwhite text-slate cursor-not-allowed"
            />
            <p className="text-[10px] text-slate mt-1">
              Email cannot be changed after creation.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Employment Type</label>
            <input
              type="text"
              value={employee.employmentType}
              readOnly
              disabled
              className="w-full border border-sage/40 rounded-lg px-3 py-2 text-sm bg-offwhite text-slate cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Joining Date</label>
            <input
              type="text"
              value={employee.joinDate ?? '—'}
              readOnly
              disabled
              className="w-full border border-sage/40 rounded-lg px-3 py-2 text-sm bg-offwhite text-slate cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Status</label>
            <input
              type="text"
              value={employee.status}
              readOnly
              disabled
              className="w-full border border-sage/40 rounded-lg px-3 py-2 text-sm bg-offwhite text-slate cursor-not-allowed"
            />
            <p className="text-[10px] text-slate mt-1">
              On-Leave is set automatically by the system (BL-006). Manual transitions
              go through Employee Detail.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">
              Reporting Manager
            </label>
            <input
              type="text"
              value={employee.reportingManagerName ?? '— None (top of org tree)'}
              readOnly
              disabled
              className="w-full border border-sage/40 rounded-lg px-3 py-2 text-sm bg-offwhite text-slate cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            reset({
              name: employee.name,
              designation: employee.designation ?? '',
              department: employee.department ?? '',
              version: employee.version,
            })
          }
          disabled={!isDirty || updateEmployee.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={updateEmployee.isPending}
          disabled={!isDirty}
          leadingIcon={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
