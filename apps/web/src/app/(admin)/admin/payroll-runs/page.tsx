'use client';

/**
 * A-11 — Payroll Runs List (Admin).
 * Visual reference: prototype/admin/payroll-runs.html
 *
 * Features:
 * - Stat tiles: current month draft, last finalised, YTD disbursed, reversal count.
 * - Run history table with year + status filters.
 * - "Initiate Run" CTA links to /admin/payroll-runs/new.
 * - Quick links to Reversal History and Tax Settings in the header.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePayrollRuns } from '@/lib/hooks/usePayroll';
import { PayrollRunStatusBadge } from '@/components/payroll/PayrollRunStatusBadge';
import { MoneyDisplay } from '@/components/payroll/MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { PayrollRunStatus, PayrollRunSummary } from '@nexora/contracts/payroll';

/** PayrollRunSummary doesn't include LOP/Tax — access them safely from the runtime payload. */
function getLopPaise(run: PayrollRunSummary): number {
  return (run as unknown as { totalLopPaise?: number }).totalLopPaise ?? 0;
}
function getTaxPaise(run: PayrollRunSummary): number {
  return (run as unknown as { totalTaxPaise?: number }).totalTaxPaise ?? 0;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const FY_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const STATUS_OPTIONS: Array<{ label: string; value: PayrollRunStatus | '' }> = [
  { label: 'All Status', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Review', value: 'Review' },
  { label: 'Finalised', value: 'Finalised' },
  { label: 'Reversed', value: 'Reversed' },
];

export default function PayrollRunsPage() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<PayrollRunStatus | ''>('');

  const { data, isLoading, isError } = usePayrollRuns({
    year,
    status: status || undefined,
  });

  const runs = data?.data ?? [];

  // Compute simple stat tiles from run list
  const finalised = runs.filter((r) => r.status === 'Finalised');
  const lastFinalised = finalised[0];
  const ytdNet = finalised.reduce((acc, r) => acc + r.totalNetPaise, 0);
  const reversalCount = runs.filter((r) => r.status === 'Reversed').length;
  const draftRun = runs.find((r) => r.status === 'Draft');

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-charcoal">All Payroll Runs</h1>
          <p className="text-xs text-slate mt-0.5">Indian fiscal year — April to March</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/reversal-history" className="text-xs text-emerald font-semibold hover:underline">
            Reversal History →
          </Link>
          <Link href="/admin/tax-config" className="text-xs text-emerald font-semibold hover:underline">
            Tax Settings
          </Link>
          <Link href="/admin/payroll-runs/new">
            <Button variant="primary" size="sm" leadingIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              Initiate Run
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
          <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">Current Month</p>
          {draftRun ? (
            <>
              <p className="font-heading text-base font-bold text-charcoal">
                {MONTH_NAMES[draftRun.month]} {draftRun.year}
              </p>
              <PayrollRunStatusBadge status={draftRun.status} className="mt-2" />
            </>
          ) : (
            <p className="text-sm text-slate italic">No active run</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
          <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">Last Finalised</p>
          {lastFinalised ? (
            <>
              <p className="font-heading text-base font-bold text-charcoal">
                {MONTH_NAMES[lastFinalised.month]} {lastFinalised.year}
              </p>
              <p className="text-xs text-slate mt-2">
                <MoneyDisplay paise={lastFinalised.totalNetPaise} /> · {lastFinalised.employeeCount} employees
              </p>
            </>
          ) : (
            <p className="text-sm text-slate italic">None yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
          <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">YTD Disbursed</p>
          <p className="font-heading text-2xl font-bold text-richgreen">
            <MoneyDisplay paise={ytdNet} />
          </p>
          <p className="text-xs text-slate mt-1">Finalised runs only</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
          <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">Reversals</p>
          <p className="font-heading text-2xl font-bold text-charcoal">{reversalCount}</p>
          <p className="text-xs text-slate mt-1">All time</p>
        </div>
      </div>

      {/* Runs table */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage/20">
          <h2 className="text-sm font-semibold text-charcoal">Run History</h2>
          <div className="flex gap-2">
            <select
              value={year ?? ''}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
              className="border border-sage/50 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
              aria-label="Filter by fiscal year"
            >
              <option value="">All Years</option>
              {FY_OPTIONS.map((y) => (
                <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollRunStatus | '')}
              className="border border-sage/50 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
            <span className="ml-2 text-sm text-slate">Loading payroll runs…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-crimson text-sm">
            Failed to load payroll runs. Please refresh.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" aria-label="Payroll run history">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/20">
                    <th scope="col" className="text-left px-5 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Period</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Employees</th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Gross</th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">LOP</th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Tax</th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Net</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Status</th>
                    <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10">
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate text-sm">
                        No payroll runs found. Use "Initiate Run" to start the first run.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="hover:bg-offwhite/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-charcoal">
                            {MONTH_NAMES[run.month]} {run.year}
                          </span>
                          {run.code && (
                            <p className="text-xs text-slate font-mono mt-0.5">{run.code}{run.reversalOfRunId ? ' · reversal' : ''}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate">{run.employeeCount}</td>
                        <td className="px-4 py-3.5 text-right text-charcoal">
                          <MoneyDisplay paise={run.totalGrossPaise} />
                          {(run.status === 'Draft' || run.status === 'Review') && (
                            <span className="text-slate text-[10px]">*</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right text-crimson font-semibold">
                          <MoneyDisplay paise={getLopPaise(run)} />
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate">
                          <MoneyDisplay paise={getTaxPaise(run)} />
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-charcoal">
                          <MoneyDisplay paise={run.totalNetPaise} />
                          {(run.status === 'Draft' || run.status === 'Review') && (
                            <span className="text-slate text-[10px]">*</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <PayrollRunStatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Link
                            href={`/admin/payroll-runs/${run.id}`}
                            className="text-forest text-xs font-semibold hover:underline"
                          >
                            {run.status === 'Draft' || run.status === 'Review' ? 'Continue →' : 'View →'}
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-4">
              {runs.length === 0 ? (
                <p className="text-center text-slate text-sm py-8">No payroll runs found.</p>
              ) : (
                runs.map((run) => (
                  <Link key={run.id} href={`/admin/payroll-runs/${run.id}`} className="block bg-white border border-sage/30 rounded-xl p-4 hover:border-forest/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-forest font-semibold">{run.code}</span>
                      <PayrollRunStatusBadge status={run.status} />
                    </div>
                    <p className="text-sm font-semibold text-charcoal">{MONTH_NAMES[run.month]} {run.year}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-slate">Employees</p>
                        <p className="font-semibold">{run.employeeCount}</p>
                      </div>
                      <div>
                        <p className="text-slate">Gross</p>
                        <p className="font-semibold"><MoneyDisplay paise={run.totalGrossPaise} /></p>
                      </div>
                      <div>
                        <p className="text-slate">Net</p>
                        <p className="font-semibold text-richgreen"><MoneyDisplay paise={run.totalNetPaise} /></p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer disclaimer */}
      <p className="text-xs text-slate mt-3 italic">
        * Estimated amounts for Draft runs. Final figures available after finalisation.
      </p>
    </div>
  );
}
