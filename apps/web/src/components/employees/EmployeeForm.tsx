'use client';

/**
 * EmployeeForm — RHF form for create + edit modes.
 *
 * Create mode (mode='create'): all fields including salary section.
 * Edit mode (mode='edit'):  name/roleId/departmentId/designationId/employmentTypeId/joinDate.
 *                           salary and status have dedicated modals.
 *
 * v2: all FK fields are INT IDs. Dropdowns populated from master data via useMasters.
 *
 * Surfaces server-side 409 CIRCULAR_REPORTING against the manager field.
 * Surfaces 409 VERSION_MISMATCH as a toast.
 */

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { Button } from '@/components/ui/Button';
import { HierarchyPicker } from './HierarchyPicker';
import { SalaryStructureForm } from './SalaryStructureForm';
import { useCreateEmployee, useUpdateEmployee } from '@/lib/hooks/useEmployees';
import { useRoles, useDepartments, useDesignations, useEmploymentTypes, useGenders } from '@/lib/hooks/useMasters';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ROLE_ID } from '@/lib/status/maps';
import {
  CreateEmployeeRequestSchema,
  UpdateEmployeeRequestSchema,
} from '@nexora/contracts/employees';
import type { EmployeeDetail } from '@nexora/contracts/employees';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CreateFormSchema = CreateEmployeeRequestSchema;
const EditFormSchema = UpdateEmployeeRequestSchema;

type CreateFormValues = z.infer<typeof CreateFormSchema>;
type EditFormValues = z.infer<typeof EditFormSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormCreateProps {
  mode: 'create';
  onSuccess?: (employeeId: number, email: string) => void;
}

interface EmployeeFormEditProps {
  mode: 'edit';
  employee: EmployeeDetail;
  onSuccess?: (employeeId: number) => void;
}

type EmployeeFormProps = EmployeeFormCreateProps | EmployeeFormEditProps;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function formatRupees(paise: number) {
  return `₹${fmt.format(Math.floor(paise / 100))}`;
}

const TODAY = new Date().toISOString().slice(0, 10);

// Date-of-joining bounds:
//   - Floor at 2000-01-01: the company didn't exist before that, so anything
//     older is a typo (operators occasionally tab into year and overshoot).
//   - Ceiling at March 31 of the next calendar year: covers the rest of the
//     current Indian fiscal year and all of the next one (Apr–Mar). Wide
//     enough for typical notice-period overlap and next-FY planned hires,
//     but still blocks typos like 2099.
const JOIN_DATE_MIN = '2000-01-01';
const JOIN_DATE_MAX = `${new Date().getFullYear() + 1}-03-31`;

