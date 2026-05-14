'use client';

/**
 * MyAttendanceView — personal attendance view used by every role.
 * Visual reference: prototype/<role>/my-attendance.html
 *
 * Sections (prototype-exact order):
 *   1. Hero band — month nav, Attendance %, Total Hours, Regularise CTA
 *   2. 4-tile summary strip — Present | Late Marks | On Leave | Avg Hours
 *   3. Daily Calendar
 *   4. Hours Worked bar chart
 *   5. Late Marks notice banner (only when lateMonthCount > 0)
 *   6. Detailed Log table
 *
 * Pass `regularisationHref` from the role's wrapper so the Regularise CTA
 * lands on the right page (e.g. "/employee/regularisation",
 * "/admin/regularisation"). Defaults to "/regularisation" for safety.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { MyOverviewHero } from '@/features/overview/components/MyOverviewHero';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { ATTENDANCE_STATUS } from '@/lib/status/maps';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';

// ── Helpers ────────────────────────────────────────────────────────────────────

function minutesToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = (h % 12) || 12;
  return `${h12}:${m} ${ampm}`;
}

function dayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Hours Worked SVG Bar Chart ─────────────────────────────────────────────────

interface ChartBar {
  /** YYYY-MM-DD — used as a stable key */
  date: string;
  /** "Mon", "Tue", … */
  weekday: string;
  /** Day-of-month, e.g. "12" */
  dayNum: string;
  /** Hours worked (0 when not Present). */
  hours: number;
  /**
   * Daily-hours target that applied on this date (snapshotted server-side
   * at row creation). The "below target" classification compares hours
   * against this per-bar value so the visual stays correct after the
   * global config changes.
   */
  targetHours: number;
  /** ATTENDANCE_STATUS code. */
  status: number;
  /** Late mark — only meaningful for Present. */
  late: boolean;
}

/** Per-status visual treatment for chart bars. */
const STATUS_BAR_STYLES: Record<number, { gradient: string; label: string; labelClass: string }> = {
  [ATTENDANCE_STATUS.Present]:   { gradient: 'bg-gradient-to-t from-forest to-emerald',     label: 'Present',    labelClass: 'text-slate' },
  [ATTENDANCE_STATUS.Absent]:    { gradient: 'bg-gradient-to-t from-crimson/80 to-crimson/40', label: 'Absent',  labelClass: 'text-crimson font-semibold' },
  [ATTENDANCE_STATUS.OnLeave]:   { gradient: 'bg-gradient-to-t from-amber-500 to-amber-300', label: 'On Leave',   labelClass: 'text-amber-700 font-semibold' },
  [ATTENDANCE_STATUS.WeeklyOff]: { gradient: 'bg-gradient-to-t from-slate/60 to-slate/30',   label: 'Weekly Off', labelClass: 'text-slate' },
  [ATTENDANCE_STATUS.Holiday]:   { gradient: 'bg-gradient-to-t from-mint to-mint/50',       label: 'Holiday',    labelClass: 'text-forest font-semibold' },
};

/** Present-bar gradient when the day fell short of the target hours. */
const UNDER_TARGET_GRADIENT = 'bg-gradient-to-t from-emerald/40 to-mint/60';

interface BarChartProps {
  bars: ChartBar[];
}

