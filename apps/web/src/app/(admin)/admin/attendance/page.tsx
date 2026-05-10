'use client';

/**
 * A-09 — Org-wide Attendance (Admin)
 * Visual reference: prototype/admin/attendance.html
 *
 * - Date picker + status filter + department filter
 * - Table of all employees' attendance
 * - Toggle calendar/table
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import type { CalendarDay } from '@/components/attendance/AttendanceCalendar';
import type { AttendanceStatus } from '@nexora/contracts/attendance';

export default function AdminAttendancePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [view, setView] = useState<'table' | 'calendar'>('table');

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, isLoading, isError, error } = useAttendanceList('all', {
    from,
    to,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(department ? { department } : {}),
    ...(employeeId ? { employeeId } : {}),
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Org-wide Attendance</h1>
        <p className="text-sm text-slate mt-1">View all employee attendance records across the organisation.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5 mb-5 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="admin-att-month" className="block text-xs font-semibold text-charcoal mb-1">Month</label>
          <input
            id="admin-att-month"
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
          <label htmlFor="admin-att-status" className="block text-xs font-semibold text-charcoal mb-1">Status</label>
          <select
            id="admin-att-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | '')}
            className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          >
            <option value="">All statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="On-Leave">On Leave</option>
            <option value="Weekly-Off">Weekly Off</option>
            <option value="Holiday">Holiday</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin-att-dept" className="block text-xs font-semibold text-charcoal mb-1">Department</label>
          <input
            id="admin-att-dept"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department…"
            className="border border-sage rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
          />
        </div>
        <div>
          <label htmlFor="admin-att-emp" className="block text-xs font-semibold text-charcoal mb-1">Employee</label>
          <input
            id="admin-att-emp"
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
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

      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-5 py-4 border-b border-sage/20">
          <h2 className="font-heading text-sm font-semibold text-charcoal">
            {MONTH_NAMES[month - 1]} {year}
            {rows.length > 0 && <span className="text-slate font-normal ml-2">({rows.length} records)</span>}
          </h2>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" aria-label="Loading attendance…" />
            </div>
          ) : isError ? (
            <div role="alert" className="text-crimson text-sm py-6 text-center">
              Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : view === 'table' ? (
            <AttendanceTable
              rows={rows}
              showEmployee
              caption={`Org-wide attendance for ${MONTH_NAMES[month - 1]} ${year}`}
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
    </div>
  );
}
