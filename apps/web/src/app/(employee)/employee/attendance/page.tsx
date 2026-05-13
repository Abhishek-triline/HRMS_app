'use client';

/**
 * E-05 — My Attendance (Employee)
 * Visual reference: prototype/employee/my-attendance.html
 *
 * Layout (prototype-exact):
 *   1. Hero band — month nav, attendance %, total hours, Regularise CTA
 *   2. 4-tile summary strip — Present | Late Marks | On Leave | Avg Hours
 *   3. Hours Worked SVG bar chart (inline, no library)
 *   4. Late Marks notice banner (umberbg, only when lateMonthCount > 0)
 *   5. Monthly calendar (AttendanceCalendar)
 *   6. Detailed log table — both rendered, no toggle
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP } from '@/lib/status/maps';
import type { AttendanceStatusValue } from '@nexora/contracts/attendance';

// ── Helpers ────────────────────────────────────────────────────────────────────

function minutesToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h % 12) || 12);
  return `${h12}:${m} ${ampm}`;
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Hours Worked SVG Bar Chart ─────────────────────────────────────────────────

interface BarChartProps {
  bars: { label: string; hours: number; late: boolean }[];
  targetHours?: number;
}

function HoursBarChart({ bars, targetHours = 8 }: BarChartProps) {
  if (bars.length === 0) return null;

  const maxH = Math.max(...bars.map((b) => b.hours), targetHours + 1);
  // target line position as % from top (chart height = 112px, padded)
  const chartH = 90; // usable bar height in px
  const targetPct = ((maxH - targetHours) / maxH) * 100;

  return (
    <div className="relative">
      {/* Target line */}
      <div
        className="absolute inset-x-0 border-t border-dashed border-forest/30 pointer-events-none"
        style={{ top: `${targetPct}%` }}
        aria-hidden="true"
      >
        <span className="absolute -top-2.5 right-0 text-[9px] text-forest/70 bg-white px-1 font-semibold">
          {targetHours}h target
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end justify-between gap-1.5" style={{ height: `${chartH + 18}px`, paddingTop: '4px' }}>
        {bars.map((b) => {
          const pct = maxH > 0 ? (b.hours / maxH) * 100 : 0;
          const tooltipText = `${b.hours.toFixed(1)} hours${b.late ? ' (late)' : ''}`;
          return (
            <div
              key={b.label}
              className="group relative flex-1 flex flex-col items-center gap-1"
              tabIndex={0}
              role="img"
              aria-label={`${b.label}: ${tooltipText}`}
            >
              {/* Tooltip — visible on hover (mouse) or keyboard focus */}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-charcoal text-white text-[10px] font-semibold whitespace-nowrap shadow-md opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 z-10"
              >
                <div className="text-center">
                  <div className="text-mint/90 text-[9px] font-medium uppercase tracking-wide">{b.label}</div>
                  <div className="font-bold">{tooltipText}</div>
                </div>
                {/* Caret */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-charcoal" />
              </div>

              <div
                className={`w-full rounded-t-sm transition-opacity duration-150 group-hover:opacity-80 group-focus-within:opacity-80 ${b.late ? 'bg-gradient-to-t from-crimson to-crimson/70' : 'bg-gradient-to-t from-forest to-emerald'}`}
                style={{ height: `${Math.max((pct / 100) * chartH, 2)}px` }}
              />
              <span className={`text-[9px] ${b.late ? 'text-crimson font-semibold' : 'text-slate'}`}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Status badge for table ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AttendanceStatusValue }) {
  const map: Record<number, string> = {
    [ATTENDANCE_STATUS.Present]: 'bg-greenbg text-richgreen',
    [ATTENDANCE_STATUS.Absent]: 'bg-crimsonbg text-crimson',
    [ATTENDANCE_STATUS.OnLeave]: 'bg-amber-50 text-amber-700 border border-amber-200',
    [ATTENDANCE_STATUS.WeeklyOff]: 'bg-gray-100 text-slate',
    [ATTENDANCE_STATUS.Holiday]: 'bg-softmint text-forest',
  };
  const cls = map[status] ?? 'bg-gray-100 text-slate';
  const label = ATTENDANCE_STATUS_MAP[status]?.label ?? String(status);
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded ${cls}`}>{label}</span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const LOG_PAGE_SIZE = 10;

export default function MyAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [logPage, setLogPage] = useState(1);

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // limit=100 so a full calendar month (~22-31 rows) is never truncated
  // by the default limit=20 pagination.
  const { data, isLoading, isError, error } = useAttendanceList('me', { from, to, limit: 100 });

  const handleMonthChange = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setLogPage(1); // reset to first page when month changes
  }, []);

  const rows: CalendarDay[] = (data?.data ?? []).map((r) => ({
    date: r.date,
    status: r.status,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    hoursWorkedMinutes: r.hoursWorkedMinutes,
    late: r.late,
  }));

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
  const avgDelta = avgHours - 8;

  // Leave dates label
  const leaveDatesLabel = leaveRows
    .slice(0, 3)
    .map((r) => {
      const d = new Date(r.date);
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
    })
    .join(' · ');

  // ── Bar chart data — last 14 working days with hours ──────────────────────
  const chartBars = rows
    .filter((r) => r.status === ATTENDANCE_STATUS.Present && r.hoursWorkedMinutes !== null)
    .slice(-14)
    .map((r) => {
      const d = new Date(r.date);
      const label = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
      return {
        label,
        hours: (r.hoursWorkedMinutes ?? 0) / 60,
        late: r.late,
      };
    });

  // Average + total for chart header
  const chartTotal = chartBars.reduce((s, b) => s + b.hours, 0);
  const chartAvg = chartBars.length > 0 ? chartTotal / chartBars.length : 0;

  const monthName = MONTH_NAMES[month - 1];

  return (
    <div>

      {/* Hero band — prototype/employee/my-attendance.html */}
      <div
        className="relative overflow-hidden rounded-2xl text-white p-6 mb-6 shadow-2xl shadow-forest/40"
        style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #1C3D2E 25%, #2D7A5F 60%, #4DA37A 90%, #6FBE9E 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(200,230,218,0.20) 48%, rgba(255,255,255,0.06) 52%, transparent 72%)' }} aria-hidden="true" />
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,153,0.35) 0%, rgba(255,180,120,0.18) 28%, transparent 60%)', filter: 'blur(24px)' }} aria-hidden="true" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(111,190,158,0.45) 0%, rgba(45,122,95,0.20) 35%, transparent 65%)', filter: 'blur(36px)' }} aria-hidden="true" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" viewBox="0 0 800 240" preserveAspectRatio="none" fill="none" stroke="white" strokeWidth="1" aria-hidden="true">
          <path d="M0,40 C150,10 300,70 450,30 S700,80 800,50"/>
          <path d="M0,80 C150,50 300,110 450,70 S700,120 800,90"/>
          <path d="M0,120 C150,90 300,150 450,110 S700,160 800,130"/>
          <path d="M0,160 C150,130 300,190 450,150 S700,200 800,170"/>
        </svg>
        <svg className="absolute inset-x-0 bottom-0 w-full opacity-25 pointer-events-none" viewBox="0 0 800 60" preserveAspectRatio="none" fill="#0F2E22" aria-hidden="true">
          <path d="M0,60 L0,38 L70,18 L150,32 L230,14 L310,30 L390,8 L470,22 L550,12 L630,28 L710,16 L800,30 L800,60 Z"/>
        </svg>
        <svg className="absolute inset-x-0 bottom-0 w-full opacity-30 pointer-events-none" viewBox="0 0 800 40" preserveAspectRatio="none" fill="#1C3D2E" aria-hidden="true">
          <path d="M0,40 L0,25 L60,10 L140,22 L220,5 L300,18 L380,2 L460,15 L540,6 L620,20 L700,8 L800,22 L800,40 Z"/>
        </svg>

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-mint/80 text-[11px] uppercase tracking-[0.2em] font-semibold">Attendance Overview</div>
            <div className="font-heading text-3xl font-bold mt-1 leading-tight">{monthName} {year}</div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => handleMonthChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1)}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => handleMonthChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-mint/70 text-[10px] uppercase tracking-widest font-semibold">Attendance</div>
              <div className="font-heading text-2xl font-bold mt-0.5 leading-none">
                {workingDayCount > 0 ? Math.round((presentCount / workingDayCount) * 100) : 0}
                <span className="text-base">%</span>
              </div>
              <div className="text-[11px] text-mint/80 mt-1">{presentCount} of {workingDayCount} working days</div>
            </div>
            <div className="w-px h-12 bg-mint/20" aria-hidden="true" />
            <div>
              <div className="text-mint/70 text-[10px] uppercase tracking-widest font-semibold">Total Hours</div>
              <div className="font-heading text-2xl font-bold mt-0.5 leading-none">
                {minutesToHM(totalMinutes)}
              </div>
              <div className="text-[11px] text-mint/80 mt-1">Avg {avgHours.toFixed(1)}h · target 8h</div>
            </div>
            <Link
              href="/employee/regularisation"
              className="group relative bg-gradient-to-br from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-forest px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/50 ring-2 ring-white/40 hover:ring-white/70 hover:scale-105 hover:-translate-y-0.5 motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Regularise
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* 4-Tile Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Present */}
        <div className="bg-white rounded-xl border border-sage/30 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate font-medium">Present</span>
            <div className="w-7 h-7 rounded-lg bg-greenbg flex items-center justify-center">
              <svg className="w-4 h-4 text-richgreen" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
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

      {/* Hours Worked Bar Chart */}
      {chartBars.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-sage/30 p-6 mb-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="font-heading text-base font-semibold text-charcoal">Hours Worked</h2>
              <p className="text-xs text-slate mt-0.5">Last {chartBars.length} working days · Target 8h/day</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="font-heading text-xl font-bold text-forest">{chartAvg.toFixed(1)}h</div>
                <div className="text-[10px] text-slate uppercase tracking-wide font-semibold">Average</div>
              </div>
              <div className="text-right">
                <div className="font-heading text-xl font-bold text-charcoal">{Math.round(chartTotal)}h</div>
                <div className="text-[10px] text-slate uppercase tracking-wide font-semibold">Total</div>
              </div>
            </div>
          </div>
          <HoursBarChart bars={chartBars} targetHours={8} />
        </div>
      )}

      {/* Late Marks Notice Banner (only when lateMonthCount > 0) */}
      {lateMonthCount > 0 && (
        <div
          className="bg-umberbg border border-umber/25 rounded-xl px-5 py-4 mb-6 flex items-start gap-3"
          role="note"
          aria-label="Late marks notice"
        >
          <svg className="w-5 h-5 text-umber mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <div className="text-sm font-semibold text-umber">
              {lateMonthCount} Late Mark{lateMonthCount !== 1 ? 's' : ''} This Month
            </div>
            <div className="text-xs text-umber/80 mt-0.5">
              {lateMonthCount >= lateThreshold
                ? `You have reached the deduction threshold (${lateThreshold} late marks). A day has been deducted from your Annual leave balance.`
                : `${lateRemaining} more late mark${lateRemaining !== 1 ? 's' : ''} in ${monthName} would trigger a deduction. Late = check-in after 10:30 AM.`}
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
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

      {/* Detailed Log Table */}
      {(() => {
        // Sort newest first then paginate (client-side — the full month is
        // already loaded by useAttendanceList above, no extra fetch).
        const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
        const totalRows = sorted.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / LOG_PAGE_SIZE));
        const safePage = Math.min(logPage, totalPages);
        const startIdx = (safePage - 1) * LOG_PAGE_SIZE;
        const pageRows = sorted.slice(startIdx, startIdx + LOG_PAGE_SIZE);
        const shownFrom = totalRows === 0 ? 0 : startIdx + 1;
        const shownTo = startIdx + pageRows.length;

        return (
          <div className="bg-white rounded-xl shadow-sm border border-sage/30">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-charcoal">
                Detailed Log — {monthName} {year}
              </h2>
              {totalRows > 0 && (
                <span className="text-xs text-slate">{totalRows} records</span>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" aria-label="Loading detailed log…" />
              </div>
            ) : isError ? null : totalRows === 0 ? (
              <div className="text-center text-sm text-slate py-10">
                No attendance records for this month.
              </div>
            ) : (
              <>
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
                      {pageRows.map((r) => (
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
                              : '—'}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={r.status as AttendanceStatusValue} /></td>
                          <td className="px-4 py-3">
                            {r.late ? (
                              <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-0.5 rounded" aria-label="Late">Late</span>
                            ) : (
                              <span className="text-slate text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginator */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-sage/20 text-xs text-slate">
                  <span>
                    Showing {shownFrom}–{shownTo} of {totalRows}
                  </span>
                  {totalPages > 1 && (
                    <nav aria-label="Detailed log pagination" className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLogPage(Math.max(1, safePage - 1))}
                        disabled={safePage === 1}
                        className="border border-sage/50 px-3 py-1.5 rounded hover:bg-offwhite disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setLogPage(p)}
                          aria-current={p === safePage ? 'page' : undefined}
                          className={`px-3 py-1.5 rounded ${
                            p === safePage
                              ? 'bg-forest text-white'
                              : 'border border-sage/50 hover:bg-offwhite'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setLogPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage === totalPages}
                        className="border border-sage/50 px-3 py-1.5 rounded hover:bg-offwhite disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })()}

    </div>
  );
}
