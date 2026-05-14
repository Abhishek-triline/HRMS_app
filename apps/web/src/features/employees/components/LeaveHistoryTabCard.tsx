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
import { useLeaveList, useLeaveBalances } from '@/lib/hooks/useLeave';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { useReviews } from '@/lib/hooks/usePerformance';
import {
  LEAVE_STATUS,
  LEAVE_STATUS_MAP,
  LEAVE_TYPE_ID,
  ATTENDANCE_STATUS_MAP,
  PAYROLL_STATUS_MAP,
} from '@/lib/status/maps';

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

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function formatRupees(paise: number | null | undefined) {
  if (paise == null) return '—';
  return `₹${inrFmt.format(Math.floor(paise / 100))}`;
}

function formatHours(minutes: number | null | undefined) {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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
  const attendanceQuery = useAttendanceList('all', { employeeId, limit: 6 });
  const payslipsQuery = usePayslipsList({ employeeId, limit: 6 });
  const reviewsQuery = useReviews({ employeeId, limit: 6 });

  const leaveRows = leaveQuery.data?.data ?? [];
  const attendanceRows = attendanceQuery.data?.data ?? [];
  const payslipRows = payslipsQuery.data?.data ?? [];
  const reviewRows = reviewsQuery.data?.data ?? [];

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
          <p className="text-xs text-slate">
            {balancesQuery.isLoading
              ? 'Loading balances…'
              : `Balance: Casual ${balanceSummary.casual} · Sick ${balanceSummary.sick} · Earned ${balanceSummary.annual} · LOP 0`}
          </p>
        </div>
      </div>

      {/* ── Attendance Summary ── */}
      <div
        id="tab-panel-attendance"
        role="tabpanel"
        aria-labelledby="tab-attendance"
        hidden={activeTab !== 'attendance'}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-offwhite/60">
                <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-2.5">Date</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Status</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Check-In</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Check-Out</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Hours</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Late</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {attendanceQuery.isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-sage/20 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : attendanceRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                attendanceRows.map((row) => {
                  const checkIn = row.checkInTime
                    ? new Date(row.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—';
                  const checkOut = row.checkOutTime
                    ? new Date(row.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—';
                  return (
                    <tr key={row.date} className="hover:bg-offwhite/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-charcoal font-medium">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-xs text-slate">
                        {ATTENDANCE_STATUS_MAP[row.status]?.label ?? `Status ${row.status}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate">{checkIn}</td>
                      <td className="px-4 py-3 text-xs text-slate">{checkOut}</td>
                      <td className="px-4 py-3 text-xs font-medium text-charcoal">{formatHours(row.hoursWorkedMinutes)}</td>
                      <td className="px-4 py-3 text-xs">
                        {row.late ? (
                          <span className="bg-umberbg text-umber font-semibold px-2 py-0.5 rounded">Late</span>
                        ) : (
                          <span className="text-slate">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payslips ── */}
      <div
        id="tab-panel-payslips"
        role="tabpanel"
        aria-labelledby="tab-payslips"
        hidden={activeTab !== 'payslips'}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-offwhite/60">
                <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-2.5">Period</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Code</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Status</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Gross</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Net Pay</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">LOP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {payslipsQuery.isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-sage/20 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payslipRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate">
                    No payslips found.
                  </td>
                </tr>
              ) : (
                payslipRows.map((p) => (
                  <tr key={p.id} className="hover:bg-offwhite/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-charcoal font-medium">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate font-mono">{p.code}</td>
                    <td className="px-4 py-3 text-xs text-slate">
                      {PAYROLL_STATUS_MAP[p.status]?.label ?? `Status ${p.status}`}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-charcoal">{formatRupees(p.grossPaise)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-charcoal">{formatRupees(p.netPayPaise)}</td>
                    <td className="px-4 py-3 text-xs text-slate">{p.lopDays}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div
        id="tab-panel-reviews"
        role="tabpanel"
        aria-labelledby="tab-reviews"
        hidden={activeTab !== 'reviews'}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-offwhite/60">
                <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-2.5">Cycle</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Manager</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Self</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Mgr Rating</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Final</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {reviewsQuery.isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-sage/20 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : reviewRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate">
                    No performance reviews found.
                  </td>
                </tr>
              ) : (
                reviewRows.map((r) => (
                  <tr key={r.id} className="hover:bg-offwhite/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-charcoal font-medium font-mono">{r.cycleCode}</td>
                    <td className="px-4 py-3 text-xs text-slate">{r.managerName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate">{r.selfRating ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate">{r.managerRating ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-charcoal">{r.finalRating ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate">
                      {r.isMidCycleJoiner ? 'Mid-cycle joiner' : r.managerOverrodeSelf ? 'Mgr overrode self' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
