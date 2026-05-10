'use client';

/**
 * A-04 — Employee Detail / Edit (Admin).
 * Visual reference: prototype/admin/employee-detail.html
 *
 * Sections:
 * - Profile card (name, code, role, status, details)
 * - Reporting Manager card (with Reassign CTA)
 * - Salary Structure (Admin only — edit via modal)
 * - Status change (Quick Actions panel, Admin only)
 * - Edit profile form
 *
 * All mutations show optimistic UI then refetch; error states surface in toast or inline.
 * VERSION_MISMATCH: toast + invalidateQueries.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployee, useUpdateSalary } from '@/lib/hooks/useEmployees';
import { qk } from '@/lib/api/query-keys';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { EmployeeStatusBadge } from '@/components/employees/EmployeeStatusBadge';
import { StatusChangeModal } from '@/components/employees/StatusChangeModal';
import { ReassignManagerModal } from '@/components/employees/ReassignManagerModal';
import { SalaryStructureForm } from '@/components/employees/SalaryStructureForm';
import { Modal, useModal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateSalaryRequestSchema } from '@nexora/contracts/employees';
import type { UpdateSalaryRequest } from '@nexora/contracts/employees';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const fmtInr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function formatRupees(paise: number) {
  return `₹${fmtInr.format(Math.floor(paise / 100))}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Salary edit modal ─────────────────────────────────────────────────────────

function SalaryEditModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  currentVersion,
  currentSalary,
}: {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  currentVersion: number;
  currentSalary: { basic_paise: number; allowances_paise: number; effectiveFrom: string } | null;
}) {
  const TODAY = new Date().toISOString().slice(0, 10);
  const updateSalary = useUpdateSalary(employeeId);

  const form = useForm<UpdateSalaryRequest>({
    resolver: zodResolver(UpdateSalaryRequestSchema),
    defaultValues: {
      basic_paise: currentSalary?.basic_paise ?? 0,
      allowances_paise: currentSalary?.allowances_paise ?? 0,
      effectiveFrom: TODAY,
      version: currentVersion,
    },
  });

  async function handleSubmit(values: UpdateSalaryRequest) {
    try {
      await updateSalary.mutateAsync({ ...values, version: currentVersion });
      showToast({
        type: 'success',
        title: 'Salary updated',
        message: `${employeeName}'s salary will apply from next payroll run (BL-030).`,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast({ type: 'error', title: 'Salary update failed', message: err.message });
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Salary Structure"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={updateSalary.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={updateSalary.isPending}
            onClick={form.handleSubmit(handleSubmit)}
          >
            Save Salary
          </Button>
        </>
      }
    >
      <SalaryStructureForm
        mode="edit"
        // Cast required: Control<ConcreteType> → Control<FieldValues> for the sub-form bridge.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={form.control as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setValue={form.setValue as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        watch={form.watch as any}
        errors={form.formState.errors}
      />
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: employee, isLoading, isError, error } = useEmployee(id ?? '');

  const [showEditForm, setShowEditForm] = useState(false);
  const statusModal = useModal();
  const reassignModal = useModal();
  const salaryModal = useModal();

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !employee) {
    const apiErr = error as ApiError | null;
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-8 text-center">
        <p className="text-crimson font-semibold mb-2">
          {apiErr?.status === 404 ? 'Employee not found.' : 'Failed to load employee.'}
        </p>
        <Button variant="secondary" onClick={() => router.push('/admin/employees')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const initials = getInitials(employee.name);
  const salary = employee.salaryStructure;

  return (
    <div>
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/admin/employees"
          className="text-slate hover:text-forest transition-colors"
          aria-label="Back to employee directory"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-heading text-base font-bold text-charcoal leading-tight">
            {employee.name}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate font-mono">{employee.code}</span>
            <span className="text-sage">·</span>
            <EmployeeStatusBadge status={employee.status} />
          </div>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* LEFT COLUMN */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-forest flex items-center justify-center text-white font-heading text-xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-bold text-charcoal">{employee.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm text-slate">{employee.designation ?? '—'}</span>
                      <span className="text-sage">·</span>
                      <EmployeeStatusBadge status={employee.status} />
                      <span className="bg-softmint text-forest text-xs font-bold px-2 py-0.5 rounded">
                        {employee.role}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-slate bg-offwhite px-2.5 py-1.5 rounded-lg">
                      {employee.code}
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-5">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs text-slate">{employee.department ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate">{employee.employmentType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate">Joined: {formatDate(employee.joinDate)}</span>
                  </div>
                  {employee.exitDate && (
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-crimson flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                      </svg>
                      <span className="text-xs text-crimson">Exited: {formatDate(employee.exitDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reporting Manager */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate uppercase tracking-wide">
                Reporting Manager
              </h3>
              <Button variant="secondary" size="sm" onClick={reassignModal.open}>
                Change Manager
              </Button>
            </div>
            {employee.reportingManagerId ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-forest text-sm font-bold flex-shrink-0">
                    {employee.reportingManagerName ? getInitials(employee.reportingManagerName) : '?'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-charcoal">
                      {employee.reportingManagerName ?? '—'}
                    </div>
                    <div className="text-xs text-slate font-mono">
                      {employee.reportingManagerCode ?? ''}
                    </div>
                  </div>
                </div>
                {employee.reportingManagerId && (
                  <Link
                    href={`/admin/employees/${employee.reportingManagerId}`}
                    className="text-xs text-emerald font-semibold hover:underline"
                  >
                    View Profile →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate">
                No reporting manager — top of organisation tree.
              </p>
            )}
          </div>

          {/* Salary Structure (Admin only) */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate uppercase tracking-wide">
                Salary Structure
              </h3>
              <Button variant="secondary" size="sm" onClick={salaryModal.open}>
                Edit Salary
              </Button>
            </div>
            {salary ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-offwhite rounded-lg px-3.5 py-3">
                    <div className="text-xs text-slate mb-0.5">Basic Salary</div>
                    <div className="text-sm font-bold text-charcoal">
                      {formatRupees(salary.basic_paise)}
                    </div>
                  </div>
                  <div className="bg-offwhite rounded-lg px-3.5 py-3">
                    <div className="text-xs text-slate mb-0.5">Allowances</div>
                    <div className="text-sm font-bold text-charcoal">
                      {formatRupees(salary.allowances_paise)}
                    </div>
                  </div>
                </div>
                <div className="bg-forest rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-mint/80 text-xs font-medium">Gross Monthly CTC</span>
                  <span className="font-heading text-white text-lg font-bold">
                    {formatRupees(salary.basic_paise + salary.allowances_paise)}
                  </span>
                </div>
                <p className="text-xs text-slate mt-2">
                  Effective from: {formatDate(salary.effectiveFrom)}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate">No salary structure on record.</p>
            )}
          </div>

          {/* Edit Profile Form (toggled) */}
          {showEditForm ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm font-bold text-charcoal">Edit Profile</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel edit
                </Button>
              </div>
              <EmployeeForm
                mode="edit"
                employee={employee}
                onSuccess={() => {
                  setShowEditForm(false);
                  queryClient.invalidateQueries({ queryKey: qk.employees.detail(id) });
                }}
              />
            </div>
          ) : null}
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-64 flex-shrink-0 space-y-4 sticky top-6">

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
            <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-1.5"
                onClick={() => setShowEditForm((prev) => !prev)}
                leadingIcon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                {showEditForm ? 'Cancel Edit' : 'Edit Profile'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-1.5"
                onClick={reassignModal.open}
                leadingIcon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Change Manager
              </Button>

              <div className="border-t border-sage/20 pt-2">
                <p className="text-xs text-slate mb-2">
                  <span className="font-semibold text-charcoal">On-Leave</span> is set automatically by the system (BL-006). It cannot be set manually.
                </p>
                <Button
                  variant={employee.status === 'Exited' ? 'ghost' : 'destructive'}
                  size="sm"
                  className="w-full justify-start gap-1.5"
                  onClick={statusModal.open}
                  disabled={employee.status === 'Exited'}
                  leadingIcon={
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Change Status
                </Button>
              </div>
            </div>
          </div>

          {/* Record metadata */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
            <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
              Record Info
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate">Version</span>
                <span className="font-mono text-charcoal">v{employee.version}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate">Created</span>
                <span className="text-charcoal">{formatDate(employee.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate">Last updated</span>
                <span className="text-charcoal">{formatDate(employee.updatedAt)}</span>
              </div>
              {employee.mustResetPassword && (
                <div className="mt-2 bg-umberbg rounded px-2 py-1.5 text-xs text-umber">
                  First login pending — password not yet set.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StatusChangeModal
        isOpen={statusModal.isOpen}
        onClose={statusModal.close}
        employee={employee}
      />

      <ReassignManagerModal
        isOpen={reassignModal.isOpen}
        onClose={reassignModal.close}
        employee={employee}
      />

      <SalaryEditModal
        isOpen={salaryModal.isOpen}
        onClose={salaryModal.close}
        employeeId={employee.id}
        employeeName={employee.name}
        currentVersion={employee.version}
        currentSalary={salary}
      />
    </div>
  );
}
