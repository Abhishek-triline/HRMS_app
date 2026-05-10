'use client';

/**
 * AttendanceTable — tabular monthly view with check-in/out times, status, hours.
 * Shows employee columns when data includes employeeName (team/admin views).
 */

import { clsx } from 'clsx';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import type { CalendarDay } from './AttendanceCalendar';

interface AttendanceTableProps {
  rows: CalendarDay[];
  showEmployee?: boolean;
  caption?: string;
}

function formatHHMM(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesToHM(mins: number | null): string {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function AttendanceTable({ rows, showEmployee = false, caption }: AttendanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-offwhite border-b border-sage/30">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Date</th>
            {showEmployee && (
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Employee</th>
            )}
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Check-in</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Check-out</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Hours</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Late</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sage/20">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={showEmployee ? 7 : 6}
                className="text-center text-sm text-slate py-10"
              >
                No attendance records found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={`${row.date}-${row.employeeCode ?? ''}`}
                className="hover:bg-offwhite/60 transition-colors"
              >
                <td className="px-5 py-3.5 font-medium text-charcoal">{row.date}</td>
                {showEmployee && (
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-charcoal">{row.employeeName ?? '—'}</div>
                    {row.employeeCode && (
                      <div className="text-xs text-slate">{row.employeeCode}</div>
                    )}
                  </td>
                )}
                <td className="px-4 py-3.5">
                  <AttendanceStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-charcoal">{formatHHMM(row.checkInTime)}</td>
                <td className="px-4 py-3.5 text-charcoal">{formatHHMM(row.checkOutTime)}</td>
                <td className="px-4 py-3.5 text-charcoal">{minutesToHM(row.hoursWorkedMinutes)}</td>
                <td className="px-4 py-3.5">
                  {row.late ? (
                    <span className="text-xs font-bold text-umber bg-umberbg px-2 py-0.5 rounded">Late</span>
                  ) : (
                    <span className="text-xs text-slate">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
