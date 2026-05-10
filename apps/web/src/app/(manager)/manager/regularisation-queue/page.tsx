'use client';

/**
 * M-06 — Regularisation Approvals (Manager)
 * Visual reference: prototype/manager/regularisation-queue.html
 *
 * Layout (prototype-exact):
 *   1. umberbg warning banner — "Pending Manager Decisions: Records within 7 days…"
 *   2. 3-tile KPI strip — Pending / Approved This Month / Rejected
 *   3. Filter bar — Status + From Date + To Date + Employee Search + Apply
 *   4. Table — Employee | For Date | Days Old | Original Record |
 *              Correction Requested | Submitted | Status | Actions
 *   5. Actions cell: stacked Approve + Reject buttons + audit italic subtext
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { RegularisationStatusBadge } from '@/components/attendance/RegularisationStatusBadge';
import { RegularisationApprovalActions } from '@/components/attendance/RegularisationApprovalActions';
import { useRegularisations } from '@/lib/hooks/useRegularisations';
import type { RegStatus } from '@nexora/contracts/attendance';

type FilterStatus = 'all' | RegStatus;

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

export default function ManagerRegularisationQueuePage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    status: 'all' as FilterStatus,
    employee: '',
    fromDate: '',
    toDate: '',
  });

  const query = {
    ...(appliedFilters.status !== 'all' ? { status: appliedFilters.status as RegStatus } : {}),
    ...(appliedFilters.fromDate ? { fromDate: appliedFilters.fromDate } : {}),
    ...(appliedFilters.toDate ? { toDate: appliedFilters.toDate } : {}),
  };

  const { data, isLoading, isError, error, refetch } = useRegularisations(query);

  const rows = data?.data ?? [];

  // Client-side employee search
  const filteredRows = useMemo(() => {
    const q = appliedFilters.employee.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q),
    );
  }, [rows, appliedFilters.employee]);

  // Pending-first sort
  const sorted = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredRows]);

  const pendingCount = rows.filter((r) => r.status === 'Pending').length;
  const approvedCount = rows.filter((r) => r.status === 'Approved').length;
  const rejectedCount = rows.filter((r) => r.status === 'Rejected').length;
  const adminRoutedCount = rows.filter((r) => r.routedTo === 'Admin').length;

  const handleApply = () => {
    setAppliedFilters({
      status: statusFilter,
      employee: employeeSearch,
      fromDate,
      toDate,
    });
  };

  return (
    <div className="p-8 space-y-5">

      {/* umberbg warning banner — manager variant */}
      <div className="flex items-start gap-3 bg-umberbg border border-umber/25 rounded-xl px-5 py-4" role="note">
        <svg className="w-5 h-5 text-umber shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-sm text-umber">
          <span className="font-bold">Pending Manager Decisions:</span>{' '}
          Records within 7 days of the date require your approval. Regularisation requests
          older than 7 days are automatically routed to Admin — no manager action is required for those.
          {adminRoutedCount > 0 && (
            <span className="ml-1">({adminRoutedCount} admin-routed in current list.)</span>
          )}
        </p>
      </div>

      {/* 3-tile KPI strip */}
      <div className="grid grid-cols-3 gap-5">
        <KpiTile
          label="Pending Your Approval"
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
          <label htmlFor="mgr-reg-status" className="text-xs font-semibold text-slate uppercase tracking-wide">Status</label>
          <select
            id="mgr-reg-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
          >
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mgr-reg-from" className="text-xs font-semibold text-slate uppercase tracking-wide">From Date</label>
          <input
            id="mgr-reg-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mgr-reg-to" className="text-xs font-semibold text-slate uppercase tracking-wide">To Date</label>
          <input
            id="mgr-reg-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label htmlFor="mgr-reg-emp" className="text-xs font-semibold text-slate uppercase tracking-wide">Search Employee</label>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="mgr-reg-emp"
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
        <div className="px-5 py-4 border-b border-sage/20 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading font-semibold text-sm text-charcoal">Regularisation Requests</h2>
          <div className="flex gap-3">
            {pendingCount > 0 && (
              <span className="bg-umberbg text-umber text-xs font-bold px-2.5 py-1 rounded">
                {pendingCount} Pending
              </span>
            )}
            {adminRoutedCount > 0 && (
              <span className="bg-sage/20 text-slate text-xs font-bold px-2.5 py-1 rounded">
                {adminRoutedCount} Admin Routed
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading regularisation queue…" />
          </div>
        ) : isError ? (
          <div role="alert" className="text-crimson text-sm py-8 text-center px-5">
            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-offwhite border-b border-sage/30">
                <tr>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3">Employee</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">For Date</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Days Old</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Original Record</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Correction Requested</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Submitted</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Status</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-sm text-slate py-10">
                      No regularisation requests found.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => {
                    const initials = r.employeeName.slice(0, 2).toUpperCase();
                    const isPending = r.status === 'Pending';
                    const isManagerHandled = r.routedTo === 'Manager';
                    const isAdminRouted = r.routedTo === 'Admin';

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-offwhite/60 transition-colors ${isAdminRouted ? 'bg-sage/10' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isAdminRouted ? 'bg-sage text-white' : 'bg-forest text-white'}`}
                              aria-hidden="true"
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium text-charcoal">{r.employeeName}</div>
                              <div className="text-xs text-slate">{r.employeeCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-charcoal font-medium">{fmtDate(r.date)}</td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${r.ageDaysAtSubmit <= 7 ? 'bg-greenbg text-richgreen' : 'bg-crimsonbg text-crimson'}`}>
                            {r.ageDaysAtSubmit} days
                          </span>
                        </td>
                        {/* Original Record & Correction — detail endpoint has full data */}
                        <td className="px-4 py-4">
                          <Link
                            href={`/manager/regularisation-queue/${r.id}`}
                            className="text-xs text-forest hover:underline"
                            aria-label={`View original record for ${r.employeeName}`}
                          >
                            View detail →
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/manager/regularisation-queue/${r.id}`}
                            className="text-xs text-forest hover:underline"
                            aria-label={`View correction for ${r.employeeName}`}
                          >
                            View detail →
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate text-xs">{fmtDate(r.createdAt)}</td>
                        <td className="px-4 py-4">
                          {isAdminRouted ? (
                            <span className="bg-sage/30 text-slate text-xs font-bold px-2 py-1 rounded">Admin Routed</span>
                          ) : (
                            <RegularisationStatusBadge status={r.status} routedTo={r.routedTo} />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isAdminRouted ? (
                            <span className="text-xs text-slate italic">Admin handling</span>
                          ) : isPending && isManagerHandled ? (
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
                              href={`/manager/regularisation-queue/${r.id}`}
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
