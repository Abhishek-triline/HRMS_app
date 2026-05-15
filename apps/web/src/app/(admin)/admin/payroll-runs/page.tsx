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
import { usePayrollRuns, useReversals } from '@/lib/hooks/usePayroll';
import { PayrollRunStatusBadge } from '@/components/payroll/PayrollRunStatusBadge';
import { MoneyDisplay } from '@/components/payroll/MoneyDisplay';
import { ReversalHistoryTable } from '@/components/payroll/ReversalHistoryTable';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PayrollRunStatus } from '@nexora/contracts/payroll';
import type { PayrollRunStatusValue, PayrollRunSummary } from '@nexora/contracts/payroll';
import { PAYROLL_STATUS_MAP } from '@/lib/status/maps';

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

const STATUS_OPTIONS: Array<{ label: string; value: PayrollRunStatusValue | '' }> = [
  { label: 'All Status', value: '' },
  { label: 'Draft', value: PayrollRunStatus.Draft },
  { label: 'Review', value: PayrollRunStatus.Review },
  { label: 'Finalised', value: PayrollRunStatus.Finalised },
  { label: 'Reversed', value: PayrollRunStatus.Reversed },
];

export default function PayrollRunsPage() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<PayrollRunStatusValue | ''>('');

  const { data, isLoading, isError } = usePayrollRuns({
    year,
    status: status || undefined,
  });

  const runs = data?.data ?? [];

  // Reversal history — embedded below the run history table on this same
  // page (admin only). PO still uses the standalone /payroll/reversal-history
  // route. The data hook is independent of the year/status filter so the
  // reversal list shows the full company history regardless of the filters
  // applied to the main runs table above.
  const reversalsQuery = useReversals();
  const reversals = reversalsQuery.data?.data ?? [];

  // Compute simple stat tiles from run list
  const finalised = runs.filter((r) => r.status === PayrollRunStatus.Finalised);
  const lastFinalised = finalised[0];
  const ytdNet = finalised.reduce((acc, r) => acc + r.totalNetPaise, 0);
  const reversalCount = runs.filter((r) => r.status === PayrollRunStatus.Reversed).length;
  const draftRun = runs.find((r) => r.status === PayrollRunStatus.Draft);

  return (
    <>
      {/* Page section header — matches prototype */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-xl font-bold text-charcoal">All Payroll Runs</h2>
          <p className="text-xs text-slate mt-0.5">Indian fiscal year — April to March</p>
        </div>
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
          <p className="text-xs text-slate mt-1">Last 12 months</p>
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
              onChange={(e) => setStatus(e.target.value ? Number(e.target.value) as PayrollRunStatusValue : '')}
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
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3 uppercase">Period</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Employees</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Gross</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">LOP</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Tax</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Net</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Status</th>
                    <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Action</th>
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
                      <tr key={run.id} className="hover:bg-offwhite/50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-charcoal">
                          {MONTH_NAMES[run.month]} {run.year}
                        </td>
                        <td className="px-4 py-3 text-slate">{run.employeeCount}</td>
                        <td className="px-4 py-3 text-slate">
                          <MoneyDisplay paise={run.totalGrossPaise} />
                          {(run.status === PayrollRunStatus.Draft || run.status === PayrollRunStatus.Review) && '*'}
                        </td>
                        <td className="px-4 py-3 text-crimson">
                          <MoneyDisplay paise={getLopPaise(run)} />
                        </td>
                        <td className="px-4 py-3 text-slate">
                          <MoneyDisplay paise={getTaxPaise(run)} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-charcoal">
                          <MoneyDisplay paise={run.totalNetPaise} />
                          {(run.status === PayrollRunStatus.Draft || run.status === PayrollRunStatus.Review) && '*'}
                        </td>
                        <td className="px-4 py-3">
                          <PayrollRunStatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/payroll-runs/${run.id}`}
                            className="text-xs text-emerald font-semibold hover:underline"
                          >
                            {run.status === PayrollRunStatus.Draft || run.status === PayrollRunStatus.Review ? 'Continue →' : 'View →'}
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

      {/* Footer disclaimer — matches prototype exactly */}
      <p className="text-xs text-slate mt-3">* Estimated amounts for Draft runs. Final figures available after finalisation.</p>

      {/* Reversal History — embedded on this page so admins don't have to
          hop to a separate route. PO panel still uses the standalone
          /payroll/reversal-history page. */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-sage/20">
          <h2 className="text-sm font-semibold text-charcoal">
            Reversal History
            <span className="ml-2 text-xs font-normal text-slate">
              {reversalsQuery.isLoading
                ? '— loading…'
                : `— ${reversals.length} reversal${reversals.length !== 1 ? 's' : ''} on record`}
            </span>
          </h2>
          <p className="text-xs text-slate mt-0.5">All Admin-initiated payroll run reversals</p>
        </div>
        {reversalsQuery.isError ? (
          <div className="text-center py-8 text-crimson text-sm">
            Failed to load reversal history. Please refresh.
          </div>
        ) : (
          <ReversalHistoryTable items={reversals} isLoading={reversalsQuery.isLoading} />
        )}
      </div>
    </>
  );
}
