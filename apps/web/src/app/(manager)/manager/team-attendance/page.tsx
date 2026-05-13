'use client';

/**
 * M-05 — Team Attendance (Manager)
 * Visual reference: prototype/manager/attendance-team.html
 *
 * - Date picker + employee filter
 * - Toggle: calendar / table
 *
 * Pagination: table view uses server-side cursor pagination (a team-month
 * easily crosses 100 rows — e.g. 5 employees × 22 days). Calendar view is
 * only meaningful when one employee is selected, since multiple employees
 * collapse into one date-keyed map; we surface an empty-state prompt
 * otherwise instead of silently merging.
 */

import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { CursorPaginator } from '@/components/ui/CursorPaginator';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';

const PAGE_SIZE = 20;

export default function TeamAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [employeeIdStr, setEmployeeIdStr] = useState('');
  const [view, setView] = useState<'calendar' | 'table'>('table');

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const employeeId = employeeIdStr ? Number(employeeIdStr) : undefined;

  // Table view: cursor pagination. Calendar view: bulk fetch for one
  // employee's month (max 31 rows, well under the API ceiling).
  const pager = useCursorPagination({
    pageSize: PAGE_SIZE,
    filtersKey: `${view}|${from}|${to}|${employeeIdStr}`,
  });

  const isCalendarReady = view === 'calendar' && employeeId !== undefined;

  const { data, isLoading, isError, error } = useAttendanceList('team', {
    from,
    to,
    ...(view === 'table'
      ? { limit: pager.pageSize, cursor: pager.cursor }
      : { limit: 100 }),
    ...(employeeId ? { employeeId } : {}),
  });

  useEffect(() => {
    if (view === 'table' && data) pager.cacheNextCursor(data.nextCursor);
  }, [view, data, pager]);

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

  // Late marks in the currently visible rows (paginated view = current page;
  // calendar view = whole month for the selected employee).
  const lateDays = rows.filter((r) => r.late);
  const hasMoreLatePages = view === 'table' && pager.hasMore;

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
          <label htmlFor="att-emp" className="block text-xs font-semibold text-charcoal mb-1">
            Employee {view === 'calendar' ? <span className="text-crimson">*</span> : '(optional)'}
          </label>
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
            {view === 'calendar' && !isCalendarReady ? (
              <div className="py-12 text-center text-sm text-slate">
                <p className="font-medium text-charcoal mb-1">Pick one employee to see the calendar.</p>
                <p>Calendar view shows a single employee&apos;s month. Switch to the table view to see the whole team.</p>
              </div>
            ) : isLoading ? (
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
          {view === 'table' && (
            <CursorPaginator
              currentPage={pager.currentPage}
              pageSize={pager.pageSize}
              currentPageCount={rows.length}
              hasMore={pager.hasMore}
              highestReachablePage={pager.highestReachablePage}
              onPageChange={pager.goToPage}
              onPrev={pager.goPrev}
              onNext={pager.goNext}
            />
          )}
        </div>

        {/* Late marks sidebar */}
        {lateDays.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-sage/30">
            <div className="px-5 py-4 border-b border-sage/20 flex items-center gap-2">
              <svg className="w-4 h-4 text-umber" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 className="font-heading text-sm font-semibold text-charcoal">
                Recent Late Marks{hasMoreLatePages ? ' (this page)' : ''}
              </h3>
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
