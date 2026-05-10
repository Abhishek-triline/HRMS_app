'use client';

/**
 * Manager own attendance — same as E-05 but scoped to the manager's own records.
 * BL-004: every role is also an employee for self-service attendance views.
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

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function ManagerMyAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [view, setView] = useState<'calendar' | 'table'>('calendar');

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, isLoading, isError, error } = useAttendanceList('me', { from, to });

  const rows: CalendarDay[] = (data?.data ?? []).map((r) => ({
    date: r.date,
    status: r.status,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    hoursWorkedMinutes: r.hoursWorkedMinutes,
    late: r.late,
  }));

  const handleMonthChange = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-charcoal">My Attendance</h1>
          <p className="text-sm text-slate mt-1">Your personal attendance record.</p>
        </div>
        <Link
          href="/manager/regularisation"
          className="bg-gradient-to-br from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 text-forest px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-md shadow-amber-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Regularise
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-base font-semibold text-charcoal">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="flex items-center gap-3">
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
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" aria-label="Loading…" /></div>
        ) : isError ? (
          <div role="alert" className="text-crimson text-sm py-6 text-center">
            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : view === 'calendar' ? (
          <AttendanceCalendar year={year} month={month} days={rows} onMonthChange={handleMonthChange} />
        ) : (
          <AttendanceTable rows={rows} caption={`My attendance for ${MONTH_NAMES[month - 1]} ${year}`} />
        )}
      </div>
    </div>
  );
}
