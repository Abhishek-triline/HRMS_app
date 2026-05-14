'use client';

/**
 * A-07 — Leave Balance Management (Admin)
 * Visual reference: prototype/admin/leave-balance.html
 *
 * - Employee search/filter
 * - Balance grid per employee
 * - Adjust with reason; negative adjustment triggers consequence modal
 */

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';

import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Modal, useModal } from '@/components/ui/Modal';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { LeaveBalanceGrid } from '@/components/leave/LeaveBalanceGrid';
import { useEmployeesList } from '@/lib/hooks/useEmployees';
import { useLeaveBalances, useAdjustBalance } from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import { AdjustBalanceRequestSchema } from '@nexora/contracts/leave';
import { LEAVE_TYPE_ID, LEAVE_TYPE_MAP } from '@/lib/status/maps';

// ── Adjust form schema ────────────────────────────────────────────────────────

const AdjustFormSchema = AdjustBalanceRequestSchema.omit({ employeeId: true });
type AdjustFormValues = z.infer<typeof AdjustFormSchema>;

// ── Adjust modal ──────────────────────────────────────────────────────────────

function AdjustModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string;
}) {
  const toast = useToast();
  const adjustMutation = useAdjustBalance();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(AdjustFormSchema),
  });

  const delta = watch('delta');
  const isDeduction = typeof delta === 'number' && delta < 0;

  async function onSubmit(values: AdjustFormValues) {
    try {
      await adjustMutation.mutateAsync({ ...values, employeeId });
      const leaveLabel = LEAVE_TYPE_MAP[values.leaveTypeId]?.label ?? String(values.leaveTypeId);
      toast.success(
        'Balance adjusted',
        `${leaveLabel} leave ${values.delta > 0 ? 'granted' : 'deducted'} for ${employeeName}.`,
      );
      reset();
      onClose();
    } catch (err) {
      toast.error('Adjustment failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); reset(); }}
      title="Adjust Leave Balance"
      requireConfirm={isDeduction}
      consequenceText={
        isDeduction
          ? `You are deducting ${Math.abs(delta ?? 0)} day(s) from ${employeeName}'s leave balance. This action is audit-logged and cannot be undone.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => { onClose(); reset(); }} disabled={isSubmitting || adjustMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant={isDeduction ? 'destructive' : 'primary'}
            loading={isSubmitting || adjustMutation.isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isDeduction ? 'Confirm Deduction' : 'Grant Days'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="bg-softmint rounded-lg p-3 text-sm">
          <span className="text-slate">Adjusting balance for:</span>{' '}
          <span className="font-semibold text-charcoal">{employeeName}</span>
        </div>

        <div>
          <Label htmlFor="adj-type" required>Leave Type</Label>
          <select
            id="adj-type"
            aria-required="true"
            aria-describedby={errors.leaveTypeId ? 'adj-type-error' : undefined}
            className={clsx(
              'w-full border rounded-lg px-3 py-2.5 text-sm text-charcoal bg-white mt-1',
              'focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors',
              errors.leaveTypeId ? 'border-crimson' : 'border-sage',
            )}
            {...register('leaveTypeId', { valueAsNumber: true })}
          >
            <option value="">Select type</option>
            <option value={LEAVE_TYPE_ID.Annual}>Annual</option>
            <option value={LEAVE_TYPE_ID.Sick}>Sick</option>
            <option value={LEAVE_TYPE_ID.Casual}>Casual</option>
          </select>
          {errors.leaveTypeId && <FieldError id="adj-type-error" message={errors.leaveTypeId.message ?? 'Required'} />}
        </div>

        <div>
          <Label htmlFor="adj-delta" required>
            Delta (+ grant, - deduct)
          </Label>
          <input
            id="adj-delta"
            type="number"
            step="1"
            aria-required="true"
            aria-describedby={errors.delta ? 'adj-delta-error' : 'adj-delta-hint'}
            className={clsx(
              'w-full border rounded-lg px-3 py-2.5 text-sm text-charcoal mt-1',
              'focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors',
              errors.delta ? 'border-crimson' : 'border-sage',
            )}
            {...register('delta', { valueAsNumber: true })}
          />
          <div id="adj-delta-hint" className="text-xs text-slate mt-1">
            Use positive for grant (e.g. +3), negative for deduction (e.g. -2). Integer days only.
          </div>
          {errors.delta && <FieldError id="adj-delta-error" message={errors.delta.message ?? 'Required'} />}
        </div>

        <div>
          <Label htmlFor="adj-reason" required>Reason</Label>
          <textarea
            id="adj-reason"
            rows={3}
            aria-required="true"
            aria-describedby={errors.reason ? 'adj-reason-error' : undefined}
            placeholder="State reason for manual adjustment (audit-logged)..."
            className={clsx(
              'w-full border rounded-lg px-3 py-2.5 text-sm text-charcoal mt-1 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors',
              errors.reason ? 'border-crimson' : 'border-sage',
            )}
            {...register('reason')}
          />
          {errors.reason && <FieldError id="adj-reason-error" message={errors.reason.message ?? 'Required'} />}
        </div>
      </form>
    </Modal>
  );
}

// ── Employee balance row ───────────────────────────────────────────────────────

function EmployeeBalanceSection({
  employeeId,
  employeeName,
}: {
  employeeId: number;
  employeeName: string;
}) {
  const balancesQuery = useLeaveBalances(employeeId);
  const adjustModal = useModal();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-base font-semibold text-charcoal">{employeeName}</h3>
        <Button variant="secondary" size="sm" onClick={adjustModal.open}>
          Adjust Balance
        </Button>
      </div>

      {balancesQuery.isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-sm text-slate">Loading balances…</span>
        </div>
      ) : balancesQuery.error ? (
        <div className="text-sm text-crimson" role="alert">Could not load balances.</div>
      ) : balancesQuery.data ? (
        <LeaveBalanceGrid data={balancesQuery.data} />
      ) : null}

      <AdjustModal
        isOpen={adjustModal.isOpen}
        onClose={adjustModal.close}
        employeeId={employeeId}
        employeeName={employeeName}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLeaveBalancesPage() {
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number; name: string } | null>(null);

  const employeesQuery = useEmployeesList({ q: search, limit: 20 });

  const employees = employeesQuery.data?.data ?? [];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-charcoal">Leave Balance Management</h1>
          <p className="text-sm text-slate mt-0.5">Calendar Year {new Date().getFullYear()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/leave-queue" className="text-xs text-emerald font-semibold hover:underline">
            Approval Queue →
          </Link>
          <Link href="/admin/leave-config" className="text-xs text-emerald font-semibold hover:underline">
            Leave Config →
          </Link>
        </div>
      </div>

      {/* Reset info banner */}
      <div className="bg-softmint border border-mint rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
        <svg className="w-5 h-5 text-forest flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <div className="text-sm font-semibold text-forest">Next reset: 1 January {new Date().getFullYear() + 1}</div>
          <div className="text-xs text-slate mt-0.5">
            Annual carry-forward cap configurable; Casual carry-forward cap configurable. Sick resets to zero. Maternity/Paternity are event-based.
          </div>
        </div>
        <Link href="/admin/leave-config" className="text-xs text-emerald font-semibold hover:underline whitespace-nowrap ml-auto">
          Configure Caps →
        </Link>
      </div>

      {/* Employee picker */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5 mb-6">
        <h2 className="font-heading text-sm font-semibold text-charcoal mb-4">Select Employee</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <svg className="w-4 h-4 text-sage absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search by employee name or EMP code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
              className="w-full border border-sage/50 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
          </div>
        </div>

        {/* Results */}
        {search.length > 1 && (
          <div className="mt-4">
            {employeesQuery.isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-slate">Searching…</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-sm text-slate py-2">No employees found for "{search}".</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmployee({ id: emp.id, name: emp.name })}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                      selectedEmployee?.id === emp.id
                        ? 'bg-softmint text-forest font-semibold'
                        : 'hover:bg-offwhite text-charcoal',
                    )}
                  >
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-slate ml-2 text-xs">{emp.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected employee balances */}
      {selectedEmployee ? (
        <EmployeeBalanceSection
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-8 text-center text-slate text-sm">
          Search for an employee above to view and adjust their leave balances.
        </div>
      )}
    </>
  );
}
