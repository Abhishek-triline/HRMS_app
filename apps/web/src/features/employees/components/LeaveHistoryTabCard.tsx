'use client';

/**
 * LeaveHistoryTabCard — 4-tab card at the bottom of the employee detail page.
 *
 * Tabs: Leave History / Attendance Summary / Payslips / Reviews
 *
 * Each tab shows a small table (top 4 rows) plus a "Full History →" link.
 * Currently only Leave History tab is fully wired. The other three tabs
 * show skeleton states — they require additional wiring once the respective
 * list hooks have employeeId filtering confirmed by team-lead.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLeaveList, useLeaveBalances } from '@/lib/hooks/useLeave';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { LEAVE_STATUS, LEAVE_STATUS_MAP, LEAVE_TYPE_ID } from '@/lib/status/maps';

type Tab = 'leave' | 'attendance' | 'payslips' | 'reviews';

const TABS: { key: Tab; label: string }[] = [
  { key: 'leave', label: 'Leave History' },
  { key: 'attendance', label: 'Attendance Summary' },
  { key: 'payslips', label: 'Payslips' },
  { key: 'reviews', label: 'Reviews' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LeaveStatusBadge({ status }: { status: number }) {
  const map: Record<number, string> = {
    [LEAVE_STATUS.Pending]:   'bg-umberbg text-umber',
    [LEAVE_STATUS.Approved]:  'bg-greenbg text-richgreen',
    [LEAVE_STATUS.Rejected]:  'bg-crimsonbg text-crimson',
    [LEAVE_STATUS.Cancelled]: 'bg-sage/20 text-slate',
    [LEAVE_STATUS.Escalated]: 'bg-umberbg text-umber',
  };
  const label = LEAVE_STATUS_MAP[status]?.label ?? String(status);
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded ${map[status] ?? 'bg-sage/20 text-slate'}`}>
      {label}
    </span>
  );
}

interface Props {
  employeeId: number;
}

export function LeaveHistoryTabCard({ employeeId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('leave');

  const leaveQuery = useLeaveList({ employeeId, limit: 4 });
  const balancesQuery = useLeaveBalances(employeeId);

  const leaveRows = leaveQuery.data?.data ?? [];

  const balanceSummary = useMemo(() => {
    const balances = balancesQuery.data?.balances ?? [];
    const casual = balances.find((b) => b.leaveTypeId === LEAVE_TYPE_ID.Casual)?.remaining ?? '—';
    const sick = balances.find((b) => b.leaveTypeId === LEAVE_TYPE_ID.Sick)?.remaining ?? '—';
    const annual = balances.find((b) => b.leaveTypeId === LEAVE_TYPE_ID.Annual)?.remaining ?? '—';
    return { casual, sick, annual };
  }, [balancesQuery.data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-sage/20 overflow-x-auto" role="tablist" aria-label="Employee history">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tab-panel-${tab.key}`}
            id={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/50 ${
              activeTab === tab.key
                ? 'text-forest border-b-2 border-forest -mb-px'
                : 'text-slate hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Leave History ── */}
      <div
        id="tab-panel-leave"
        role="tabpanel"
        aria-labelledby="tab-leave"
        hidden={activeTab !== 'leave'}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-offwhite/60">
                <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-2.5">Leave Type</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">From</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">To</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Days</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Status</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {leaveQuery.isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-sage/20 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leaveRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate">
                    No leave history found.
                  </td>
                </tr>
              ) : (
                leaveRows.map((req) => (
                  <tr key={req.id} className="hover:bg-offwhite/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-charcoal font-medium">{req.leaveTypeName} Leave</td>
                    <td className="px-4 py-3 text-xs text-slate">{formatDate(req.fromDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate">{formatDate(req.toDate)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-charcoal">{req.days}</td>
                    <td className="px-4 py-3">
                      <LeaveStatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate">{req.approverName ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-sage/10 bg-offwhite/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate">
              {balancesQuery.isLoading
                ? 'Loading balances…'
                : `Balance: Casual ${balanceSummary.casual} · Sick ${balanceSummary.sick} · Earned ${balanceSummary.annual} · LOP 0`}
            </p>
            <Link
              href={`/admin/leave?employeeId=${employeeId}`}
              className="text-xs text-emerald font-semibold hover:underline"
            >
              Full History →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Attendance Summary ── */}
      <div
        id="tab-panel-attendance"
        role="tabpanel"
        aria-labelledby="tab-attendance"
        hidden={activeTab !== 'attendance'}
        className="px-5 py-6 text-center"
      >
        <p className="text-sm text-slate mb-2">Monthly attendance summary</p>
        <Link
          href={`/admin/attendance?employeeId=${employeeId}`}
          className="text-xs text-emerald font-semibold hover:underline"
        >
          View Full Attendance →
        </Link>
      </div>

      {/* ── Payslips ── */}
      <div
        id="tab-panel-payslips"
        role="tabpanel"
        aria-labelledby="tab-payslips"
        hidden={activeTab !== 'payslips'}
        className="px-5 py-6 text-center"
      >
        <p className="text-sm text-slate mb-2">Payslip history</p>
        <Link
          href={`/payroll/payslips?employeeId=${employeeId}`}
          className="text-xs text-emerald font-semibold hover:underline"
        >
          View All Payslips →
        </Link>
      </div>

      {/* ── Reviews ── */}
      <div
        id="tab-panel-reviews"
        role="tabpanel"
        aria-labelledby="tab-reviews"
        hidden={activeTab !== 'reviews'}
        className="px-5 py-6 text-center"
      >
        <p className="text-sm text-slate mb-2">Performance review history</p>
        <Link
          href={`/admin/performance?employeeId=${employeeId}`}
          className="text-xs text-emerald font-semibold hover:underline"
        >
          View All Reviews →
        </Link>
      </div>
    </div>
  );
}
