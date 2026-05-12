'use client';

/**
 * EmployeeForm — RHF form for create + edit modes.
 *
 * Create mode (mode='create'): all fields including salary section.
 * Edit mode (mode='edit'):  name/role/dept/designation/employment-type/joinDate.
 *                           salary and status have dedicated modals.
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
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import {
  CreateEmployeeRequestSchema,
  UpdateEmployeeRequestSchema,
} from '@nexora/contracts/employees';
import type { EmployeeDetail } from '@nexora/contracts/employees';

// ── Zod schemas ───────────────────────────────────────────────────────────────

// Create form adds salary structure
const CreateFormSchema = CreateEmployeeRequestSchema;

// Edit form — partial fields (no salary, no email, version required)
const EditFormSchema = UpdateEmployeeRequestSchema;

type CreateFormValues = z.infer<typeof CreateFormSchema>;
type EditFormValues = z.infer<typeof EditFormSchema>;

// Gender options for the select (matches prototype label set; 'Other' → "Non-binary")
const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Non-binary' },
  { value: 'PreferNotToSay', label: 'Prefer not to say' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormCreateProps {
  mode: 'create';
  onSuccess?: (employeeId: string, email: string) => void;
}

interface EmployeeFormEditProps {
  mode: 'edit';
  employee: EmployeeDetail;
  onSuccess?: (employeeId: string) => void;
}

type EmployeeFormProps = EmployeeFormCreateProps | EmployeeFormEditProps;

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['Engineering', 'Design', 'HR', 'Finance', 'Operations', 'Product', 'Sales'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function formatRupees(paise: number) {
  return `₹${fmt.format(Math.floor(paise / 100))}`;
}

const TODAY = new Date().toISOString().slice(0, 10);

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeForm(props: EmployeeFormProps) {
  const router = useRouter();
  const isCreate = props.mode === 'create';

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
          gender: null,
          role: 'Employee',
          department: '',
          designation: '',
          employmentType: 'Permanent',
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
          gender: (props as EmployeeFormEditProps).employee.gender ?? null,
          role: (props as EmployeeFormEditProps).employee.role,
          department: (props as EmployeeFormEditProps).employee.department ?? '',
          designation: (props as EmployeeFormEditProps).employee.designation ?? '',
          employmentType: (props as EmployeeFormEditProps).employee.employmentType,
          joinDate: (props as EmployeeFormEditProps).employee.joinDate,
          version: (props as EmployeeFormEditProps).employee.version,
        }
      : undefined,
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee(
    !isCreate ? (props as EmployeeFormEditProps).employee.id : '',
  );

  // Re-populate edit form when employee prop changes
  useEffect(() => {
    if (!isCreate) {
      const emp = (props as EmployeeFormEditProps).employee;
      editForm.reset({
        name: emp.name,
        phone: emp.phone ?? null,
        dateOfBirth: emp.dateOfBirth ?? null,
        gender: emp.gender ?? null,
        role: emp.role,
        department: emp.department ?? '',
        designation: emp.designation ?? '',
        employmentType: emp.employmentType,
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
            message: `BL-005: Circular reporting detected. ${(err.details as { path?: string })?.path ?? ''}`,
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
  const watchedDept = isCreate ? createForm.watch('department') : '';
  const watchedDesignation = isCreate ? createForm.watch('designation') : '';
  const watchedEmpType = isCreate ? createForm.watch('employmentType') : '';
  const watchedJoinDate = isCreate ? createForm.watch('joinDate') : '';
  const watchedPhone = isCreate ? createForm.watch('phone') : null;
  const watchedDob = isCreate ? createForm.watch('dateOfBirth') : null;
  const watchedGender = isCreate ? createForm.watch('gender') : null;
  const watchedBasicPaise = isCreate ? (createForm.watch('salaryStructure.basic_paise') ?? 0) : 0;
  const watchedHraPaise = isCreate ? (createForm.watch('salaryStructure.hra_paise') ?? 0) : 0;
  const watchedTransportPaise = isCreate ? (createForm.watch('salaryStructure.transport_paise') ?? 0) : 0;
  const watchedOtherPaise = isCreate ? (createForm.watch('salaryStructure.other_paise') ?? 0) : 0;
  const grossPaise = watchedBasicPaise + watchedHraPaise + watchedTransportPaise + watchedOtherPaise;

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
                {/* Full Name — spans both columns */}
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
                {/* Work Email */}
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
                {/* Phone Number */}
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
                {/* Date of Birth */}
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
                {/* Gender — select (matches prototype) */}
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    {...register('gender')}
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <FieldError id="gender-error" message={errors.gender?.message} />
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
                  <Label htmlFor="role" required>System Role</Label>
                  <select
                    id="role"
                    {...register('role')}
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="PayrollOfficer">Payroll Officer</option>
                  </select>
                  <FieldError id="role-error" message={errors.role?.message} />
                </div>
                <div>
                  <Label htmlFor="department" required>Department</Label>
                  <select
                    id="department"
                    {...register('department')}
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <FieldError id="department-error" message={errors.department?.message} />
                </div>
                <div>
                  <Label htmlFor="employment-type" required>Employment Type</Label>
                  <select
                    id="employment-type"
                    {...register('employmentType')}
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Probation">Probation</option>
                  </select>
                  <FieldError id="employment-type-error" message={errors.employmentType?.message} />
                </div>
                <div>
                  <Label htmlFor="join-date" required>Date of Joining</Label>
                  <input
                    id="join-date"
                    type="date"
                    {...register('joinDate')}
                    className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
                  />
                  <FieldError id="join-date-error" message={errors.joinDate?.message} />
                </div>
                <div className="col-span-2">
                  <Input
                    {...register('designation')}
                    label="Designation / Job Title"
                    placeholder="e.g. Senior Software Engineer"
                    required
                    error={errors.designation?.message}
                    maxLength={150}
                  />
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
                  // Admins may only report to another Admin.
                  // Other roles may report to Manager or Admin.
                  const selectedRole = isCreate ? createForm.watch('role') : '';
                  const eligibleRoles = selectedRole === 'Admin' ? 'Admin' : 'Manager,Admin';
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
                // Cast required: Control<ConcreteType> → Control<FieldValues> for the sub-form bridge.
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
                {/* Avatar — neutral placeholder per prototype */}
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
                  {watchedDesignation ? (
                    <div className="text-xs text-slate mt-0.5">{watchedDesignation}</div>
                  ) : (
                    <div className="text-xs text-sage/70 mt-0.5">Designation</div>
                  )}
                </div>

                {/* EMP Code */}
                <div className="bg-softmint rounded-lg px-3 py-2.5 mb-4 text-center">
                  <div className="text-xs text-slate mb-0.5">EMP Code</div>
                  <div className="font-heading text-base font-bold text-forest">EMP-{new Date().getFullYear()}-XXXX</div>
                  <div className="text-xs text-slate/70 mt-1">Auto-generated on creation</div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">Department</span>
                    <span className="text-xs font-medium text-charcoal">{watchedDept || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate">Employment Type</span>
                    <span className="text-xs font-medium text-charcoal">{watchedEmpType || '—'}</span>
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

            {/* Info note */}
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
          {/* Phone Number */}
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
          {/* Date of Birth */}
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
          {/* Gender */}
          <div className="col-span-2">
            <Label htmlFor="edit-gender">Gender</Label>
            <select
              id="edit-gender"
              {...editRegister('gender')}
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <FieldError id="edit-gender-error" message={editErrors.gender?.message} />
          </div>
          <div>
            <Label htmlFor="edit-role" required>System Role</Label>
            <select
              id="edit-role"
              {...editRegister('role')}
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
            >
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
              <option value="PayrollOfficer">Payroll Officer</option>
            </select>
            <FieldError id="edit-role-error" message={editErrors.role?.message} />
          </div>
          <div>
            <Label htmlFor="edit-department" required>Department</Label>
            <select
              id="edit-department"
              {...editRegister('department')}
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <FieldError id="edit-department-error" message={editErrors.department?.message} />
          </div>
          <div>
            <Input
              {...editRegister('designation')}
              label="Designation / Job Title"
              required
              error={editErrors.designation?.message}
              maxLength={150}
            />
          </div>
          <div>
            <Label htmlFor="edit-employment-type" required>Employment Type</Label>
            <select
              id="edit-employment-type"
              {...editRegister('employmentType')}
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white transition"
            >
              <option value="Permanent">Permanent</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
              <option value="Probation">Probation</option>
            </select>
            <FieldError id="edit-employment-type-error" message={editErrors.employmentType?.message} />
          </div>
          <div>
            <Label htmlFor="edit-join-date">Date of Joining</Label>
            <input
              id="edit-join-date"
              type="date"
              {...editRegister('joinDate')}
              className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
            />
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
                gender: emp.gender ?? null,
                role: emp.role,
                department: emp.department ?? '',
                designation: emp.designation ?? '',
                employmentType: emp.employmentType,
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
