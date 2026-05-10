'use client';

/**
 * ManagerDashboardClient — full manager dashboard per prototype/manager/dashboard.html.
 *
 * Sections:
 *  1. TimeOfDayHero
 *  2. KPI strip: My Team · Pending Approvals · Late Marks · Review Cycle
 *  3. Two-panel row: Pending Leave Requests (with Approve/Reject) + Team Attendance Today
 *  4. Bottom row: Reviews Pending Submission + My Goals
 */

import { useMe } from '@/lib/hooks/useAuth';
import { useApproveLeave, useRejectLeave } from '@/lib/hooks/useLeave';
import { useManagerDashboard } from '@/features/dashboard/hooks/useManagerDashboard';
import { TimeOfDayHero } from './TimeOfDayHero';
import { KpiTile } from './KpiTile';
import { DashboardPanelCard } from './DashboardPanelCard';
import { showToast } from '@/components/ui/Toast';

type LeaveReq = {
  id: string;
  employeeName: string;
  employeeCode: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  version?: number;
};

type AttendanceRow = {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  status: string;
  late: boolean;
  checkInTime?: string | null;
};

type ReviewRow = {
  id: string;
  employeeName: string;
  employeeCode: string;
  selfRating?: number | null;
  selfSubmittedAt?: string | null;
  managerId?: string | null;
};

