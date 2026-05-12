'use client';

/**
 * ThisMonthStats — attendance stat block for the employee detail sidebar.
 * Shows Present / Absent / Late / LOP counts + an attendance-rate progress bar.
 *
 * Data source: GET /attendance (scope='all') filtered by employeeId + month range.
 * The attendance scope 'all' is Admin-only per the contract.
 */

import { useMemo } from 'react';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { ATTENDANCE_STATUS } from '@/lib/status/maps';

function getMonthBounds(): { from: string; to: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10); // today
  const label = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

interface Props {
  employeeId: number;
}

export function ThisMonthStats({ employeeId }: Props) {
  const { from, to, label } = useMemo(() => getMonthBounds(), []);

  const { data, isLoading } = useAttendanceList('all', {
    employeeId,
    from,
    to,
    limit: 31,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const records = data.data;
    const present = records.filter((r) => r.status === ATTENDANCE_STATUS.Present).length;
    const absent = records.filter((r) => r.status === ATTENDANCE_STATUS.Absent).length;
    const late = records.filter((r) => r.late).length;
    // LOP: days where status=Absent and lopApplied is true (full AttendanceRecord shape)
    // AttendanceCalendarItem (the list shape) doesn't include lopApplied — so we show 0.
    // Contract gap: lop count requires the full AttendanceRecord shape, not the calendar-item.
    const lop = 0;
    const workingDays = present + absent;
    const rate = workingDays > 0 ? Math.round((present / workingDays) * 1000) / 10 : 0;
    return { present, absent, late, lop, rate };
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
      <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
        This Month ({label})
      </h3>
      {isLoading ? (
        <div className="space-y-2.5 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 bg-sage/20 rounded w-20" />
              <div className="h-3 bg-sage/20 rounded w-6" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate">Present Days</span>
              <span className="text-sm font-bold text-charcoal">{stats.present}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate">Absent</span>
              <span className="text-sm font-bold text-crimson">{stats.absent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate">Late Marks</span>
              <span className="text-sm font-bold text-umber">{stats.late}</span>
            </div>
            <div className="flex items-center justify-between border-t border-sage/20 pt-2">
              <span className="text-xs text-slate">LOP Days</span>
              <span className="text-sm font-bold text-charcoal">{stats.lop}</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate mb-1">
              <span>Attendance rate</span>
              <span className="font-semibold text-richgreen">{stats.rate}%</span>
            </div>
            <div className="w-full bg-sage/20 rounded-full h-1.5" role="progressbar" aria-valuenow={stats.rate} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bg-richgreen rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${Math.min(stats.rate, 100)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate">No attendance data this month.</p>
      )}
    </div>
  );
}
