'use client';

/**
 * A-10 — Admin Regularisation Queue
 * Visual reference: prototype/admin/regularisation-queue.html
 *
 * Layout (prototype-exact):
 *   1. umberbg warning banner — "Admin Review Required: Records older than 7 days…"
 *   2. 3-tile KPI strip — Pending Admin Approval / Approved This Month / Rejected
 *   3. Filter bar — Status + From Date + To Date + Employee Search + Apply
 *   4. Table — Employee | EMP Code | For Date | Requested On | Days Old |
 *              Original Record | Correction Requested | Status | Actions
 *   5. Actions cell: Approve + Reject stacked buttons + audit italic subtext
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { RegularisationStatusBadge } from '@/components/attendance/RegularisationStatusBadge';
import { RegularisationApprovalActions } from '@/components/attendance/RegularisationApprovalActions';
import { useRegularisations } from '@/lib/hooks/useRegularisations';
import { REG_STATUS } from '@/lib/status/maps';
import type { RegStatusValue } from '@nexora/contracts/attendance';

type FilterStatus = 'all' | RegStatusValue;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── KPI Tile ───────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiTile({ label, count, icon, iconBg }: KpiTileProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-heading font-bold text-charcoal">{count}</p>
        <p className="text-sm text-slate font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminRegularisationQueuePage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(REG_STATUS.Pending);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    status: REG_STATUS.Pending as FilterStatus,
    employee: '',
    fromDate: '',
    toDate: '',
  });

  // Build query from applied filters
  const query = {
    routedToId: 2 as const,
    ...(appliedFilters.status !== 'all' ? { status: appliedFilters.status as RegStatusValue } : {}),
    ...(appliedFilters.fromDate ? { fromDate: appliedFilters.fromDate } : {}),
    ...(appliedFilters.toDate ? { toDate: appliedFilters.toDate } : {}),
  };

  const { data, isLoading, isError, error, refetch } = useRegularisations(query);

  // All rows from the query (unfiltered by employee name)
  const allRows = data?.data ?? [];

  // Client-side employee name search
  const filteredRows = useMemo(() => {
    const q = appliedFilters.employee.toLowerCase().trim();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, appliedFilters.employee]);

  // Pending-first sort
  const sorted = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (a.status === REG_STATUS.Pending && b.status !== REG_STATUS.Pending) return -1;
      if (a.status !== REG_STATUS.Pending && b.status === REG_STATUS.Pending) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredRows]);

  // KPI counts — always from full unfiltered rows of that query
  const pendingCount = allRows.filter((r) => r.status === REG_STATUS.Pending).length;
  const approvedCount = allRows.filter((r) => r.status === REG_STATUS.Approved).length;
  const rejectedCount = allRows.filter((r) => r.status === REG_STATUS.Rejected).length;

  const handleApply = () => {
    setAppliedFilters({
      status: statusFilter,
      employee: employeeSearch,
      fromDate,
      toDate,
    });
  };

  return (
    <div className="space-y-5">

      {/* umberbg warning banner — BL-029 */}
      <div className="flex items-start gap-3 bg-umberbg border border-umber/25 rounded-xl px-5 py-4" role="note">
        <svg className="w-5 h-5 text-umber shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-sm text-umber">
          <span className="font-bold">Admin Review Required:</span>{' '}
          Records older than 7 days require Admin approval per BL-029. Regularisation requests that
          are 7 days or fewer are handled directly by the employee's reporting manager.
        </p>
      </div>

      {/* 3-tile KPI strip */}
      <div className="grid grid-cols-3 gap-5">
        <KpiTile
          label="Pending Admin Approval"
          count={pendingCount}
          iconBg="bg-umberbg"
          icon={
            <svg className="w-6 h-6 text-umber" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <KpiTile
          label="Approved This Month"
          count={approvedCount}
          iconBg="bg-greenbg"
          icon={
            <svg className="w-6 h-6 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <KpiTile
          label="Rejected"
          count={rejectedCount}
          iconBg="bg-crimsonbg"
          icon={
            <svg className="w-6 h-6 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-status" className="text-xs font-semibold text-slate uppercase tracking-wide">Status</label>
          <select
            id="reg-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as RegStatusValue)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
          >
            <option value={REG_STATUS.Pending}>Pending</option>
            <option value="all">All</option>
            <option value={REG_STATUS.Approved}>Approved</option>
            <option value={REG_STATUS.Rejected}>Rejected</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-from" className="text-xs font-semibold text-slate uppercase tracking-wide">From Date</label>
          <input
            id="reg-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-to" className="text-xs font-semibold text-slate uppercase tracking-wide">To Date</label>
          <input
            id="reg-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label htmlFor="reg-emp" className="text-xs font-semibold text-slate uppercase tracking-wide">Search Employee</label>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="reg-emp"
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Employee name or code…"
              className="border border-sage/50 rounded-lg pl-9 pr-3 py-2 text-sm text-charcoal bg-white w-full focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>
        </div>
        <div>
          <button
            onClick={handleApply}
            className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between">
          <h2 className="font-heading font-bold text-charcoal text-base">
            Regularisation Requests — Admin Queue
          </h2>
          <span className="text-sm text-slate">{sorted.length} requests</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading admin regularisation queue…" />
          </div>
        ) : isError ? (
          <div role="alert" className="text-crimson text-sm py-8 text-center px-5">
            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-offwhite border-b border-sage/20">
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Employee</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">EMP Code</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">For Date</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Requested On</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Days Old</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Original Record</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Correction Requested</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Status</th>
                  <th scope="col" className="text-left px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-sm text-slate py-10">
                      No regularisation requests in the admin queue.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => {
                    const initials = r.employeeName.slice(0, 2).toUpperCase();
                    const isPending = r.status === REG_STATUS.Pending;
                    // Original record info is not in summary — show "view detail for context"
                    // proposedCheckIn/Out are in detail not summary, so we surface what we have
                    return (
                      <tr key={r.id} className="hover:bg-offwhite/60 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPending ? 'bg-forest/10 text-forest' : r.status === REG_STATUS.Approved ? 'bg-greenbg text-richgreen' : 'bg-crimsonbg text-crimson'}`}
                              aria-hidden="true"
                            >
                              {initials}
                            </div>
                            <span className="font-medium text-charcoal">{r.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate font-mono text-xs">{r.employeeCode}</td>
                        <td className="px-4 py-4 text-charcoal font-medium">{fmtDate(r.date)}</td>
                        <td className="px-4 py-4 text-slate text-xs">{fmtDate(r.createdAt)}</td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${r.ageDaysAtSubmit > 7 ? 'bg-crimsonbg text-crimson' : 'bg-umberbg text-umber'}`}>
                            {r.ageDaysAtSubmit} days old
                          </span>
                        </td>
                        {/* Original Record — detail endpoint has this; list summary does not.
                            Show a "View" link for full context per BL-007 */}
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/regularisation-queue/${r.id}`}
                            className="text-xs text-forest hover:underline"
                            aria-label={`View original record for ${r.employeeName}`}
                          >
                            View detail →
                          </Link>
                        </td>
                        {/* Correction Requested — also in detail endpoint */}
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/regularisation-queue/${r.id}`}
                            className="text-xs text-forest hover:underline"
                            aria-label={`View correction for ${r.employeeName}`}
                          >
                            View detail →
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <RegularisationStatusBadge status={r.status} routedToId={r.routedToId} />
                        </td>
                        <td className="px-4 py-4">
                          {isPending ? (
                            <div className="space-y-2">
                              <RegularisationApprovalActions
                                regularisationId={r.id}
                                version={0}
                                onDecision={() => refetch()}
                              />
                              <p className="text-xs text-slate italic">
                                Audit: Original record preserved per BL-007.
                              </p>
                            </div>
                          ) : (
                            <Link
                              href={`/admin/regularisation-queue/${r.id}`}
                              className="border border-forest text-forest hover:bg-softmint px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                            >
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
