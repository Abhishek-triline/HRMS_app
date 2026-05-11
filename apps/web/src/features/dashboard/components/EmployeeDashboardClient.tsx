'use client';

/**
 * EmployeeDashboardClient — full employee dashboard per prototype/employee/dashboard.html.
 *
 * Sections:
 *  1. TimeOfDayHero
 *  2. KPI strip: Annual Leave balance · Sick Leave balance · Attendance · Late Marks
 *  3. Two-panel row: My Attendance Today + Latest Payslip
 *  4. Bottom row: Recent Leave + Performance Review
 */

import { useMe } from '@/lib/hooks/useAuth';
import { useEmployeeDashboard } from '@/features/dashboard/hooks/useEmployeeDashboard';
import { TimeOfDayHero } from './TimeOfDayHero';
import { KpiTile } from './KpiTile';
import { DashboardPanelCard } from './DashboardPanelCard';

type LeaveBalance = {
  type: string;
  remaining: number | null;
  total: number | null;
};

type LeaveReqSummary = {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
};

type Payslip = {
  id: string;
  code: string;
  month: number;
  year: number;
  status: string;
  grossPaise: number;
  netPayPaise: number;
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(paise?: number | null): string {
  if (paise == null) return '—';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rupees);
}

function monthName(n: number): string {
  return new Date(2000, n - 1, 1).toLocaleString('en-IN', { month: 'long' });
}

function leaveStatusBadge(status: string) {
  if (status === 'Approved') {
    return <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">Approved</span>;
  }
  if (status === 'Rejected') {
    return <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">Rejected</span>;
  }
  if (status === 'Cancelled') {
    return <span className="bg-lockedbg text-lockedfg text-xs font-bold px-2 py-1 rounded">Cancelled</span>;
  }
  return <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">Pending</span>;
}

