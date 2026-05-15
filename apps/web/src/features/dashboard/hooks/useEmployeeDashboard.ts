'use client';

/**
 * useEmployeeDashboard — aggregates queries for the Employee dashboard.
 *
 * KPI sources:
 *   Leave Balances:        useLeaveBalances(me.id)
 *   Attendance This Month: useAttendanceList('me', { from: monthStart, to: today })
 *   Latest Payslip:        usePayslipsList({ limit: 1 })
 *   Review Status:         useReviews({ limit: 1 })
 *
 * v2: me.id is number, attendance status codes are INT.
 */

import { useMemo } from 'react';
import { useMe } from '@/lib/hooks/useAuth';
import { useLeaveBalances, useLeaveList } from '@/lib/hooks/useLeave';
import { useAttendanceList, useTodayAttendance } from '@/lib/hooks/useAttendance';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { useCycles, useReviews } from '@/lib/hooks/usePerformance';
import { ATTENDANCE_STATUS, LEAVE_TYPE_ID } from '@/lib/status/maps';

/**
 * LOCAL YYYY-MM-DD for today / start-of-this-month. Earlier these went
 * through `.toISOString()`, which converts the local Date to UTC and
 * silently shifts the date back by a day for any timezone east of UTC.
 * In Asia/Kolkata (UTC+5:30), `new Date(2026, 4, 1).toISOString()` is
 * "2026-04-30T18:30:00.000Z" — so `monthStartISO()` returned April 30
 * and the attendance KPI counted a stray prior-month day as Present.
 * Build the strings from local fields directly.
 */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return ymd(new Date());
}

function monthStartISO(): string {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Working days in a month (rough estimate — Mon–Fri, no holiday API call here). */
function estimateWorkingDaysThisMonth(): number {
  const now = new Date();
  const today = now.getDate();
  let count = 0;
  for (let d = 1; d <= today; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function useEmployeeDashboard() {
  const me = useMe();
  const myId: number | undefined = me.data?.data?.user?.id;

  const balances = useLeaveBalances(myId ?? 0);
  const today = todayISO();
  const monthStart = monthStartISO();

  const myAttendance = useAttendanceList('me', { from: monthStart, to: today });
  const todayAttendance = useTodayAttendance();
  const payslips = usePayslipsList({ limit: 1 });
  const myReviews = useReviews({ employeeId: myId });
  const openCycles = useCycles({ status: 1 }); // 1 = Open

  // Recent leave
  const myLeaveRequests = useLeaveList({ limit: 5 });

  // Compute attendance stats
  const attendanceStats = useMemo(() => {
    const records = myAttendance.data?.data ?? [];
    const present = records.filter(
      (r) => r.status === ATTENDANCE_STATUS.Present,
    ).length;
    const lateCount = records.filter(
      (r) => r.late,
    ).length;
    const workingDays = estimateWorkingDaysThisMonth();
    return { present, lateCount, workingDays };
  }, [myAttendance.data]);

  const latestPayslip = payslips.data?.data?.[0] ?? null;
  const latestReview = myReviews.data?.data?.[0] ?? null;
  const activeCycle = openCycles.data?.data?.[0] ?? null;

  // Annual and sick leave from balances (by leaveTypeId)
  const allBalances = balances.data?.balances ?? [];
  const annualBalance = allBalances.find(
    (b) => b.leaveTypeId === LEAVE_TYPE_ID.Annual,
  ) ?? null;
  const sickBalance = allBalances.find(
    (b) => b.leaveTypeId === LEAVE_TYPE_ID.Sick,
  ) ?? null;

  return {
    me: me.data?.data?.user ?? null,

    annualBalance,
    sickBalance,
    allBalances,
    balancesLoading: balances.isLoading,
    balancesError: balances.isError,
    balancesRefetch: balances.refetch,

    attendanceStats,
    attendanceLoading: myAttendance.isLoading,
    attendanceError: myAttendance.isError,
    attendanceRefetch: myAttendance.refetch,

    todayRecord: todayAttendance.data ?? null,
    todayLoading: todayAttendance.isLoading,

    latestPayslip,
    payslipsLoading: payslips.isLoading,
    payslipsError: payslips.isError,
    payslipsRefetch: payslips.refetch,

    latestReview,
    activeCycle,
    reviewsLoading: myReviews.isLoading,
    reviewsError: myReviews.isError,
    reviewsRefetch: myReviews.refetch,

    recentLeaveRequests: (myLeaveRequests.data?.data ?? []).slice(0, 5),
    leaveLoading: myLeaveRequests.isLoading,
    leaveError: myLeaveRequests.isError,
    leaveRefetch: myLeaveRequests.refetch,
  };
}
