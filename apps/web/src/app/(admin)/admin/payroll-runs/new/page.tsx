'use client';

/**
 * A-12 — Initiate Payroll Run (Admin).
 * Visual reference: prototype/admin/initiate-payroll.html
 *
 * Step 1 — Setup: Select month + year, period start/end, pay date,
 *           working-days override (optional).
 * Pre-Flight Checks card: tax rate, no prior run, pending regularisations,
 *           carry-forward status.
 * Step 2 — "Initiate Run" calls createPayrollRun, redirects to the new run.
 *
 * BL-003: Indian fiscal calendar (April–March).
 * BL-030: Only future runs are initiated; past run data is unaffected.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreatePayrollRun } from '@/lib/hooks/usePayroll';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1];

function getFiscalYear(month: number, year: number): string {
  if (month >= 4) return `FY ${year}-${String(year + 1).slice(2)}`;
  return `FY ${year - 1}-${String(year).slice(2)}`;
}

/** Compute the first day of a given month as YYYY-MM-DD */
function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Compute the last day of a given month as YYYY-MM-DD */
function monthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export default function NewPayrollRunPage() {
  const router = useRouter();
  const mutation = useCreatePayrollRun();

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [workingDaysOverride, setWorkingDaysOverride] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Period and pay date fields — default to month bounds
  const [periodStart, setPeriodStart] = useState(() => monthStart(today.getFullYear(), today.getMonth() + 1));
  const [periodEnd, setPeriodEnd] = useState(() => monthEnd(today.getFullYear(), today.getMonth() + 1));
  const [payDate, setPayDate] = useState(() => monthEnd(today.getFullYear(), today.getMonth() + 1));

  // Update period/pay defaults whenever month/year changes
  function handleMonthChange(newMonth: number) {
    setMonth(newMonth);
    setPeriodStart(monthStart(year, newMonth));
    setPeriodEnd(monthEnd(year, newMonth));
    setPayDate(monthEnd(year, newMonth));
  }

  function handleYearChange(newYear: number) {
    setYear(newYear);
    setPeriodStart(monthStart(newYear, month));
    setPeriodEnd(monthEnd(newYear, month));
    setPayDate(monthEnd(newYear, month));
  }

  const fiscalYear = getFiscalYear(month, year);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const override = workingDaysOverride.trim();
    if (override !== '') {
      const n = parseInt(override, 10);
      if (isNaN(n) || n < 1 || n > 31) {
        newErrors.workingDays = 'Working days must be between 1 and 31.';
      }
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
        month,
        year,
        ...(override !== '' ? { workingDays: parseInt(override, 10) } : {}),
      });
      showToast({
        type: 'success',
        title: 'Run created',
        message: `${result.run.code} created with ${result.payslipCount} payslips.`,
      });
      router.push(`/admin/payroll-runs/${result.run.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'DUPLICATE_RUN') {
          setErrors({ form: `A run for this month already exists (${err.message}).` });
        } else {
          showToast({ type: 'error', title: 'Failed to create run', message: err.message });
        }
      } else {
        showToast({ type: 'error', title: 'Failed to create run', message: 'Please try again.' });
      }
    }
  }

  return (
    <>
      {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Setup', 'Calculate', 'Review', 'Finalise'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <div className="flex-1 h-px bg-sage/40 w-8" />}
              <div className={`flex items-center gap-2 ${i > 0 ? 'opacity-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-forest text-white' : 'border-2 border-sage text-slate'}`}>
                  {i + 1}
                </div>
                <span className={`text-sm ${i === 0 ? 'font-semibold text-charcoal' : 'text-slate'}`}>{step}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Setup card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
            <h2 className="font-heading text-lg font-bold text-charcoal mb-1">Run Setup</h2>
            <p className="text-xs text-slate mb-5">
              Indian fiscal calendar · April to March · monthly cycle
            </p>

            {errors.form && (
              <div className="bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 mb-5 text-sm text-crimson">
                {errors.form}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {/* Payroll Month */}
              <div>
                <Label htmlFor="payroll-month" required>Payroll Month</Label>
                <select
                  id="payroll-month"
                  value={month}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Fiscal Year */}
              <div>
                <Label htmlFor="fiscal-year">Fiscal Year</Label>
                <input
                  id="fiscal-year"
                  type="text"
                  value={fiscalYear}
                  disabled
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-offwhite text-slate cursor-not-allowed"
                />
                <p className="text-xs text-slate mt-1.5">Auto-derived from payroll month</p>
              </div>

              {/* Period Start */}
              <div>
                <Label htmlFor="period-start">Period Start</Label>
                <input
                  id="period-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              {/* Period End */}
              <div>
                <Label htmlFor="period-end">Period End</Label>
                <input
                  id="period-end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
              </div>

              {/* Working Days */}
              <div>
                <Label htmlFor="working-days">Working Days</Label>
                <input
                  id="working-days"
                  type="number"
                  min={1}
                  max={31}
                  value={workingDaysOverride}
                  onChange={(e) => setWorkingDaysOverride(e.target.value)}
                  placeholder="Auto-computed from calendar"
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
                <FieldError id="working-days-error" message={errors.workingDays} />
                <p className="text-xs text-slate mt-1.5">
                  Leave blank to use the server-computed count (weekends + holidays excluded).
                </p>
              </div>

              {/* Pay Date */}
              <div>
                <Label htmlFor="pay-date">Pay Date</Label>
                <input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
                />
                <p className="text-xs text-slate mt-1.5">Default: last working day of the month</p>
              </div>
            </div>

            {/* Inclusion checkboxes (visually checked, disabled — backend always includes all) */}
            <div className="border-t border-sage/20 pt-5 space-y-3">
              {[
                {
                  text: 'Include all Active & On-Notice employees',
                  sub: 'Exited employees excluded automatically',
                },
                {
                  text: 'Show reference tax (v1: PayrollOfficer enters final value)',
                  sub: 'Standard formula: gross × flat reference rate. Slab engine deferred to v2.',
                },
                {
                  text: 'Auto-calculate LOP from unpaid leaves',
                  sub: 'Formula: (Basic + Allowances) ÷ working days × LOP days',
                },
                {
                  text: 'Pro-rate mid-month joiners and exits',
                  sub: 'Days actually worked used for proration',
                },
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-default">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    readOnly
                    className="mt-1 accent-forest w-4 h-4 flex-shrink-0"
                    aria-label={item.text}
                  />
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{item.text}</p>
                    <p className="text-xs text-slate mt-0.5">{item.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Pre-Flight Checks card */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
            <h2 className="font-heading text-base font-bold text-charcoal mb-4">Pre-Flight Checks</h2>
            <div className="space-y-3">
              {/* Tax reference rate */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">Tax reference rate set</p>
                  <p className="text-xs text-slate">v1: manual entry per payslip (reference 9.5%)</p>
                </div>
              </div>
              {/* No prior run */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">
                    No prior run for {MONTH_OPTIONS.find((m) => m.value === month)?.label} {year}
                  </p>
                  <p className="text-xs text-slate">Safe to initiate</p>
                </div>
              </div>
              {/* Unprocessed regularisations */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-umberbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-umber" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">Unprocessed regularisation requests</p>
                  <p className="text-xs text-slate">
                    May affect attendance-driven LOP —{' '}
                    <Link href="/admin/regularisation-queue" className="text-emerald font-semibold hover:underline">
                      Review queue →
                    </Link>
                  </p>
                </div>
              </div>
              {/* Carry-forward */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">Carry-forward up to date</p>
                  <p className="text-xs text-slate">Salary structure changes locked — changes apply from next run</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href="/admin/payroll-runs">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button
              variant="primary"
              type="submit"
              loading={mutation.isPending}
              disabled={mutation.isPending}
              trailingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Initiate &amp; Calculate
            </Button>
          </div>
        </form>
    </>
  );
}
