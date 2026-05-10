'use client';

/**
 * Manager Check In/Out — same as E-06 but under /manager/checkin.
 * BL-004: every role is also an employee for self-service attendance.
 */

import { useState } from 'react';
import Link from 'next/link';
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
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function ManagerCheckInPage() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { data: me } = useMe();
  const { data: todayData, isLoading: todayLoading } = useTodayAttendance();

  const firstName = me?.data?.user?.name?.split(' ')[0] ?? 'there';
  const record = todayData?.record;
  const lateThreshold = todayData?.lateThreshold ?? '10:30';
  const lateMonthCount = todayData?.lateMonthCount ?? 0;

  return (
    <div className="p-8">
      <CheckInPanel firstName={firstName} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4">Today's Attendance Record</h3>
          {todayLoading ? (
            <Spinner size="sm" aria-label="Loading…" />
          ) : (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate mb-1.5">Status</div>
                {record ? <AttendanceStatusBadge status={record.status} /> : <span className="text-slate italic text-xs">Not yet recorded</span>}
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

      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <button
          type="button"
          onClick={() => setRulesOpen((o) => !o)}
          aria-expanded={rulesOpen}
          aria-controls="rules-panel-m"
          className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded-xl"
        >
          <span className="font-heading text-sm font-semibold text-charcoal">Attendance Rules</span>
          <svg className={`w-4 h-4 text-slate transition-transform duration-200 ${rulesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        {rulesOpen && (
          <div id="rules-panel-m" className="px-6 pb-5 border-t border-sage/20 pt-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate">
                <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true"/>
                <span>Check-in records attendance. Check-out is mandatory (BL-024).</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate">
                <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true"/>
                <span>Late after {lateThreshold} (BL-027). 3 late marks = 1 day deducted (BL-028).</span>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-sage/20">
              <Link href="/manager/regularisation" className="text-forest text-sm font-semibold hover:text-emerald transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded">
                Submit Regularisation Request
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
