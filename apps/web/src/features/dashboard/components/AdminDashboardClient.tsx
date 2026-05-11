'use client';

/**
 * AdminDashboardClient — full admin dashboard per prototype/admin/dashboard.html.
 *
 * Sections:
 *  1. TimeOfDayHero (greeting + scene)
 *  2. KPI strip (4 tiles): Employees · On Leave Today · Pending Approvals · Payroll
 *  3. Two-panel row: Pending Leave Approvals table + Recent Activity feed
 *  4. Bottom 3-card strip: Late Marks · Review Cycle · Upcoming Exits
 */

import { useMe } from '@/lib/hooks/useAuth';
import { useCycles } from '@/lib/hooks/usePerformance';
import { useEmployeesList } from '@/lib/hooks/useEmployees';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { useAdminDashboard } from '@/features/dashboard/hooks/useAdminDashboard';
import { TimeOfDayHero } from './TimeOfDayHero';
import { KpiTile } from './KpiTile';
import { DashboardPanelCard } from './DashboardPanelCard';
import Link from 'next/link';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function currentMonthLabel() {
  return new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}
function currentFYLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const fy = now.getMonth() >= 3 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
  return `FY ${fy}`;
}

function initials(name?: string | null): string {
  if (!name) return '??';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function payslipStatusPill(status?: string) {
  if (status === 'Finalised') {
    return (
      <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded">
        Finalised
      </span>
    );
  }
  if (status === 'Review') {
    return (
      <span className="bg-softmint text-forest text-xs font-bold px-2 py-0.5 rounded">
        Review
      </span>
    );
  }
  return (
    <span className="bg-umberbg text-umber text-xs font-bold px-2 py-0.5 rounded">
      Draft
    </span>
  );
}

interface AdminDashboardClientProps {
  firstName?: string;
}

export function AdminDashboardClient({ firstName: firstNameProp }: AdminDashboardClientProps = {}) {
  const me = useMe();
  const firstName =
    firstNameProp ?? me.data?.data?.user?.name?.split(' ')[0] ?? '';

  const dashboard = useAdminDashboard();
  const openCycles = useCycles({ status: 'Open' } as Record<string, unknown>);
  const activeCycle = openCycles.data?.data?.[0] ?? null;

  // Late marks this month — team-wide attendance
  const today = todayISO();
  const monthStart = monthStartISO();
  const attendanceAll = useAttendanceList('all', { from: monthStart, to: today });
  const lateMarks = (attendanceAll.data?.data ?? []).filter(
    (r: { late?: boolean }) => r.late,
  ).length;

  // Employees on notice (status transitions for upcoming exits)
  const onNotice = useEmployeesList({ status: 'On-Notice', limit: 10 });
  const upcomingExits = (onNotice.data?.data ?? []).slice(0, 3);

  const badge = `${currentMonthLabel()} · ${currentFYLabel()}`;
  const subtitle = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
        <KpiTile
          label="Employees"
          value={dashboard.empTotal ?? '—'}
          subtext="Active employees"
          isLoading={dashboard.empLoading}
          isError={dashboard.empError}
          onRetry={dashboard.empRefetch}
          href="/admin/employees"
        />

        <KpiTile
          label="On Leave Today"
          value={dashboard.onLeaveTodayCount}
          subtext={
            dashboard.onLeaveTodayCount === 1
              ? '1 employee absent today'
              : `${dashboard.onLeaveTodayCount} employees absent today`
          }
          isLoading={dashboard.onLeaveTodayLoading}
          isError={dashboard.onLeaveTodayError}
          onRetry={dashboard.onLeaveTodayRefetch}
          href="/admin/leave-queue"
        />

        <KpiTile
          label="Pending Approvals"
          value={dashboard.pendingCount}
          subtext="Leave requests awaiting action"
          isLoading={dashboard.pendingLoading}
          isError={dashboard.pendingError}
          onRetry={dashboard.pendingRefetch}
          href="/admin/leave-queue"
          attention={dashboard.pendingCount > 0}
          attentionDot={dashboard.pendingCount > 0}
        />

        <div className="bg-white rounded-xl border border-sage/30 px-5 py-4 hover:border-forest/50 transition-colors">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-widest mb-2">
            Payroll · {currentMonthLabel()}
          </div>
          {dashboard.payrollLoading ? (
            <>
              <div className="h-6 w-24 bg-sage/20 rounded animate-pulse" />
              <div className="h-3 w-32 bg-sage/10 rounded mt-2 animate-pulse" />
            </>
          ) : dashboard.payrollError ? (
            <div className="text-xs text-crimson mt-1">
              Failed to load
              <button
                type="button"
                onClick={() => { void dashboard.payrollRefetch(); }}
                className="ml-2 underline text-emerald"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mt-1">
                {payslipStatusPill(dashboard.currentRun?.status)}
                <span className="text-xs text-slate">
                  {dashboard.currentRun ? '' : 'No run this month'}
                </span>
              </div>
              <div className="text-xs text-slate mt-2">
                {dashboard.currentRun
                  ? `${dashboard.currentRun.employeeCount} employees · ${dashboard.currentRun.code}`
                  : 'Not yet initiated'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 3. Two-panel row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* Left: Pending Leave Approvals */}
        <div className="lg:col-span-3">
        <DashboardPanelCard
          title="Pending Leave Approvals"
          actionLabel="View all →"
          actionHref="/admin/leave-queue"
          isLoading={dashboard.pendingLeaveLoading}
          isError={dashboard.pendingError}
          onRetry={dashboard.pendingRefetch}
          isEmpty={dashboard.pendingLeaveTop5.length === 0}
          emptyMessage="No pending leave requests — all clear!"
          skeletonRows={4}
        >
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Pending leave approvals">
              <thead>
                <tr className="bg-offwhite">
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-2.5">Employee</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-3 py-2.5">Leave Type</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-3 py-2.5">Dates</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-3 py-2.5">Days</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/10">
                {dashboard.pendingLeaveTop5.map((req) => (
                  <tr key={req.id} className="hover:bg-offwhite/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-mint flex items-center justify-center text-forest text-xs font-bold flex-shrink-0">
                          {initials(req.employeeName)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-charcoal">{req.employeeName}</div>
                          <div className="text-xs text-slate">{req.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate">{req.type}</td>
                    <td className="px-3 py-3 text-xs text-slate">
                      {formatDate(req.fromDate)}
                      {req.fromDate !== req.toDate && `–${formatDate(req.toDate)}`}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-charcoal">{req.days}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">
                          Pending
                        </span>
                        {req.escalatedAt && (
                          <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">
                            Escalated
                          </span>
                        )}
                        <Link
                          href={`/admin/leave-queue/${req.id}`}
                          className="text-xs text-emerald font-semibold hover:underline ml-1"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanelCard>
        </div>

        {/* Right: Recent Activity */}
        <div className="lg:col-span-2">
          <DashboardPanelCard
            title="Recent Activity"
            actionLabel="Audit log →"
            actionHref="/admin/audit-log"
            isLoading={dashboard.auditLoading}
            isError={dashboard.auditError}
            onRetry={dashboard.auditRefetch}
            isEmpty={dashboard.recentActivity.length === 0}
            emptyMessage="No recent activity recorded."
            skeletonRows={5}
          >
            <div className="px-5 py-4 space-y-4" aria-live="polite">
              {dashboard.recentActivity.map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-greenbg flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <svg className="w-3.5 h-3.5 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal font-medium">{entry.action}</p>
                    <p className="text-xs text-slate mt-0.5">
                      {entry.actorRole} · {entry.module}
                    </p>
                    <p className="text-xs text-sage mt-0.5">{timeAgo(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanelCard>
        </div>
      </div>

      {/* ── 4. Bottom strip: Late Marks · Review Cycle · Upcoming Exits ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-nx-no-filter>
        {/* Late Marks */}
        <Link
          href="/admin/attendance"
          className="block bg-white rounded-xl border border-sage/30 px-5 py-4 hover:border-forest/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate uppercase tracking-widest">
              Late Marks
            </span>
            {attendanceAll.isLoading ? (
              <div className="w-8 h-4 bg-sage/20 rounded animate-pulse" />
            ) : (
              <span className="bg-crimsonbg text-crimson text-[10px] font-bold px-1.5 py-0.5 rounded">
                {lateMarks}
              </span>
            )}
          </div>
          <p className="text-sm text-charcoal mt-2">
            {attendanceAll.isLoading
              ? 'Loading…'
              : `${lateMarks} late mark${lateMarks !== 1 ? 's' : ''} recorded this month.`}
          </p>
        </Link>

        {/* Review Cycle */}
        <Link
          href="/admin/performance-cycles"
          className="block bg-white rounded-xl border border-sage/30 px-5 py-4 hover:border-forest/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate uppercase tracking-widest">
              Review Cycle
            </span>
            {openCycles.isLoading ? (
              <div className="w-12 h-4 bg-sage/20 rounded animate-pulse" />
            ) : activeCycle ? (
              <span className="bg-greenbg text-richgreen text-[10px] font-bold px-1.5 py-0.5 rounded">
                Active
              </span>
            ) : (
              <span className="bg-sage/30 text-slate text-[10px] font-bold px-1.5 py-0.5 rounded">
                None
              </span>
            )}
          </div>
          {openCycles.isLoading ? (
            <div className="h-3 w-40 bg-sage/10 rounded animate-pulse mt-2" />
          ) : activeCycle ? (
            <>
              <p className="text-sm text-charcoal mt-2">{activeCycle.code ?? 'Active cycle'}</p>
              <p className="text-xs text-slate mt-1">
                {activeCycle.selfReviewDeadline
                  ? `Self-review by ${formatDate(activeCycle.selfReviewDeadline)}`
                  : 'Self-review deadline TBD'}
              </p>
            </>
          ) : (
            <p className="text-sm text-charcoal mt-2">No open review cycle.</p>
          )}
        </Link>

        {/* Upcoming Exits */}
        <Link
          href="/admin/employees"
          className="block bg-white rounded-xl border border-sage/30 px-5 py-4 hover:border-forest/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate uppercase tracking-widest">
              Upcoming Exits
            </span>
            {onNotice.isLoading ? (
              <div className="w-6 h-4 bg-sage/20 rounded animate-pulse" />
            ) : (
              <span className="bg-umberbg text-umber text-[10px] font-bold px-1.5 py-0.5 rounded">
                {onNotice.data?.data?.length ?? 0}
              </span>
            )}
          </div>
          {onNotice.isLoading ? (
            <div className="space-y-1.5 mt-2">
              <div className="h-3 w-32 bg-sage/10 rounded animate-pulse" />
              <div className="h-3 w-28 bg-sage/10 rounded animate-pulse" />
            </div>
          ) : upcomingExits.length === 0 ? (
            <p className="text-sm text-charcoal mt-2">No employees on notice period.</p>
          ) : (
            <div className="mt-2 space-y-1">
              {upcomingExits.map((emp) => (
                <p key={emp.id} className="text-sm text-charcoal">
                  {emp.name}
                  <span className="text-xs text-slate ml-1">· {emp.code}</span>
                </p>
              ))}
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