function HoursBarChart({ bars }: BarChartProps) {
  if (bars.length === 0) return null;

  // Target dashed line follows the latest bar's target. When the policy
  // changes mid-window, the per-bar comparison stays honest; the global
  // line is just an approximate orientation cue.
  const lineTarget = bars[bars.length - 1]!.targetHours;
  const targetsVary = bars.some((b) => b.targetHours !== lineTarget);
  const maxH = Math.max(...bars.map((b) => b.hours), ...bars.map((b) => b.targetHours), lineTarget + 1);
  const chartH = 110;
  const targetPct = ((maxH - lineTarget) / maxH) * 100;
  // Non-Present bars don't have hours to scale; render a fixed indicator
  // height so they're still visible and hover-able.
  const indicatorPx = 14;

  return (
    <div className="relative">
      {/* Target dashed line */}
      <div
        className="absolute inset-x-0 border-t border-dashed border-forest/30 pointer-events-none"
        style={{ top: `${targetPct}%` }}
        aria-hidden="true"
      >
        <span className="absolute -top-2.5 right-0 text-[9px] text-forest/70 bg-white px-1 font-semibold">
          {lineTarget}h target{targetsVary ? '*' : ''}
        </span>
      </div>

      {/* Bars */}
      <div
        className="flex items-end justify-between gap-2"
        style={{ height: `${chartH + 30}px`, paddingTop: '4px' }}
      >
        {bars.map((b) => {
          const isPresent = b.status === ATTENDANCE_STATUS.Present;
          const style = STATUS_BAR_STYLES[b.status] ?? STATUS_BAR_STYLES[ATTENDANCE_STATUS.Absent]!;
          const underTarget = isPresent && b.hours > 0 && b.hours < b.targetHours;
          const gradient = isPresent && b.late
            ? 'bg-gradient-to-t from-crimson to-crimson/70'
            : isPresent && underTarget
              ? UNDER_TARGET_GRADIENT
              : style.gradient;
          const pct = maxH > 0 ? (b.hours / maxH) * 100 : 0;
          const barHeight = isPresent
            ? Math.max((pct / 100) * chartH, 4)
            : indicatorPx;
          const tooltipMain = isPresent
            ? `${b.hours.toFixed(1)} hrs / ${b.targetHours}h target${b.late ? ' (late)' : underTarget ? ' (below target)' : ''}`
            : style.label;
          const dateLabel = `${b.weekday} ${b.dayNum}`;
          return (
            <div
              key={b.date}
              className="group relative flex-1 flex flex-col items-center gap-1"
              tabIndex={0}
              role="img"
              aria-label={`${dateLabel}: ${tooltipMain}`}
            >
              {/* Tooltip — visible on hover (mouse) or keyboard focus */}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-charcoal text-white text-[10px] font-semibold whitespace-nowrap shadow-md opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 z-10"
              >
                <div className="text-center">
                  <div className="text-mint/90 text-[9px] font-medium uppercase tracking-wide">{dateLabel}</div>
                  <div className="font-bold">{tooltipMain}</div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-charcoal" />
              </div>

              <div
                className={`w-full rounded-t-sm transition-opacity duration-150 group-hover:opacity-80 group-focus-within:opacity-80 ${gradient}`}
                style={{ height: `${barHeight}px` }}
              />
              <span className={`text-[9px] uppercase tracking-wide ${isPresent && b.late ? 'text-crimson font-semibold' : style.labelClass}`}>
                {b.weekday}
              </span>
              <span className="text-[10px] text-charcoal font-semibold leading-none">
                {b.dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact status legend shown above the chart. */
function ChartLegend() {
  const items: { gradient: string; key: string }[] = [
    { gradient: STATUS_BAR_STYLES[ATTENDANCE_STATUS.Present]!.gradient,   key: 'On / over target' },
    { gradient: UNDER_TARGET_GRADIENT,                                    key: 'Below target' },
    { gradient: 'bg-gradient-to-t from-crimson to-crimson/70',            key: 'Late check-in' },
    { gradient: STATUS_BAR_STYLES[ATTENDANCE_STATUS.Absent]!.gradient,    key: 'Absent' },
    { gradient: STATUS_BAR_STYLES[ATTENDANCE_STATUS.OnLeave]!.gradient,   key: 'Leave' },
    { gradient: STATUS_BAR_STYLES[ATTENDANCE_STATUS.Holiday]!.gradient,   key: 'Holiday' },
    { gradient: STATUS_BAR_STYLES[ATTENDANCE_STATUS.WeeklyOff]!.gradient, key: 'Weekly Off' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate mt-3">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-sm ${it.gradient}`} aria-hidden="true" />
          <span>{it.key}</span>
        </div>
      ))}
    </div>
  );
}

// ── Status badge for the log table ────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const map: Record<number, string> = {
    [ATTENDANCE_STATUS.Present]:   'bg-greenbg text-richgreen',
    [ATTENDANCE_STATUS.Absent]:    'bg-crimsonbg text-crimson',
    [ATTENDANCE_STATUS.OnLeave]:   'bg-amber-50 text-amber-700 border border-amber-200',
    [ATTENDANCE_STATUS.WeeklyOff]: 'bg-gray-100 text-slate',
    [ATTENDANCE_STATUS.Holiday]:   'bg-softmint text-forest',
  };
  const labels: Record<number, string> = {
    [ATTENDANCE_STATUS.Present]:   'Present',
    [ATTENDANCE_STATUS.Absent]:    'Absent',
    [ATTENDANCE_STATUS.OnLeave]:   'On Leave',
    [ATTENDANCE_STATUS.WeeklyOff]: 'Weekly Off',
    [ATTENDANCE_STATUS.Holiday]:   'Holiday',
  };
  const cls = map[status] ?? 'bg-gray-100 text-slate';
  const label = labels[status] ?? String(status);
  return <span className={`text-xs font-bold px-2 py-1 rounded ${cls}`}>{label}</span>;
}

// ── MyAttendanceView ───────────────────────────────────────────────────────────

interface MyAttendanceViewProps {
  /** Where the Regularise CTA should link (defaults to "/regularisation"). */
  regularisationHref?: string;
}

export function MyAttendanceView({ regularisationHref = '/regularisation' }: MyAttendanceViewProps = {}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Live clock — ticks once per minute. Used to derive in-progress hours
  // for today's row (checked in, not yet checked out). Anchored to setState
  // so the chart bar and detailed-log table auto-update without a refetch.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // A single user's calendar month tops out at ~31 rows. limit:100 keeps the
  // call well under the API ceiling and guards against the legacy default-20
  // silent truncation that bit manager/payroll attendance pages.
  const { data, isLoading, isError, error } = useAttendanceList(
    'me',
    { from, to, limit: 100 },
    { keepPrevious: true },
  );

  const handleMonthChange = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  const rows = (data?.data ?? []).map((r) => {
    // For today's row, if the employee has checked in but not yet checked
    // out, surface the live elapsed minutes so the chart and table reflect
    // progress instead of showing 0 until check-out commits the value.
    let effectiveMinutes = r.hoursWorkedMinutes;
    if (
      r.date === todayISO &&
      r.checkInTime &&
      !r.checkOutTime
    ) {
      const start = new Date(r.checkInTime).getTime();
      effectiveMinutes = Math.max(0, Math.floor((now.getTime() - start) / 60_000));
    }
    return {
      date: r.date,
      status: r.status,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      hoursWorkedMinutes: effectiveMinutes,
      late: r.late,
      targetHours: r.targetHours,
    };
  });

  // ── Computed stats ──────────────────────────────────────────────────────────

  const workingRows = rows.filter((r) => r.status !== ATTENDANCE_STATUS.WeeklyOff && r.status !== ATTENDANCE_STATUS.Holiday);
  const presentRows = rows.filter((r) => r.status === ATTENDANCE_STATUS.Present);
  const lateRows = rows.filter((r) => r.late);
  const leaveRows = rows.filter((r) => r.status === ATTENDANCE_STATUS.OnLeave);

  const presentCount = presentRows.length;
  const workingDayCount = workingRows.length;
  const lateMonthCount = lateRows.length;
  const lateThreshold = 3;
  const lateRemaining = Math.max(0, lateThreshold - lateMonthCount);

  const totalMinutes = presentRows.reduce((sum, r) => sum + (r.hoursWorkedMinutes ?? 0), 0);
  const avgHours = presentCount > 0 ? totalMinutes / presentCount / 60 : 0;
  // Average target across the present days the user actually clocked.
  // Falls back to 8 when there are no present rows yet.
  const avgTargetHours = presentCount > 0
    ? presentRows.reduce((s, r) => s + r.targetHours, 0) / presentCount
    : 8;
  const avgDelta = avgHours - avgTargetHours;

  const leaveDatesLabel = leaveRows
    .slice(0, 3)
    .map((r) => {
      const d = new Date(r.date);
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
    })
    .join(' · ');

  // Every day of the month becomes a bar — including leave / holiday /
  // weekly-off / absent so the user can see the rhythm of the whole month.
  // Sorted by date so weekly slicing is deterministic.
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allBars: ChartBar[] = rows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const d = new Date(r.date);
      return {
        date: r.date,
        weekday: WEEKDAY_LABELS[d.getDay()] ?? '',
        dayNum: String(d.getDate()),
        hours: (r.hoursWorkedMinutes ?? 0) / 60,
        targetHours: r.targetHours,
        status: r.status,
        late: r.late,
      };
    });

  // 7-day slices starting from day 1. On initial load and on month change,
  // jump to the slice containing TODAY so the latest week is the default
  // view; fall back to the last slice when today isn't in the rendered
  // month (e.g. the user is viewing a past or future month). Manual prev/
  // next clicks are preserved because the effect only re-fires when the
  // visible data set actually changes (year / month / row count).
  const WEEK_SIZE = 7;
  const weekCount = Math.max(1, Math.ceil(allBars.length / WEEK_SIZE));
  const [weekIndex, setWeekIndex] = useState(0);
  useEffect(() => {
    const todayIdx = allBars.findIndex((b) => b.date === todayISO);
    const target =
      todayIdx >= 0 ? Math.floor(todayIdx / WEEK_SIZE) : Math.max(0, weekCount - 1);
    setWeekIndex(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, allBars.length]);
  const clampedWeek = Math.min(weekIndex, weekCount - 1);
  const weekStart = clampedWeek * WEEK_SIZE;
  const chartBars = allBars.slice(weekStart, weekStart + WEEK_SIZE);

  const presentInWeek = chartBars.filter((b) => b.status === ATTENDANCE_STATUS.Present);
  const chartTotal = presentInWeek.reduce((s, b) => s + b.hours, 0);
  const chartAvg = presentInWeek.length > 0 ? chartTotal / presentInWeek.length : 0;
  const weekRangeLabel = chartBars.length > 0
    ? `${chartBars[0]!.dayNum} – ${chartBars[chartBars.length - 1]!.dayNum} ${MONTH_NAMES[month - 1]}`
    : '';

  const monthName = MONTH_NAMES[month - 1];
  const attendancePct =
    workingDayCount > 0 ? Math.round((presentCount / workingDayCount) * 100) : 0;

  return (
    <div>
      {/* ── Hero Band ─────────────────────────────────────────────────────────── */}
      <MyOverviewHero>
        <div className="flex flex-wrap items-end justify-between gap-6">
          {/* Left: month title + nav */}
          <div>
            <div className="text-mint/80 text-[11px] uppercase tracking-[0.2em] font-semibold">
              Attendance Overview
            </div>
            <div className="font-heading text-3xl font-bold mt-1 leading-tight">
              {monthName} {year}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  handleMonthChange(
                    month === 1 ? year - 1 : year,
                    month === 1 ? 12 : month - 1,
                  )
                }
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  handleMonthChange(
                    month === 12 ? year + 1 : year,
                    month === 12 ? 1 : month + 1,
                  )
                }
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth() + 1);
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Today
              </button>
            </div>
          </div>

          {/* Right: stats + CTA */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Attendance % */}
            <div>
              <div className="text-mint/70 text-[10px] uppercase tracking-widest font-semibold">Attendance</div>
              <div className="font-heading text-2xl font-bold mt-0.5 leading-none">
                {attendancePct}<span className="text-base">%</span>
              </div>
              <div className="text-[11px] text-mint/80 mt-1">
                {presentCount} of {workingDayCount} working days
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-mint/20" aria-hidden="true" />

            {/* Total Hours */}
            <div>
              <div className="text-mint/70 text-[10px] uppercase tracking-widest font-semibold">Total Hours</div>
              <div className="font-heading text-2xl font-bold mt-0.5 leading-none">
                {minutesToHM(totalMinutes)}
              </div>
              <div className="text-[11px] text-mint/80 mt-1">
                Avg {avgHours.toFixed(1)}h · target 8h
              </div>
            </div>

            {/* Regularise CTA */}
            <Link
              href={regularisationHref}
              className="group relative bg-gradient-to-br from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-forest px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/50 ring-2 ring-white/40 hover:ring-white/70 hover:scale-105 hover:-translate-y-0.5 motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span className="absolute inset-0 rounded-xl bg-amber-200/30 blur-md -z-10" aria-hidden="true" />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Regularise
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </MyOverviewHero>

      {/* ── 4-Tile Summary Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Present */}
        <div className="bg-white rounded-xl border border-sage/30 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate font-medium">Present</span>
            <div className="w-7 h-7 rounded-lg bg-greenbg flex items-center justify-center">
              <svg className="w-4 h-4 text-richgreen" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-charcoal">
            {presentCount}<span className="text-sm font-normal text-slate">/{workingDayCount}</span>
          </div>
          <div className="mt-2 h-1.5 bg-sage/30 rounded-full overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-gradient-to-r from-richgreen to-emerald rounded-full"
              style={{ width: workingDayCount > 0 ? `${Math.round((presentCount / workingDayCount) * 100)}%` : '0%' }}
            />
          </div>
        </div>

        {/* Late Marks */}
        <div className="bg-white rounded-xl border border-sage/30 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate font-medium">Late Marks</span>
            <div className="w-7 h-7 rounded-lg bg-umberbg flex items-center justify-center">
              <svg className="w-4 h-4 text-umber" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className={`font-heading text-2xl font-bold ${lateMonthCount >= lateThreshold ? 'text-crimson' : lateMonthCount > 0 ? 'text-umber' : 'text-charcoal'}`}>
            {lateMonthCount}<span className="text-sm font-normal text-slate">/{lateThreshold}</span>
          </div>
          <div className={`text-[11px] mt-2 ${lateMonthCount === 0 ? 'text-richgreen' : lateMonthCount >= lateThreshold ? 'text-crimson font-medium' : 'text-slate'}`}>
            {lateMonthCount === 0
              ? 'No late marks this month'
              : lateMonthCount >= lateThreshold
                ? 'Deduction threshold reached'
                : `${lateRemaining} more before deduction`}
          </div>
        </div>

        {/* On Leave */}
        <div className="bg-white rounded-xl border border-sage/30 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate font-medium">On Leave</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-charcoal">
            {leaveRows.length} <span className="text-sm font-normal text-slate">days</span>
          </div>
          <div className="text-[11px] text-slate mt-2 truncate">
            {leaveDatesLabel || 'No leave this month'}
          </div>
        </div>

        {/* Avg Hours */}
        <div className="bg-white rounded-xl border border-sage/30 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate font-medium">Avg Hours</span>
            <div className="w-7 h-7 rounded-lg bg-mint/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-forest" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="font-heading text-2xl font-bold text-forest">
            {avgHours.toFixed(1)}<span className="text-sm font-normal text-slate">h</span>
          </div>
          {presentCount > 0 ? (
            <div className={`text-[11px] mt-2 font-medium ${avgDelta >= 0 ? 'text-richgreen' : 'text-crimson'}`}>
              {avgDelta >= 0 ? '↑' : '↓'} {Math.abs(avgDelta).toFixed(1)}h {avgDelta >= 0 ? 'above' : 'below'} target
            </div>
          ) : (
            <div className="text-[11px] text-slate mt-2">No data yet</div>
          )}
        </div>
      </div>

      {/* ── Daily Calendar ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-sage/30 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-base font-semibold text-charcoal">Daily Calendar</h2>
          {/* Status legend renders inside <AttendanceCalendar/> below — auto-generated
              from ATTENDANCE_STATUS_MAP so it stays in sync with the codes. */}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" aria-label="Loading attendance records…" />
          </div>
        ) : isError ? (
          <div role="alert" className="text-crimson text-sm py-6 text-center">
            Failed to load attendance: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : (
          <AttendanceCalendar
            year={year}
            month={month}
            days={rows}
            onMonthChange={handleMonthChange}
          />
        )}
      </div>

      {/* ── Hours Worked Bar Chart ────────────────────────────────────────────── */}
      {allBars.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-sage/30 p-6 mb-6">
          <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="font-heading text-base font-semibold text-charcoal">Hours Worked</h2>
              <p className="text-xs text-slate mt-0.5">
                {(() => {
                  if (chartBars.length === 0) return 'No data for this week';
                  const targets = Array.from(new Set(chartBars.map((b) => b.targetHours)));
                  const targetText = targets.length === 1
                    ? `Target ${targets[0]}h/day`
                    : `Target ${Math.min(...targets)}–${Math.max(...targets)}h/day`;
                  return weekRangeLabel ? `${weekRangeLabel} · ${targetText}` : targetText;
                })()}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="font-heading text-xl font-bold text-forest">{chartAvg.toFixed(1)}h</div>
                <div className="text-[10px] text-slate uppercase tracking-wide font-semibold">Avg (present)</div>
              </div>
              <div className="text-right">
                <div className="font-heading text-xl font-bold text-charcoal">{Math.round(chartTotal)}h</div>
                <div className="text-[10px] text-slate uppercase tracking-wide font-semibold">Week total</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous week"
                  onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                  disabled={clampedWeek === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-sage/40 text-slate hover:bg-offwhite hover:text-charcoal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-[11px] font-semibold text-slate tabular-nums">
                  Week {clampedWeek + 1} / {weekCount}
                </span>
                <button
                  type="button"
                  aria-label="Next week"
                  onClick={() => setWeekIndex((i) => Math.min(weekCount - 1, i + 1))}
                  disabled={clampedWeek >= weekCount - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-sage/40 text-slate hover:bg-offwhite hover:text-charcoal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <HoursBarChart bars={chartBars} />
          <ChartLegend />
        </div>
      )}

      {/* ── Late Marks Notice Banner ──────────────────────────────────────────── */}
      {lateMonthCount > 0 && (
        <div
          className="bg-umberbg border border-umber/25 rounded-xl px-5 py-4 mb-6 flex items-start gap-3"
          role="note"
          aria-label="Late marks notice"
        >
          <svg className="w-5 h-5 text-umber mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-umber">
              {lateMonthCount} Late Mark{lateMonthCount !== 1 ? 's' : ''} This Month
            </div>
            <div className="text-xs text-umber/80 mt-0.5">
              {lateMonthCount >= lateThreshold
                ? `You have reached the deduction threshold (${lateThreshold} late marks). A day has been deducted from your Annual leave balance.`
                : `${lateRemaining} more late mark${lateRemaining !== 1 ? 's' : ''} in ${monthName} would trigger a deduction of 1 day from your Annual leave balance (threshold: ${lateThreshold} late marks per month).`}
            </div>
          </div>
        </div>
      )}

      {/* ── Detailed Log Table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold text-charcoal">
            Detailed Log — {monthName} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                if (month === 1) handleMonthChange(year - 1, 12);
                else handleMonthChange(year, month - 1);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-sage/40 text-slate hover:bg-offwhite hover:text-charcoal transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                handleMonthChange(t.getFullYear(), t.getMonth() + 1);
              }}
              className="text-xs font-semibold text-forest hover:text-emerald px-2 py-1 rounded-lg border border-forest/30 hover:bg-softmint transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                if (month === 12) handleMonthChange(year + 1, 1);
                else handleMonthChange(year, month + 1);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-sage/40 text-slate hover:bg-offwhite hover:text-charcoal transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" aria-label="Loading detailed log…" />
          </div>
        ) : isError ? null : rows.length === 0 ? (
          <div className="text-center text-sm text-slate py-10">
            No attendance records for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-offwhite border-b border-sage/20">
                  <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Date</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Day</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Check-In</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Check-Out</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Hours</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {rows.map((r) => (
                  <tr
                    key={r.date}
                    className={`hover:bg-offwhite transition-colors ${r.late ? 'bg-crimsonbg/30' : ''}`}
                  >
                    <td className="px-6 py-3 font-medium text-charcoal">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-slate">{dayName(r.date)}</td>
                    <td className={`px-4 py-3 ${r.late ? 'text-crimson font-semibold' : 'text-slate'}`}>
                      {fmtTime(r.checkInTime)}
                    </td>
                    <td className="px-4 py-3 text-slate">{fmtTime(r.checkOutTime)}</td>
                    <td className="px-4 py-3 text-slate">
                      {r.hoursWorkedMinutes !== null && r.hoursWorkedMinutes !== undefined
                        ? minutesToHM(r.hoursWorkedMinutes)
                        : ''}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {r.late && (
                        <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-0.5 rounded" aria-label="Late mark">
                          Late
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
