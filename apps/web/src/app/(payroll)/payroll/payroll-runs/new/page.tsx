'use client';

/**
 * P-03 — Initiate Payroll Run (PayrollOfficer).
 * Identical to A-12 but routes to /payroll/payroll-runs.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreatePayrollRun } from '@/lib/hooks/usePayroll';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1];

function getFiscalYear(month: number, year: number): string {
  if (month >= 4) return `FY ${year}-${String(year + 1).slice(2)}`;
  return `FY ${year - 1}-${String(year).slice(2)}`;
}

export default function PONewPayrollRunPage() {
  const router = useRouter();
  const mutation = useCreatePayrollRun();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [workingDaysOverride, setWorkingDaysOverride] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fiscalYear = getFiscalYear(month, year);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const override = workingDaysOverride.trim();
    if (override !== '') {
      const n = parseInt(override, 10);
      if (isNaN(n) || n < 1 || n > 31) newErrors.workingDays = 'Working days must be between 1 and 31.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const override = workingDaysOverride.trim();
    try {
      const result = await mutation.mutateAsync({
        month, year,
        ...(override !== '' ? { workingDays: parseInt(override, 10) } : {}),
      });
      showToast({ type: 'success', title: 'Run created', message: `${result.run.code} created with ${result.payslipCount} payslips.` });
      router.push(`/payroll/payroll-runs/${result.run.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_RUN') {
        setErrors({ form: `A run for this month already exists (${err.message}).` });
      } else {
        showToast({ type: 'error', title: 'Failed to create run', message: err instanceof ApiError ? err.message : 'Please try again.' });
      }
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-slate mb-4">
          <Link href="/payroll/payroll-runs" className="hover:text-forest transition-colors">Payroll Runs</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">New Run</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
            <h2 className="font-heading text-lg font-bold text-charcoal mb-1">Initiate Payroll Run</h2>
            <p className="text-xs text-slate mb-5">Indian fiscal calendar · April to March · monthly cycle</p>

            {errors.form && (
              <div className="bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 mb-5 text-sm text-crimson">{errors.form}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="po-payroll-month" required>Payroll Month</Label>
                <select id="po-payroll-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20">
                  {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="po-payroll-year" required>Year</Label>
                <select id="po-payroll-year" value={year} onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20">
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="po-fiscal-year">Fiscal Year</Label>
                <input id="po-fiscal-year" type="text" value={fiscalYear} disabled
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-offwhite text-slate cursor-not-allowed" />
              </div>
              <div>
                <Label htmlFor="po-working-days">Working Days (optional)</Label>
                <input id="po-working-days" type="number" min={1} max={31} value={workingDaysOverride}
                  onChange={(e) => setWorkingDaysOverride(e.target.value)}
                  placeholder="Auto-computed"
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20" />
                <FieldError id="po-working-days-error" message={errors.workingDays} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href="/payroll/payroll-runs">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button variant="primary" type="submit" loading={mutation.isPending} disabled={mutation.isPending}>
              Continue &amp; Calculate
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
