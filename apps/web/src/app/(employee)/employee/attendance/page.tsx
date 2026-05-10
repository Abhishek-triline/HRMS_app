'use client';

/**
 * E-05 — My Attendance (Employee)
 * Visual reference: prototype/employee/my-attendance.html
 *
 * - Hero band with month/year, attendance %, total hours, Regularise CTA
 * - Calendar grid (month view) with colour-coded dots
 * - Monthly stats: Present / Absent / On-Leave / Weekly-Off / Holiday
 * - Switches between calendar and table view
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';
import type { AttendanceStatus } from '@nexora/contracts/attendance';

const STATUS_LIST: AttendanceStatus[] = ['Present', 'Absent', 'On-Leave', 'Weekly-Off', 'Holiday'];

const statLabel: Record<AttendanceStatus, string> = {
  Present: 'Present',
  Absent: 'Absent',
  'On-Leave': 'On Leave',
  'Weekly-Off': 'Weekly Off',
  Holiday: 'Holiday',
};

const statColour: Record<AttendanceStatus, { bg: string; text: string }> = {
  Present: { bg: 'bg-greenbg', text: 'text-richgreen' },
  Absent: { bg: 'bg-crimsonbg', text: 'text-crimson' },
  'On-Leave': { bg: 'bg-softmint', text: 'text-forest' },
  'Weekly-Off': { bg: 'bg-sage/20', text: 'text-slate' },
  Holiday: { bg: 'bg-mint', text: 'text-forest' },
};

function minutesToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MyAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [view, setView] = useState<'calendar' | 'table'>('calendar');

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

  // Stats
  const counts: Record<AttendanceStatus, number> = {
    Present: 0, Absent: 0, 'On-Leave': 0, 'Weekly-Off': 0, Holiday: 0,
  };
  let totalMinutes = 0;
  for (const r of rows) {
    counts[r.status]++;
    totalMinutes += r.hoursWorkedMinutes ?? 0;
  }
  const workingDays = counts.Present + counts.Absent;
  const attendancePct = workingDays > 0 ? Math.round((counts.Present / workingDays) * 100) : 0;

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  return (
    <div className="p-8">

      {/* Hero band — matches prototype/employee/my-attendance.html */}
      <div
        className="relative overflow-hidden rounded-2xl text-white p-6 mb-6 shadow-2xl shadow-forest/40"
        style={{
          background: 'linear-gradient(160deg, #0F2E22 0%, #1C3D2E 25%, #2D7A5F 60%, #4DA37A 90%, #6FBE9E 100%)',
        }}
      >
        {/* Decorative overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(200,230,218,0.20) 48%, rgba(255,255,255,0.06) 52%, transparent 72%)' }} aria-hidden="true" />
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,153,0.35) 0%, rgba(255,180,120,0.18) 28%, transparent 60%)', filter: 'blur(24px)' }} aria-hidden="true" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(111,190,158,0.45) 0%, rgba(45,122,95,0.20) 35%, transparent 65%)', filter: 'blur(36px)' }} aria-hidden="true" />
        {/* Topo lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" viewBox="0 0 800 240" preserveAspectRatio="none" fill="none" stroke="white" strokeWidth="1" aria-hidden="true">
          <path d="M0,40 C150,10 300,70 450,30 S700,80 800,50"/>
          <path d="M0,80 C150,50 300,110 450,70 S700,120 800,90"/>
          <path d="M0,120 C150,90 300,150 450,110 S700,160 800,130"/>
          <path d="M0,160 C150,130 300,190 450,150 S700,200 800,170"/>
        </svg>
        {/* Mountains */}
        <svg className="absolute inset-x-0 bottom-0 w-full opacity-25 pointer-events-none" viewBox="0 0 800 60" preserveAspectRatio="none" fill="#0F2E22" aria-hidden="true">
          <path d="M0,60 L0,38 L70,18 L150,32 L230,14 L310,30 L390,8 L470,22 L550,12 L630,28 L710,16 L800,30 L800,60 Z"/>
        </svg>
        <svg className="absolute inset-x-0 bottom-0 w-full opacity-30 pointer-events-none" viewBox="0 0 800 40" preserveAspectRatio="none" fill="#1C3D2E" aria-hidden="true">
          <path d="M0,40 L0,25 L60,10 L140,22 L220,5 L300,18 L380,2 L460,15 L540,6 L620,20 L700,8 L800,22 L800,40 Z"/>
        </svg>

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-mint/80 text-[11px] uppercase tracking-[0.2em] font-semibold">Attendance Overview</div>
            <div className="font-heading text-3xl font-bold mt-1 leading-tight">
              {MONTH_NAMES[month - 1]} {year}
            </div>
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
                {attendancePct}<span className="text-base">%</span>
              </div>
              <div className="text-[11px] text-mint/80 mt-1">
                {counts.Present} of {workingDays} working days
              </div>
            </div>
            <div className="w-px h-12 bg-mint/20" aria-hidden="true" />
            <div>
              <div className="text-mint/70 text-[10px] uppercase tracking-widest font-semibold">Total Hours</div>
              <div className="font-heading text-2xl font-bold mt-0.5 leading-none">
                {minutesToHM(totalMinutes)}
              </div>
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

      {/* Monthly stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {STATUS_LIST.map((s) => (
          <div key={s} className={clsx('rounded-xl p-4 text-center', statColour[s].bg)}>
            <div className={clsx('font-heading text-2xl font-bold', statColour[s].text)}>{counts[s]}</div>
            <div className={clsx('text-xs font-semibold mt-0.5', statColour[s].text)}>{statLabel[s]}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-base font-semibold text-charcoal">
            {MONTH_NAMES[month - 1]} {year} — Attendance
          </h2>
          <div className="flex gap-1 bg-offwhite rounded-lg p-1">
            {(['calendar', 'table'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
                  view === v ? 'bg-white shadow-sm text-charcoal' : 'text-slate hover:text-charcoal',
                )}
              >
                {v}
              </button>
            ))}
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
        ) : view === 'calendar' ? (
          <AttendanceCalendar
            year={year}
            month={month}
            days={rows}
            onMonthChange={handleMonthChange}
          />
        ) : (
          <AttendanceTable rows={rows} caption={`Attendance for ${MONTH_NAMES[month - 1]} ${year}`} />
        )}
      </div>
    </div>
  );
}