function currentMonthLabel() {
  return new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

interface EmployeeDashboardClientProps {
  firstName?: string;
}

export function EmployeeDashboardClient({ firstName: firstNameProp }: EmployeeDashboardClientProps = {}) {
  const me = useMe();
  const firstName =
    firstNameProp ?? me.data?.data?.user?.name?.split(' ')[0] ?? '';

  const dash = useEmployeeDashboard();

  const badge = currentMonthLabel() + ` · FY ${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`;
  const subtitle = (() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('weekday')} · ${get('day')} ${get('month')} ${get('year')}`;
  })();

  const annualBalance = dash.annualBalance as LeaveBalance | null;
  const sickBalance = dash.sickBalance as LeaveBalance | null;
  const payslip = dash.latestPayslip as Payslip | null;

  const annualPct =
    annualBalance?.total && annualBalance.remaining != null
      ? ((annualBalance.remaining / annualBalance.total) * 100)
      : undefined;

  const sickPct =
    sickBalance?.total && sickBalance.remaining != null
      ? ((sickBalance.remaining / sickBalance.total) * 100)
      : undefined;

  const attendancePct =
    dash.attendanceStats.workingDays > 0
      ? (dash.attendanceStats.present / dash.attendanceStats.workingDays) * 100
      : undefined;

  return (
    <div>
      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <TimeOfDayHero firstName={firstName} subtitle={subtitle} badge={badge} />

      {/* ── 2. KPI strip ────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
        data-nx-no-filter
        aria-label="Key metrics"
      >
        {/* Annual Leave */}
        <KpiTile
          label="Annual Leave"
          value={
            annualBalance ? (
              <>
                {annualBalance.remaining}{' '}
                <span className="text-base font-body font-normal text-slate">
                  / {annualBalance.total ?? '—'}
                </span>
              </>
            ) : '—'
          }
          subtext={
            annualBalance
              ? `${(annualBalance.total ?? 0) - (annualBalance.remaining ?? 0)} days used`
              : 'No balance data'
          }
          isLoading={dash.balancesLoading}
          isError={dash.balancesError}
          onRetry={dash.balancesRefetch}
          href="/employee/leave"
          progressPct={annualPct}
          progressColor="bg-forest"
        />

        {/* Sick Leave */}
        <KpiTile
          label="Sick Leave"
          value={
            sickBalance ? (
              <>
                {sickBalance.remaining}{' '}
                <span className="text-base font-body font-normal text-slate">
                  / {sickBalance.total ?? '—'}
                </span>
              </>
            ) : '—'
          }
          subtext={
            sickBalance
              ? `${(sickBalance.total ?? 0) - (sickBalance.remaining ?? 0)} days used`
              : 'No balance data'
          }
          isLoading={dash.balancesLoading}
          isError={dash.balancesError}
          onRetry={dash.balancesRefetch}
          href="/employee/leave"
          progressPct={sickPct}
          progressColor="bg-emerald"
        />

        {/* Attendance This Month */}
        <KpiTile
          label={`Attendance · ${new Date().toLocaleString('en-IN', { month: 'short' })}`}
          value={
            <>
              {dash.attendanceStats.present}{' '}
              <span className="text-base font-body font-normal text-slate">
                / {dash.attendanceStats.workingDays}
              </span>
            </>
          }
          subtext={`${Math.max(0, dash.attendanceStats.workingDays - dash.attendanceStats.present)} days remaining`}
          isLoading={dash.attendanceLoading}
          isError={dash.attendanceError}
          onRetry={dash.attendanceRefetch}
          href="/employee/attendance"
          progressPct={attendancePct}
          progressColor="bg-richgreen"
        />

        {/* Late Marks */}
        <KpiTile
          label={`Late Marks · ${new Date().toLocaleString('en-IN', { month: 'short' })}`}
          value={dash.attendanceStats.lateCount}
          subtext={
            dash.attendanceStats.lateCount >= 2
              ? `${3 - (dash.attendanceStats.lateCount % 3)} more before deduction`
              : 'No deduction risk'
          }
          isLoading={dash.attendanceLoading}
          isError={dash.attendanceError}
          onRetry={dash.attendanceRefetch}
          href="/employee/attendance"
          attention={dash.attendanceStats.lateCount > 0}
          attentionDot={dash.attendanceStats.lateCount > 0}
        />
      </div>

      {/* ── 3. Two-panel row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Today's Attendance */}
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">My Attendance Today</h3>
            <div className="flex items-center gap-3">
              {dash.todayRecord?.panelState === 'Working' || dash.todayRecord?.panelState === 'Confirm' ? (
                <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded">
                  Present
                </span>
              ) : null}
              <a href="/employee/attendance" className="text-xs text-emerald font-semibold hover:underline">
                View →
              </a>
            </div>
          </div>
          {dash.todayLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 bg-sage/10 rounded animate-pulse" />
              ))}
            </div>
          ) : !dash.todayRecord ? (
            <p className="text-sm text-slate">No attendance record yet today.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    dash.todayRecord.panelState === 'Working' ? 'bg-richgreen' : 'bg-sage'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-slate">Status:</span>
                <span className={`font-semibold ${
                  dash.todayRecord.panelState === 'Working' ? 'text-richgreen' :
                  dash.todayRecord.panelState === 'Confirm' ? 'text-forest' : 'text-slate'
                }`}>
                  {dash.todayRecord.panelState === 'Ready' ? 'Not checked in' :
                   dash.todayRecord.panelState === 'Working' ? 'Present' : 'Checked out'}
                </span>
              </div>
              {dash.todayRecord.record?.checkInTime && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-4 h-4 text-slate flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-slate">Checked In:</span>
                  <span className="font-semibold text-charcoal">
                    {new Date(dash.todayRecord.record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {dash.todayRecord.record?.hoursWorkedMinutes != null && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-4 h-4 text-slate flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-slate">Working:</span>
                  <span className="font-semibold text-charcoal">
                    {Math.floor(dash.todayRecord.record.hoursWorkedMinutes / 60)}h {dash.todayRecord.record.hoursWorkedMinutes % 60}m
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Latest Payslip */}
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">
              Latest Payslip{payslip ? ` · ${monthName(payslip.month)} ${payslip.year}` : ''}
            </h3>
            <div className="flex items-center gap-3">
              {payslip?.status === 'Finalised' && (
                <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Finalised
                </span>
              )}
              <a href="/employee/payslips" className="text-xs text-emerald font-semibold hover:underline">
                View →
              </a>
            </div>
          </div>
          {dash.payslipsLoading ? (
            <div className="h-24 bg-sage/10 rounded-lg animate-pulse" />
          ) : dash.payslipsError ? (
            <div className="text-xs text-crimson">
              Failed to load
              <button type="button" onClick={() => { void dash.payslipsRefetch(); }} className="ml-2 underline text-emerald">
                Retry
              </button>
            </div>
          ) : !payslip ? (
            <p className="text-sm text-slate">No payslip available yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-softmint rounded-lg p-3">
                <div className="text-xs text-slate mb-1">Gross Pay</div>
                <div className="text-lg font-heading font-bold text-charcoal">
                  {formatMoney(payslip.grossPaise)}
                </div>
              </div>
              <div className="bg-greenbg rounded-lg p-3">
                <div className="text-xs text-slate mb-1">Net Pay</div>
                <div className="text-lg font-heading font-bold text-richgreen">
                  {formatMoney(payslip.netPayPaise)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Bottom row: Recent Leave + Performance Review ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-nx-no-filter>
        {/* Recent Leave */}
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">Recent Leave</h3>
            <a href="/employee/leave" className="text-xs text-emerald font-semibold hover:underline">
              View all →
            </a>
          </div>
          {dash.leaveLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 bg-sage/10 rounded animate-pulse" />
              ))}
            </div>
          ) : dash.leaveError ? (
            <div className="text-xs text-crimson py-4">
              Failed to load.{' '}
              <button type="button" onClick={() => { void dash.leaveRefetch(); }} className="underline text-emerald">
                Retry
              </button>
            </div>
          ) : dash.recentLeaveRequests.length === 0 ? (
            <p className="text-sm text-slate py-4">No leave requests yet.</p>
          ) : (
            <div className="space-y-3">
              {(dash.recentLeaveRequests as LeaveReqSummary[]).map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2.5 border-b border-sage/20 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-charcoal">{req.type} Leave</div>
                    <div className="text-xs text-slate mt-0.5">
                      {formatDate(req.fromDate)}{req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                      {' '}· {req.days} day{req.days !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {leaveStatusBadge(req.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Review */}
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">
              Performance Review{dash.activeCycle ? ` · ${dash.activeCycle.code}` : ''}
            </h3>
            <div className="flex items-center gap-3">
              {dash.activeCycle && (
                <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded">
                  Active
                </span>
              )}
              <a href="/employee/performance" className="text-xs text-emerald font-semibold hover:underline">
                View →
              </a>
            </div>
          </div>
          {dash.reviewsLoading ? (
            <div className="space-y-3">
              <div className="h-10 bg-sage/10 rounded animate-pulse" />
              <div className="h-10 bg-sage/10 rounded animate-pulse" />
            </div>
          ) : !dash.activeCycle ? (
            <p className="text-sm text-slate py-4">No active performance cycle.</p>
          ) : (
            <>
              <div className="mb-4">
                <div className="text-sm font-semibold text-charcoal">{dash.activeCycle.code}</div>
                <div className="text-xs text-slate mt-1">
                  {formatDate(dash.activeCycle.fyStart)} – {formatDate(dash.activeCycle.fyEnd)}
                </div>
              </div>
              <div className="bg-softmint rounded-lg p-3 mb-4">
                <div className="text-xs text-slate mb-1">Self-Review Deadline</div>
                <div className="text-sm font-semibold text-charcoal">
                  {formatDate(dash.activeCycle.selfReviewDeadline)}
                </div>
              </div>
              {dash.latestReview && (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {(dash.latestReview as { selfSubmittedAt?: string | null }).selfSubmittedAt ? (
                    <>
                      <svg className="w-4 h-4 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-richgreen">Self-rating submitted</span>
                    </>
                  ) : (
                    <span className="text-umber">Self-rating pending</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
