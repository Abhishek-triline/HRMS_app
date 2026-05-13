'use client';

/**
 * M-05 — Team Attendance (Manager)
 * Visual reference: prototype/manager/attendance-team.html
 *
 * - Date picker + employee filter
 * - Table view of team attendance
 * - Toggle: calendar / table
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';

export default function TeamAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [employeeIdStr, setEmployeeIdStr] = useState('');
  const [view, setView] = useState<'calendar' | 'table'>('table');

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, isLoading, isError, error } = useAttendanceList('team', {
    from,
    to,
    // Month-of-team can easily exceed the default limit=20 (a 5-person team
    // × 22 working days = 110 rows). Bumped to fit a normal team-month.
    limit: 100,
    ...(employeeIdStr ? { employeeId: Number(employeeIdStr) } : {}),
  });

  const rows: CalendarDay[] = (data?.data ?? []).map((r) => ({
    date: r.date,
    status: r.status,
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    hoursWorkedMinutes: r.hoursWorkedMinutes,
    late: r.late,
    employeeName: r.employeeName,
    employeeCode: r.employeeCode,
  }));

  const handleMonthChange = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  // Late marks summary
  const lateDays = rows.filter((r) => r.late);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Team Attendance</h1>
        <p className="text-sm text-slate mt-1">View attendance records for your direct reports.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="att-month" className="block text-xs font-semibold text-charcoal mb-1">Month</label>
          <input
            id="att-month"
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) { setYear(y); setMonth(m); }
            }}
            className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        </div>
        <div>
          <label htmlFor="att-emp" className="block text-xs font-semibold text-charcoal mb-1">Employee (optional)</label>
          <input
            id="att-emp"
            type="text"
            value={employeeIdStr}
            onChange={(e) => setEmployeeIdStr(e.target.value)}
            placeholder="Employee ID…"
            className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        </div>
        <div className="flex gap-1 bg-offwhite rounded-lg p-1 ml-auto">
          {(['table', 'calendar'] as const).map((v) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Main table/calendar */}
        <div className={clsx('bg-white rounded-xl shadow-sm border border-sage/30', lateDays.length > 0 ? 'xl:col-span-3' : 'xl:col-span-4')}>
          <div className="px-5 py-4 border-b border-sage/20">
            <h2 className="font-heading text-sm font-semibold text-charcoal">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" aria-label="Loading team attendance…" />
              </div>
            ) : isError ? (
              <div role="alert" className="text-crimson text-sm py-6 text-center">
                Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            ) : view === 'table' ? (
              <AttendanceTable
                rows={rows}
                showEmployee={!employeeIdStr}
                caption={`Team attendance for ${MONTH_NAMES[month - 1]} ${year}`}
              />
            ) : (
              <AttendanceCalendar
                year={year}
                month={month}
                days={rows}
                onMonthChange={handleMonthChange}
              />
            )}
          </div>
        </div>

        {/* Late marks sidebar */}
        {lateDays.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-sage/30">
            <div className="px-5 py-4 border-b border-sage/20 flex items-center gap-2">
              <svg className="w-4 h-4 text-umber" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 className="font-heading text-sm font-semibold text-charcoal">Recent Late Marks</h3>
            </div>
            <div className="p-4 space-y-2">
              {lateDays.slice(0, 10).map((r) => (
                <div key={`${r.date}-${r.employeeCode}`} className="bg-umberbg border border-umber/20 rounded-lg p-3">
                  <div className="text-xs font-semibold text-charcoal">{r.employeeName ?? r.employeeCode}</div>
                  <div className="text-xs text-slate mt-0.5">{r.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