type GoalRow = {
  id: string;
  text: string;
  outcome: string;
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function currentMonthLabel() {
  return new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function formatCheckIn(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function statusBadge(status: string, late: boolean) {
  if (status === 'On-Leave') {
    return (
      <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">
        On Leave
      </span>
    );
  }
  if (status === 'Absent') {
    return (
      <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">
        Absent
      </span>
    );
  }
  return (
    <>
      <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">
        Present
      </span>
      {late && (
        <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded ml-1">
          LATE
        </span>
      )}
    </>
  );
}

function goalBadge(outcome: string) {
  if (outcome === 'Met') {
    return <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">Met</span>;
  }
  if (outcome === 'Partial') {
    return <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">Partial</span>;
  }
  if (outcome === 'Missed') {
    return <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">Missed</span>;
  }
  return <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">On Track</span>;
}

function InlineApproveReject({ req }: { req: LeaveReq }) {
  const approve = useApproveLeave(req.id);
  const reject = useRejectLeave(req.id);

  function handleApprove() {
    approve.mutate(
      { version: req.version ?? 0 },
      {
        onSuccess: () => showToast({ type: 'success', title: 'Leave approved' }),
        onError: () => showToast({ type: 'error', title: 'Approval failed', message: 'Please try again.' }),
      },
    );
  }

  function handleReject() {
    reject.mutate(
      { note: '', version: req.version ?? 0 },
      {
        onSuccess: () => showToast({ type: 'info', title: 'Leave rejected' }),
        onError: () => showToast({ type: 'error', title: 'Rejection failed', message: 'Please try again.' }),
      },
    );
  }

  const busy = approve.isPending || reject.isPending;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleApprove}
        disabled={busy}
        className="border border-richgreen text-richgreen hover:bg-greenbg disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]"
        aria-label={`Approve leave for ${req.employeeName}`}
      >
        {approve.isPending ? '…' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={busy}
        className="border border-crimson text-crimson hover:bg-crimsonbg disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px]"
        aria-label={`Reject leave for ${req.employeeName}`}
      >
        {reject.isPending ? '…' : 'Reject'}
      </button>
    </div>
  );
}

export function ManagerDashboardClient() {
  const me = useMe();
  const firstName = me.data?.data?.user?.name?.split(' ')[0] ?? 'Manager';

  const dash = useManagerDashboard();

  const subtitle = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + (dash.me?.department ? ` · ${dash.me.department} team` : '');

  const badge = `Cycle 1 · FY ${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`;

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
          label="My Team"
          value={dash.teamCount ?? '—'}
          subtext={
            dash.teamCount
              ? `${dash.teamCount} direct reports`
              : 'No direct reports yet'
          }
          isLoading={dash.teamLoading}
          isError={dash.teamError}
          onRetry={dash.teamRefetch}
          href="/manager/team"
        />

        <KpiTile
          label="Pending Approvals"
          value={dash.pendingCount}
          subtext="Leave + regularisation"
          isLoading={dash.pendingLoading}
          isError={dash.pendingError}
          onRetry={dash.pendingRefetch}
          href="/manager/leave-queue"
          attention={dash.pendingCount > 0}
          attentionDot={dash.pendingCount > 0}
        />

        <KpiTile
          label={`Late Marks · ${currentMonthLabel()}`}
          value={dash.lateMarkCount}
          subtext="Across your team this month"
          isLoading={dash.teamAttendanceLoading}
          isError={dash.teamAttendanceError}
          onRetry={dash.teamAttendanceRefetch}
          href="/manager/team-attendance"
        />

        {/* Review Cycle tile — custom rendering */}
        <div className="bg-white rounded-xl border border-sage/30 px-5 py-4 hover:border-forest/50 transition-colors">
          <div className="text-[11px] font-semibold text-slate uppercase tracking-widest mb-2">
            Review Cycle
          </div>
          {dash.cycleLoading ? (
            <>
              <div className="h-6 w-20 bg-sage/20 rounded animate-pulse" />
              <div className="h-3 w-28 bg-sage/10 rounded mt-2 animate-pulse" />
            </>
          ) : dash.activeCycle ? (
            <>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-0.5 rounded">
                  Active
                </span>
                <span className="text-xs text-slate">{dash.activeCycle.code}</span>
              </div>
              {dash.pendingReviews.length > 0 && (
                <div className="text-xs text-umber mt-2 font-medium">
                  {dash.pendingReviews.length} rating{dash.pendingReviews.length !== 1 ? 's' : ''} pending from you
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-charcoal mt-1">No open cycle</div>
          )}
        </div>
      </div>

      {/* ── 3. Two-panel row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Left: Pending Leave Requests with inline approve/reject */}
        <DashboardPanelCard
          title="Pending Leave Requests"
          actionLabel="View all →"
          actionHref="/manager/leave-queue"
          isLoading={dash.pendingLoading}
          isError={dash.pendingError}
          onRetry={dash.pendingRefetch}
          isEmpty={dash.pendingMine.length === 0}
          emptyMessage="No pending leave requests in your queue."
          skeletonRows={3}
        >
          <div className="p-5">
            <table className="w-full text-sm" aria-label="Pending leave requests">
              <thead>
                <tr className="border-b border-sage/30">
                  <th scope="col" className="text-left text-xs font-semibold text-slate pb-2">Employee</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate pb-2">Leave</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate pb-2">Duration</th>
                  <th scope="col" className="text-left text-xs font-semibold text-slate pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {(dash.pendingMine as LeaveReq[]).slice(0, 5).map((req) => (
                  <tr key={req.id}>
                    <td className="py-3">
                      <div className="font-medium text-charcoal text-xs">{req.employeeName}</div>
                      <div className="text-xs text-slate">{req.employeeCode}</div>
                    </td>
                    <td className="py-3 text-slate text-xs">{req.type}</td>
                    <td className="py-3 text-slate text-xs">
                      {formatDate(req.fromDate)}
                      {req.fromDate !== req.toDate && `–${formatDate(req.toDate)}`}
                    </td>
                    <td className="py-3">
                      <InlineApproveReject req={req} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanelCard>

        {/* Right: Team Attendance Today */}
        <DashboardPanelCard
          title="Team Attendance Today"
          actionLabel="Full report →"
          actionHref="/manager/team-attendance"
          isLoading={dash.teamAttendanceLoading}
          isError={dash.teamAttendanceError}
          onRetry={dash.teamAttendanceRefetch}
          isEmpty={dash.teamToday.length === 0}
          emptyMessage="No attendance data for today yet."
          skeletonRows={5}
        >
          <div className="px-5 py-4 space-y-3" aria-live="polite">
            {(dash.teamToday as AttendanceRow[]).slice(0, 8).map((row) => (
              <div key={row.employeeId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      row.status === 'On-Leave' ? 'bg-umber' :
                      row.status === 'Absent' ? 'bg-crimson' : 'bg-richgreen'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-charcoal">
                    {row.employeeName ?? row.employeeCode ?? row.employeeId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(row.status, row.late)}
                  {row.checkInTime && (
                    <span className="text-xs text-slate">{formatCheckIn(row.checkInTime)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DashboardPanelCard>
      </div>

      {/* ── 4. Bottom row: Reviews Pending Submission + My Goals ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-nx-no-filter>
        {/* Reviews Pending Submission */}
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">Reviews Pending Submission</h3>
            <a href="/manager/performance" className="text-xs text-emerald font-semibold hover:underline">
              Performance →
            </a>
          </div>
          {dash.reviewsLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 bg-sage/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : dash.pendingReviews.length === 0 ? (
            <p className="text-sm text-slate py-4">All reviews submitted — no action needed.</p>
          ) : (
            <div className="space-y-3">
              {(dash.pendingReviews as ReviewRow[]).slice(0, 4).map((rev) => (
                <div key={rev.id} className="flex items-center justify-between p-3 rounded-lg bg-offwhite border border-sage/30">
                  <div>
                    <div className="font-medium text-sm text-charcoal">{rev.employeeName}</div>
                    <div className="text-xs text-slate mt-0.5">
                      Self-review:{' '}
                      {rev.selfSubmittedAt ? (
                        <span className="text-richgreen font-semibold">Submitted</span>
                      ) : (
                        <span className="text-slate font-semibold">Not Started</span>
                      )}
                    </div>
                  </div>
                  <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded ml-3 shrink-0">
                    Rating Pending
                  </span>
                </div>
              ))}
            </div>
          )}
          {dash.activeCycle && (
            <div className="mt-4 p-3 rounded-lg bg-softmint border border-mint">
              <p className="text-xs text-forest">
                Manager-review deadline:{' '}
                <span className="font-semibold">
                  {formatDate(dash.activeCycle.managerReviewDeadline)}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* My Goals */}
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">
              My Goals{dash.activeCycle ? ` · ${dash.activeCycle.code}` : ''}
            </h3>
            <a href="/manager/my-review" className="text-xs text-emerald font-semibold hover:underline">
              My review →
            </a>
          </div>
          {dash.reviewsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-sage/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !dash.myGoalReview || (dash.myGoalReview as { goals?: GoalRow[] }).goals?.length === 0 ? (
            <p className="text-sm text-slate py-4">No goals set for this cycle yet.</p>
          ) : (
            <div className="space-y-3">
              {((dash.myGoalReview as { goals?: GoalRow[] }).goals ?? []).slice(0, 4).map((goal) => (
                <div key={goal.id} className="p-3 rounded-lg border border-sage/30">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-charcoal flex-1">{goal.text}</p>
                    <span className="ml-3 shrink-0">{goalBadge(goal.outcome)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
