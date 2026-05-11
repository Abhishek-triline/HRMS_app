'use client';

/**
 * MyAttendanceView — personal attendance view for the admin's ?scope=me branch.
 * Visual reference: prototype/admin/my-attendance.html
 *
 * Sections (prototype-exact order):
 *   1. Hero band — month nav, Attendance %, Total Hours, Regularise CTA
 *   2. 4-tile summary strip — Present | Late Marks | On Leave | Avg Hours
 *   3. Daily Calendar
 *   4. Hours Worked bar chart
 *   5. Late Marks notice banner (only when lateMonthCount > 0)
 *   6. Detailed Log table
 *
 * Regularise link → /admin/regularisation (admin variant of the form).
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { MyOverviewHero } from '@/features/overview/components/MyOverviewHero';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';

// ── Helpers ────────────────────────────────────────────────────────────────────

function minutesToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
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

interface BarChartProps {
  bars: { label: string; hours: number; late: boolean }[];
  targetHours?: number;
}

function HoursBarChart({ bars, targetHours = 8 }: BarChartProps) {
  if (bars.length === 0) return null;

  const maxH = Math.max(...bars.map((b) => b.hours), targetHours + 1);
  const chartH = 90;
  const targetPct = ((maxH - targetHours) / maxH) * 100;

  return (
    <div className="relative" aria-hidden="true">
      {/* Target dashed line */}
      <div
        className="absolute inset-x-0 border-t border-dashed border-forest/30 pointer-events-none"
        style={{ top: `${targetPct}%` }}
      >
        <span className="absolute -top-2.5 right-0 text-[9px] text-forest/70 bg-white px-1 font-semibold">
          {targetHours}h target
        </span>
      </div>

      {/* Bars */}
      <div
        className="flex items-end justify-between gap-1.5"
        style={{ height: `${chartH + 18}px`, paddingTop: '4px' }}
      >
        {bars.map((b) => {
          const pct = maxH > 0 ? (b.hours / maxH) * 100 : 0;
          return (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-sm ${b.late ? 'bg-gradient-to-t from-crimson to-crimson/70' : 'bg-gradient-to-t from-forest to-emerald'}`}
                style={{ height: `${Math.max((pct / 100) * chartH, 2)}px` }}
                title={`${b.label}: ${b.hours.toFixed(1)}h${b.late ? ' (Late)' : ''}`}
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

// ── Status badge for the log table ────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present: 'bg-greenbg text-richgreen',
    Absent: 'bg-crimsonbg text-crimson',
    'On-Leave': 'bg-amber-50 text-amber-700 border border-amber-200',
    'Weekly-Off': 'bg-gray-100 text-slate',
    Holiday: 'bg-softmint text-forest',
  };
  const cls = map[status] ?? 'bg-gray-100 text-slate';
  const label =
    status === 'On-Leave' ? 'On Leave'
    : status === 'Weekly-Off' ? 'Weekly Off'
    : status;
  return <span className={`text-xs font-bold px-2 py-1 rounded ${cls}`}>{label}</span>;
}

// ── MyAttendanceView ───────────────────────────────────────────────────────────

export function MyAttendanceView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, isLoading, isError, error } = useAttendanceList('me', { from, to });

  const handleMonthChange = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
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

  const workingRows = rows.filter((r) => r.status !== 'Weekly-Off' && r.status !== 'Holiday');
  const presentRows = rows.filter((r) => r.status === 'Present');
  const lateRows = rows.filter((r) => r.late);
  const leaveRows = rows.filter((r) => r.status === 'On-Leave');

  const presentCount = presentRows.length;
  const workingDayCount = workingRows.length;
  const lateMonthCount = lateRows.length;
  const lateThreshold = 3;
  const lateRemaining = Math.max(0, lateThreshold - lateMonthCount);

  const totalMinutes = presentRows.reduce((sum, r) => sum + (r.hoursWorkedMinutes ?? 0), 0);
  const avgHours = presentCount > 0 ? totalMinutes / presentCount / 60 : 0;
  const avgDelta = avgHours - 8;

  const leaveDatesLabel = leaveRows
    .slice(0, 3)
    .map((r) => {
      const d = new Date(r.date);
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
    })
    .join(' · ');

  // Last 14 working days with hours for chart
  const chartBars = rows
    .filter((r) => r.status === 'Present' && r.hoursWorkedMinutes !== null)
    .slice(-14)
    .map((r) => {
      const d = new Date(r.date);
      const label = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
      return { label, hours: (r.hoursWorkedMinutes ?? 0) / 60, late: r.late };
    });

  const chartTotal = chartBars.reduce((s, b) => s + b.hours, 0);
  const chartAvg = chartBars.length > 0 ? chartTotal / chartBars.length : 0;

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
              href="/admin/regularisation"
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
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-slate">
              <span className="w-2 h-2 rounded-full bg-richgreen" aria-hidden="true" />Present
            </span>
            <span className="flex items-center gap-1.5 text-slate">
              <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />Leave
            </span>
            <span className="flex items-center gap-1.5 text-slate">
              <span className="w-2 h-2 rounded-full bg-crimson" aria-hidden="true" />Late
            </span>
            <span className="flex items-center gap-1.5 text-slate">
              <span className="w-2 h-2 rounded-full bg-slate/40" aria-hidden="true" />Off
            </span>
          </div>
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
      {chartBars.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-sage/30 p-6 mb-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="font-heading text-base font-semibold text-charcoal">Hours Worked</h2>
              <p className="text-xs text-slate mt-0.5">
                Last {chartBars.length} working days · Target 8h/day
              </p>
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
        <div className="px-6 py-4 border-b border-sage/20">
          <h2 className="font-heading text-base font-semibold text-charcoal">
            Detailed Log — {monthName} {year}
          </h2>
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
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {r.late ? (
                        <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-0.5 rounded" aria-label="Late mark">
                          Late
                        </span>
                      ) : (
                        <span className="text-slate text-xs" aria-label="Not late">—</span>
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
