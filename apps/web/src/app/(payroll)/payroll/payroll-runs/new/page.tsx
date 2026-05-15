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

/** Indian fiscal-year bounds for (month, year) — April 1st → March 31st. */
function fiscalYearBounds(month: number, year: number): { start: string; end: string } {
  const fyStartYear = month >= 4 ? year : year - 1;
  return { start: `${fyStartYear}-04-01`, end: `${fyStartYear + 1}-03-31` };
}

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export default function PONewPayrollRunPage() {
  const router = useRouter();
  const mutation = useCreatePayrollRun();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [workingDaysOverride, setWorkingDaysOverride] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [periodStart, setPeriodStart] = useState(() => monthStart(today.getFullYear(), today.getMonth() + 1));
  const [periodEnd, setPeriodEnd] = useState(() => monthEnd(today.getFullYear(), today.getMonth() + 1));
  const [payDate, setPayDate] = useState(() => monthEnd(today.getFullYear(), today.getMonth() + 1));

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
  const fyBounds = fiscalYearBounds(month, year);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const override = workingDaysOverride.trim();
    if (override !== '') {
      const n = parseInt(override, 10);
      if (isNaN(n) || n < 1 || n > 31) newErrors.workingDays = 'Working days must be between 1 and 31.';
    }
    if (periodStart < fyBounds.start || periodStart > fyBounds.end) {
      newErrors.periodStart = `Must fall within ${fiscalYear} (${fyBounds.start} – ${fyBounds.end}).`;
    }
    if (periodEnd < fyBounds.start || periodEnd > fyBounds.end) {
      newErrors.periodEnd = `Must fall within ${fiscalYear} (${fyBounds.start} – ${fyBounds.end}).`;
    }
    if (!newErrors.periodStart && !newErrors.periodEnd && periodEnd < periodStart) {
      newErrors.periodEnd = 'Period end must be on or after period start.';
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
    <>
        <form onSubmit={handleSubmit}>
          {/* Setup card */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
            <h2 className="font-heading text-lg font-bold text-charcoal mb-1">Run Setup</h2>
            <p className="text-xs text-slate mb-5">Indian fiscal calendar · April to March · monthly cycle</p>

            {errors.form && (
              <div className="bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 mb-5 text-sm text-crimson">{errors.form}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <Label htmlFor="po-payroll-month" required>Payroll Month</Label>
                <select id="po-payroll-month" value={month} onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20">
                  {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="po-fiscal-year">Fiscal Year</Label>
                <input id="po-fiscal-year" type="text" value={fiscalYear} disabled
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm bg-offwhite text-slate cursor-not-allowed" />
                <p className="text-xs text-slate mt-1.5">Auto-derived from payroll month</p>
              </div>
              <div>
                <Label htmlFor="po-period-start">Period Start</Label>
                <input id="po-period-start" type="date" value={periodStart}
                  min={fyBounds.start} max={fyBounds.end}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  aria-describedby={errors.periodStart ? 'po-period-start-error' : 'po-period-start-hint'}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20" />
                <p id="po-period-start-hint" className="text-xs text-slate mt-1.5">
                  Must lie within {fiscalYear}.
                </p>
                <FieldError id="po-period-start-error" message={errors.periodStart} />
              </div>
              <div>
                <Label htmlFor="po-period-end">Period End</Label>
                <input id="po-period-end" type="date" value={periodEnd}
                  min={fyBounds.start} max={fyBounds.end}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  aria-describedby={errors.periodEnd ? 'po-period-end-error' : 'po-period-end-hint'}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20" />
                <p id="po-period-end-hint" className="text-xs text-slate mt-1.5">
                  Must lie within {fiscalYear}.
                </p>
                <FieldError id="po-period-end-error" message={errors.periodEnd} />
              </div>
              <div>
                <Label htmlFor="po-working-days">Working Days (optional)</Label>
                <input id="po-working-days" type="number" min={1} max={31} value={workingDaysOverride}
                  onChange={(e) => setWorkingDaysOverride(e.target.value)}
                  placeholder="Auto-computed"
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20" />
                <FieldError id="po-working-days-error" message={errors.workingDays} />
              </div>
              <div>
                <Label htmlFor="po-pay-date">Pay Date</Label>
                <input id="po-pay-date" type="date" value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 w-full border border-sage/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20" />
                <p className="text-xs text-slate mt-1.5">Default: last working day of the month</p>
              </div>
            </div>

            {/* Inclusion checkboxes */}
            <div className="border-t border-sage/20 pt-5 space-y-3">
              {[
                { text: 'Include all Active & On-Notice employees', sub: 'Exited employees excluded automatically' },
                { text: 'Show reference tax (v1: PayrollOfficer enters final value)', sub: 'Standard formula: gross × flat reference rate. Slab engine deferred to v2.' },
                { text: 'Auto-calculate LOP from unpaid leaves', sub: 'Formula: (Basic + Allowances) ÷ working days × LOP days' },
                { text: 'Pro-rate mid-month joiners and exits', sub: 'Days actually worked used for proration' },
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-default">
                  <input type="checkbox" checked disabled readOnly className="mt-1 accent-forest w-4 h-4 flex-shrink-0" aria-label={item.text} />
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{item.text}</p>
                    <p className="text-xs text-slate mt-0.5">{item.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Pre-Flight Checks */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
            <h2 className="font-heading text-base font-bold text-charcoal mb-4">Pre-Flight Checks</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div><p className="text-sm font-semibold text-charcoal">Tax reference rate set</p><p className="text-xs text-slate">v1: manual entry per payslip (reference 9.5%)</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">No prior run for {MONTH_OPTIONS.find((m) => m.value === month)?.label} {year}</p>
                  <p className="text-xs text-slate">Safe to initiate</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-umberbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-umber" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">Unprocessed regularisation requests</p>
                  {/* PayrollOfficer has no access to the regularisation queue
                      (Manager / Admin only) — the route 404s for this role, so
                      we surface the heads-up without a drill-in link. PO should
                      coordinate with Admin/Manager out-of-band if pending regs
                      need clearing before the run. */}
                  <p className="text-xs text-slate">May affect attendance-driven LOP — ask an Admin or Manager to clear the queue before initiating.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div><p className="text-sm font-semibold text-charcoal">Carry-forward up to date</p><p className="text-xs text-slate">Salary structure changes locked for this period</p></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href="/payroll/payroll-runs">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button variant="primary" type="submit" loading={mutation.isPending} disabled={mutation.isPending}
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
