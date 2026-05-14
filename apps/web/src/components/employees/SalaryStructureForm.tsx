'use client';

/**
 * SalaryStructureForm — used inside EmployeeForm (create) and as edit modal.
 *
 * Handles paise conversion via MoneyInput.
 * Shows note per BL-030: "Applies from next payroll run only — historical payslips unchanged."
 *
 * Salary breakdown (prototype-aligned):
 *   - Basic Salary          (required)
 *   - HRA                   (optional component)
 *   - Transport Allowance   (optional component)
 *   - Other Allowances      (optional component)
 *
 * When any of the three component fields is non-zero the component sum is
 * auto-written into allowances_paise before submit. The server validates that
 * the sum equals allowances_paise when all three are present.
 *
 * Props:
 *   mode         — 'create' | 'edit'
 *   control      — RHF control (caller owns the form)
 *   setValue     — RHF setValue
 *   watch        — RHF watch
 *   errors       — RHF field errors for salary fields
 */

import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, UseFormSetValue, UseFormWatch, FieldValues } from 'react-hook-form';
import { MoneyInput } from './MoneyInput';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';

// The shape this form controls within the parent form
export interface SalaryFormValues {
  'salaryStructure.basic_paise': number;
  'salaryStructure.allowances_paise': number;
  'salaryStructure.effectiveFrom': string;
  'salaryStructure.hra_paise': number;
  'salaryStructure.transport_paise': number;
  'salaryStructure.other_paise': number;
}

interface SalaryStructureFormProps {
  mode?: 'create' | 'edit';
  // Using FieldValues (the base type) allows any concrete form schema to be passed
  // without violating TypeScript's contravariant Control generic. This is safe because
  // the component only reads/writes via named Controller fields.
  control: Control<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  errors?: FieldErrors<FieldValues>;
}

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function SalaryStructureForm({
  mode = 'create',
  control,
  setValue,
  watch,
  errors,
}: SalaryStructureFormProps) {
  const basicPaise: number = watch('salaryStructure.basic_paise') ?? 0;
  const hraPaise: number = watch('salaryStructure.hra_paise') ?? 0;
  const transportPaise: number = watch('salaryStructure.transport_paise') ?? 0;
  const otherPaise: number = watch('salaryStructure.other_paise') ?? 0;

  // Auto-compute allowances_paise from the three component fields
  const componentAllowancesPaise = hraPaise + transportPaise + otherPaise;
  const grossPaise = basicPaise + componentAllowancesPaise;
  const grossRupees = Math.floor(grossPaise / 100);
  const componentRupees = Math.floor(componentAllowancesPaise / 100);

  // Keep allowances_paise in sync with the component sum
  useEffect(() => {
    setValue('salaryStructure.allowances_paise', componentAllowancesPaise);
  }, [componentAllowancesPaise, setValue]);

  return (
    <div className="space-y-4">
      {mode === 'edit' && (
        <div className="bg-softmint border border-mint rounded-lg px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-forest mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-forest leading-relaxed">
            <span className="font-semibold">Note:</span> Applies from next payroll run only — historical payslips remain unchanged.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Basic Salary */}
        <div>
          <Controller
            name="salaryStructure.basic_paise"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="salary-basic"
                label="Basic Salary"
                required
                valuePaise={field.value ?? 0}
                onChangePaise={(paise) => field.onChange(paise)}
                error={(errors?.salaryStructure as { basic_paise?: { message?: string } })?.basic_paise?.message}
              />
            )}
          />
        </div>

        {/* HRA */}
        <div>
          <Controller
            name="salaryStructure.hra_paise"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="salary-hra"
                label="HRA"
                valuePaise={field.value ?? 0}
                onChangePaise={(paise) => field.onChange(paise)}
                error={(errors?.salaryStructure as { hra_paise?: { message?: string } })?.hra_paise?.message}
              />
            )}
          />
        </div>

        {/* Transport Allowance */}
        <div>
          <Controller
            name="salaryStructure.transport_paise"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="salary-transport"
                label="Transport Allowance"
                valuePaise={field.value ?? 0}
                onChangePaise={(paise) => field.onChange(paise)}
                error={(errors?.salaryStructure as { transport_paise?: { message?: string } })?.transport_paise?.message}
              />
            )}
          />
        </div>

        {/* Other Allowances */}
        <div>
          <Controller
            name="salaryStructure.other_paise"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="salary-other"
                label="Other Allowances"
                valuePaise={field.value ?? 0}
                onChangePaise={(paise) => field.onChange(paise)}
                error={(errors?.salaryStructure as { other_paise?: { message?: string } })?.other_paise?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Live "Total Allowances" line */}
      <div className="text-xs text-slate flex items-center justify-between px-1">
        <span>Total Allowances (HRA + Transport + Other)</span>
        <span className="font-semibold text-charcoal">
          {componentRupees > 0 ? `₹${fmt.format(componentRupees)}` : '₹ 0'}
        </span>
      </div>

      {/* Effective From */}
      <div>
        <Controller
          name="salaryStructure.effectiveFrom"
          control={control}
          render={({ field }) => (
            <div>
              <Label htmlFor="salary-effective" required>
                Effective From
              </Label>
              <input
                id="salary-effective"
                type="date"
                value={field.value ?? ''}
                onChange={field.onChange}
                className="w-full border border-sage/60 rounded-lg px-3.5 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
              />
              <FieldError
                id="salary-effective-error"
                message={(errors?.salaryStructure as { effectiveFrom?: { message?: string } })?.effectiveFrom?.message}
              />
            </div>
          )}
        />
      </div>

      {/* Gross CTC display */}
      <div className="bg-forest rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-mint/80 text-xs font-medium">Computed Gross Monthly CTC</span>
        <span className="font-heading text-white text-base font-bold">
          {grossRupees > 0 ? `₹${fmt.format(grossRupees)}` : '₹ 0'}
        </span>
      </div>
    </div>
  );
}