// Coerce select value to number | null (empty string → undefined, '0' → undefined)
function toIntOrUndefined(val: string | number): number | undefined {
  const n = Number(val);
  return n > 0 ? n : undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeForm(props: EmployeeFormProps) {
  const router = useRouter();
  const isCreate = props.mode === 'create';

  // Master data for dropdowns
  const { data: roles } = useRoles();
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: employmentTypes } = useEmploymentTypes();
  const { data: genders } = useGenders();

  // Track the selected manager name for the preview card (create mode only)
  const [previewManagerName, setPreviewManagerName] = useState<string | null>(null);

  // ── Create mode form ───────────────────────────────────────────────────────
  const createForm = useForm<CreateFormValues>({
    resolver: isCreate ? zodResolver(CreateFormSchema) : undefined,
    defaultValues: isCreate
      ? {
          name: '',
          email: '',
          phone: null,
          dateOfBirth: null,
          genderId: null,
          roleId: ROLE_ID.Employee,
          departmentId: 0 as unknown as number,
          designationId: 0 as unknown as number,
          employmentTypeId: 1,
          reportingManagerId: null,
          joinDate: TODAY,
          salaryStructure: {
            basic_paise: 0,
            allowances_paise: 0,
            effectiveFrom: TODAY,
            hra_paise: 0,
            transport_paise: 0,
            other_paise: 0,
          },
        }
      : undefined,
  });

  // ── Edit mode form ─────────────────────────────────────────────────────────
  const editForm = useForm<EditFormValues>({
    resolver: !isCreate ? zodResolver(EditFormSchema) : undefined,
    defaultValues: !isCreate
      ? {
          name: (props as EmployeeFormEditProps).employee.name,
          phone: (props as EmployeeFormEditProps).employee.phone ?? null,
          dateOfBirth: (props as EmployeeFormEditProps).employee.dateOfBirth ?? null,
          genderId: (props as EmployeeFormEditProps).employee.genderId ?? null,
          roleId: (props as EmployeeFormEditProps).employee.roleId,
          departmentId: (props as EmployeeFormEditProps).employee.departmentId ?? undefined,
          designationId: (props as EmployeeFormEditProps).employee.designationId ?? undefined,
          employmentTypeId: (props as EmployeeFormEditProps).employee.employmentTypeId,
          joinDate: (props as EmployeeFormEditProps).employee.joinDate,
          version: (props as EmployeeFormEditProps).employee.version,
        }
      : undefined,
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee(
    !isCreate ? (props as EmployeeFormEditProps).employee.id : 0,
  );

  // Re-populate edit form when employee prop changes
  useEffect(() => {
    if (!isCreate) {
      const emp = (props as EmployeeFormEditProps).employee;
      editForm.reset({
        name: emp.name,
        phone: emp.phone ?? null,
        dateOfBirth: emp.dateOfBirth ?? null,
        genderId: emp.genderId ?? null,
        roleId: emp.roleId,
        departmentId: emp.departmentId ?? undefined,
        designationId: emp.designationId ?? undefined,
        employmentTypeId: emp.employmentTypeId,
        joinDate: emp.joinDate,
        version: emp.version,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate ? null : (props as EmployeeFormEditProps).employee]);

  // ── Submit: create ─────────────────────────────────────────────────────────
  async function handleCreateSubmit(values: CreateFormValues) {
    try {
      const result = await createEmployee.mutateAsync(values);
      showToast({
        type: 'success',
        title: 'Employee created — invitation sent',
        message: `Invite sent to ${values.email}`,
      });
      props.onSuccess?.(result.employee.id, values.email);
      router.push(`/admin/employees/${result.employee.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'CIRCULAR_REPORTING') {
          createForm.setError('reportingManagerId', {
            message: `Circular reporting detected. ${(err.details as { path?: string })?.path ?? ''}`,
          });
        } else if (err.code === 'EMAIL_ALREADY_EXISTS') {
          createForm.setError('email', { message: 'This email is already in use.' });
        } else {
          showToast({ type: 'error', title: 'Failed to create employee', message: err.message });
        }
      }
    }
  }

  // ── Submit: edit ───────────────────────────────────────────────────────────
  async function handleEditSubmit(values: EditFormValues) {
    const emp = (props as EmployeeFormEditProps).employee;
    try {
      await updateEmployee.mutateAsync(values);
      showToast({ type: 'success', title: 'Profile updated', message: `${emp.name} profile saved.` });
      (props as EmployeeFormEditProps).onSuccess?.(emp.id);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VERSION_MISMATCH') {
          showToast({
            type: 'error',
            title: 'Record was edited by someone else',
            message: 'Reloading…',
          });
        } else {
          showToast({ type: 'error', title: 'Update failed', message: err.message });
        }
      }
    }
  }

  // ── Watch values for create preview ───────────────────────────────────────
  const watchedName = isCreate ? createForm.watch('name') : '';
  const watchedDesignationId = isCreate ? createForm.watch('designationId') : 0;
  const watchedDeptId = isCreate ? createForm.watch('departmentId') : 0;
  const watchedEmpTypeId = isCreate ? createForm.watch('employmentTypeId') : 0;
  const watchedJoinDate = isCreate ? createForm.watch('joinDate') : '';
  const watchedBasicPaise = isCreate ? (createForm.watch('salaryStructure.basic_paise') ?? 0) : 0;
  const watchedHraPaise = isCreate ? (createForm.watch('salaryStructure.hra_paise') ?? 0) : 0;
  const watchedTransportPaise = isCreate ? (createForm.watch('salaryStructure.transport_paise') ?? 0) : 0;
  const watchedOtherPaise = isCreate ? (createForm.watch('salaryStructure.other_paise') ?? 0) : 0;
  const grossPaise = watchedBasicPaise + watchedHraPaise + watchedTransportPaise + watchedOtherPaise;

  const watchedDesignationLabel = designations?.find((d) => d.id === watchedDesignationId)?.name ?? '';
  const watchedDeptLabel = departments?.find((d) => d.id === watchedDeptId)?.name ?? '';
  const watchedEmpTypeLabel = employmentTypes?.find((e) => e.id === watchedEmpTypeId)?.name ?? '';

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isCreate) {
    const {
      register,
      control,
      watch,
      setValue,
      formState: { errors },
      handleSubmit,
    } = createForm;

    // Determine eligible roles for manager picker
    const watchedRoleId = watch('roleId');
    const isAdminRole = watchedRoleId === ROLE_ID.Admin;

    return (
      <form onSubmit={handleSubmit(handleCreateSubmit)} noValidate>
        <div className="flex gap-6 items-start">
          {/* LEFT — Form */}
          <div className="flex-1 space-y-5">

            {/* Section 1: Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-softmint rounded-full flex items-center justify-center text-forest text-xs font-bold" aria-hidden="true">
                  1
                </span>
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    {...register('name')}
                    label="Full Name"
                    placeholder="e.g. Rahul Sharma"
                    required
                    error={errors.name?.message}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Input
                    {...register('email')}
                    type="email"
                    label="Work Email"
                    placeholder="rahul@nexora.in"
                    required
                    error={errors.email?.message}
                  />
                </div>
                <div>
                  <Input
                    {...register('phone')}
                    type="tel"
                    label="Phone Number"
                    placeholder="+91 98765 43210"
                    error={errors.phone?.message}
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <input
                    id="dob"
                    type="date"
                    {...register('dateOfBirth')}
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
                  />
                  <FieldError id="dob-error" message={errors.dateOfBirth?.message} />
                </div>
                <div>
                  <Label htmlFor="genderId">Gender</Label>
                  <Controller
                    name="genderId"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="genderId"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                      >
                        <option value="">Select gender</option>
                        {(genders ?? []).map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError id="genderId-error" message={errors.genderId?.message} />
                </div>
              </div>
            </div>

            {/* Section 2: Employment Details */}
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-softmint rounded-full flex items-center justify-center text-forest text-xs font-bold" aria-hidden="true">
                  2
                </span>
                Employment Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="roleId" required>System Role</Label>
                  <Controller
                    name="roleId"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="roleId"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                      >
                        {(roles ?? []).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError id="roleId-error" message={errors.roleId?.message} />
                </div>
                <div>
                  <Label htmlFor="departmentId" required>Department</Label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="departmentId"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(toIntOrUndefined(e.target.value) ?? 0)}
                        className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                      >
                        <option value="">Select department</option>
                        {(departments ?? []).map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError id="departmentId-error" message={errors.departmentId?.message} />
                </div>
                <div>
                  <Label htmlFor="designationId" required>Designation / Job Title</Label>
                  <Controller
                    name="designationId"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="designationId"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(toIntOrUndefined(e.target.value) ?? 0)}
                        className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                      >
                        <option value="">Select designation</option>
                        {(designations ?? []).map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError id="designationId-error" message={errors.designationId?.message} />
                </div>
                <div>
                  <Label htmlFor="employmentTypeId" required>Employment Type</Label>
                  <Controller
                    name="employmentTypeId"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="employmentTypeId"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                      >
                        {(employmentTypes ?? []).map((et) => (
                          <option key={et.id} value={et.id}>{et.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError id="employmentTypeId-error" message={errors.employmentTypeId?.message} />
                </div>
                <div>
                  <Label htmlFor="join-date" required>Date of Joining</Label>
                  <input
                    id="join-date"
                    type="date"
                    min={JOIN_DATE_MIN}
                    max={JOIN_DATE_MAX}
                    {...register('joinDate')}
                    aria-describedby="join-date-hint"
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
                  />
                  <p id="join-date-hint" className="text-xs text-slate mt-1">
                    Between {JOIN_DATE_MIN} and {JOIN_DATE_MAX} (covers the current fiscal year and the next).
                  </p>
                  <FieldError id="join-date-error" message={errors.joinDate?.message} />
                </div>
              </div>
            </div>

            {/* Section 3: Reporting Structure */}
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-softmint rounded-full flex items-center justify-center text-forest text-xs font-bold" aria-hidden="true">
                  3
                </span>
                Reporting Structure
              </h3>
              <Controller
                name="reportingManagerId"
                control={control}
                render={({ field }) => {
                  // Admins may only report to another Admin (BL-017)
                  const eligibleRoles = isAdminRole ? 'Admin' : 'Manager,Admin';
                  return (
                    <HierarchyPicker
                      value={field.value}
                      onChange={(managerId, managerName) => {
                        field.onChange(managerId);
                        setPreviewManagerName(managerName ?? null);
                      }}
                      label="Reporting Manager"
                      error={errors.reportingManagerId?.message}
                      eligibleRoles={eligibleRoles}
                    />
                  );
                }}
              />
            </div>

            {/* Section 4: Salary Structure */}
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-1 flex items-center gap-2">
                <span className="w-6 h-6 bg-softmint rounded-full flex items-center justify-center text-forest text-xs font-bold" aria-hidden="true">
                  4
                </span>
                Salary Structure
              </h3>
              <p className="text-xs text-slate mb-4 ml-8">
                Monthly figures in INR (₹). Gross will be computed automatically.
              </p>
              <SalaryStructureForm
                mode="create"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                control={control as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue={setValue as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                watch={watch as any}
                errors={errors}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pb-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/admin/employees')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={createEmployee.isPending}
                leadingIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                }
              >
                Create Employee &amp; Send Invite
              </Button>
            </div>
          </div>

          {/* RIGHT — Preview Card */}
          <div className="w-72 flex-shrink-0 space-y-4 sticky top-6 hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
              <div className="bg-forest px-5 py-4">
                <h3 className="font-heading text-white text-sm font-bold mb-1">Employee Preview</h3>
                <p className="text-mint/70 text-xs">Updates as you fill the form</p>
              </div>
              <div className="px-5 py-5">
                <div className="flex flex-col items-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mb-2">
                    <svg className="w-7 h-7 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  {watchedName ? (
                    <div className="text-sm font-semibold text-charcoal">{watchedName}</div>
                  ) : (
                    <div className="text-sm font-semibold text-sage">Full Name</div>
                  )}
                  {watchedDesignationLabel ? (
                    <div className="text-xs text-slate mt-0.5">{watchedDesignationLabel}</div>
                  ) : (
                    <div className="text-xs text-sage/70 mt-0.5">Designation</div>
                  )}
                </div>
                <div className="bg-softmint rounded-lg px-3 py-2.5 mb-4 text-center">
                  <div className="text-xs text-slate mb-0.5">EMP Code</div>
                  <div className="font-heading text-base font-bold text-forest">EMP-{new Date().getFullYear()}-XXXX</div>
                  <div className="text-xs text-slate/70 mt-1">Auto-generated on creation</div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">Department</span>
                    <span className="text-xs font-medium text-charcoal">{watchedDeptLabel || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">Employment Type</span>
                    <span className="text-xs font-medium text-charcoal">{watchedEmpTypeLabel || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">Date of Joining</span>
                    <span className="text-xs font-medium text-charcoal">{watchedJoinDate || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">Reporting Manager</span>
                    <span className="text-xs font-medium text-charcoal">{previewManagerName || '—'}</span>
                  </div>
                  <div className="border-t border-sage/20 pt-2 flex justify-between items-center">
                    <span className="text-xs text-slate">Gross Monthly CTC</span>
                    <span className="text-xs font-bold text-forest">
                      {grossPaise > 0 ? formatRupees(grossPaise) : '₹ 0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-softmint border border-mint rounded-xl px-4 py-4">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-forest mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-forest mb-1">Invite Email</p>
                  <p className="text-xs text-slate leading-relaxed">
                    After creation, an invite with login credentials and a first-login link will be sent to the employee&apos;s work email automatically.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs text-slate px-1">
              Fields marked <span className="text-crimson font-bold">*</span> are required to create the employee record.
            </div>
          </div>
        </div>
      </form>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const {
    register: editRegister,
    control: editControl,
    formState: { errors: editErrors },
    handleSubmit: editHandleSubmit,
  } = editForm;

  const emp = (props as EmployeeFormEditProps).employee;

  return (
    <form onSubmit={editHandleSubmit(handleEditSubmit)} noValidate>
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-5 space-y-4">
        <h3 className="font-heading text-sm font-bold text-charcoal">Edit Profile</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              {...editRegister('name')}
              label="Full Name"
              required
              error={editErrors.name?.message}
              maxLength={200}
            />
          </div>
          <div>
            <Input
              {...editRegister('phone')}
              type="tel"
              label="Phone Number"
              placeholder="+91 98765 43210"
              error={editErrors.phone?.message}
              maxLength={20}
            />
          </div>
          <div>
            <Label htmlFor="edit-dob">Date of Birth</Label>
            <input
              id="edit-dob"
              type="date"
              {...editRegister('dateOfBirth')}
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
            />
            <FieldError id="edit-dob-error" message={editErrors.dateOfBirth?.message} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="edit-genderId">Gender</Label>
            <Controller
              name="genderId"
              control={editControl}
              render={({ field }) => (
                <select
                  id="edit-genderId"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                >
                  <option value="">Select gender</option>
                  {(genders ?? []).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            />
            <FieldError id="edit-genderId-error" message={editErrors.genderId?.message} />
          </div>
          <div>
            <Label htmlFor="edit-roleId" required>System Role</Label>
            <Controller
              name="roleId"
              control={editControl}
              render={({ field }) => (
                <select
                  id="edit-roleId"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                >
                  {(roles ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              )}
            />
            <FieldError id="edit-roleId-error" message={editErrors.roleId?.message} />
          </div>
          <div>
            <Label htmlFor="edit-departmentId" required>Department</Label>
            <Controller
              name="departmentId"
              control={editControl}
              render={({ field }) => (
                <select
                  id="edit-departmentId"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(toIntOrUndefined(e.target.value))}
                  className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                >
                  <option value="">Select department</option>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            />
            <FieldError id="edit-departmentId-error" message={editErrors.departmentId?.message} />
          </div>
          <div>
            <Label htmlFor="edit-designationId">Designation / Job Title</Label>
            <Controller
              name="designationId"
              control={editControl}
              render={({ field }) => (
                <select
                  id="edit-designationId"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(toIntOrUndefined(e.target.value))}
                  className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                >
                  <option value="">Select designation</option>
                  {(designations ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            />
            <FieldError id="edit-designationId-error" message={editErrors.designationId?.message} />
          </div>
          <div>
            <Label htmlFor="edit-employmentTypeId" required>Employment Type</Label>
            <Controller
              name="employmentTypeId"
              control={editControl}
              render={({ field }) => (
                <select
                  id="edit-employmentTypeId"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                >
                  {(employmentTypes ?? []).map((et) => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </select>
              )}
            />
            <FieldError id="edit-employmentTypeId-error" message={editErrors.employmentTypeId?.message} />
          </div>
          <div>
            <Label htmlFor="edit-join-date">Date of Joining</Label>
            <input
              id="edit-join-date"
              type="date"
              min={JOIN_DATE_MIN}
              max={JOIN_DATE_MAX}
              {...editRegister('joinDate')}
              aria-describedby="edit-join-date-hint"
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
            />
            <p id="edit-join-date-hint" className="text-xs text-slate mt-1">
              Between {JOIN_DATE_MIN} and {JOIN_DATE_MAX}.
            </p>
            <FieldError id="edit-join-date-error" message={editErrors.joinDate?.message} />
          </div>
        </div>

        {/* Immutable fields notice */}
        <div className="bg-offwhite rounded-lg px-4 py-3 text-xs text-slate">
          <span className="font-medium text-charcoal">Read-only:</span>{' '}
          Email (<span className="font-mono">{emp.email}</span>) and EMP code (
          <span className="font-mono">{emp.code}</span>) cannot be changed after creation.
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              editForm.reset({
                name: emp.name,
                phone: emp.phone ?? null,
                dateOfBirth: emp.dateOfBirth ?? null,
                genderId: emp.genderId ?? null,
                roleId: emp.roleId,
                departmentId: emp.departmentId ?? undefined,
                designationId: emp.designationId ?? undefined,
                employmentTypeId: emp.employmentTypeId,
                joinDate: emp.joinDate,
                version: emp.version,
              })
            }
            disabled={updateEmployee.isPending}
          >
            Reset
          </Button>
          <Button type="submit" variant="primary" loading={updateEmployee.isPending}>
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
