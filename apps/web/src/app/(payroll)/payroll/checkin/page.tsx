'use client';

/**
 * Payroll Officer Check In/Out — BL-004.
 */

import { CheckInPanel } from '@/components/attendance/CheckInPanel';
import { LateMarkBanner } from '@/components/attendance/LateMarkBanner';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { useTodayAttendance } from '@/lib/hooks/useAttendance';
import { useMe } from '@/lib/hooks/useAuth';

function formatHHMM(iso: string | null): string {
  if (!iso) return '— Pending';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function PayrollCheckInPage() {
  const { data: me } = useMe();
  const { data: todayData, isLoading } = useTodayAttendance();

  const firstName = me?.data?.user?.name?.split(' ')[0] ?? 'there';
  const record = todayData?.record;
  const lateThreshold = todayData?.lateThreshold ?? '10:30';
  const lateMonthCount = todayData?.lateMonthCount ?? 0;

  return (
    <div className="p-8">
      <CheckInPanel firstName={firstName} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4">Today's Attendance</h3>
          {isLoading ? <Spinner size="sm" aria-label="Loading…" /> : (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate mb-1.5">Status</div>
                {record ? <AttendanceStatusBadge status={record.status} /> : <span className="text-slate italic text-xs">Not recorded</span>}
              </div>
              <div>
                <div className="text-xs text-slate mb-1.5">Check-In</div>
                <div className="font-semibold text-charcoal">{formatHHMM(record?.checkInTime ?? null)}</div>
              </div>
              <div>
                <div className="text-xs text-slate mb-1.5">Check-Out</div>
                <div className={record?.checkOutTime ? 'font-semibold text-charcoal' : 'text-slate italic'}>
                  {formatHHMM(record?.checkOutTime ?? null)}
                </div>
              </div>
            </div>
          )}
        </div>
        {lateMonthCount > 0 ? (
          <LateMarkBanner lateMonthCount={lateMonthCount} lateThreshold={lateThreshold} />
        ) : (
          <div className="bg-greenbg border border-richgreen/30 rounded-xl p-5 flex items-start gap-3">
            <svg className="w-5 h-5 text-richgreen mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <div className="text-sm font-semibold text-richgreen mb-1">No late marks this month</div>
              <div className="text-xs text-richgreen/80">Threshold: {lateThreshold}.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
