'use client';

/**
 * useEmployeeDashboard — aggregates queries for the Employee dashboard.
 *
 * KPI sources:
 *   Leave Balances:       useLeaveBalances(me.id)
 *   Attendance This Month: useAttendanceList('me', { from: monthStart, to: today })
 *   Latest Payslip:        usePayslipsList({ employeeId: me.id, limit: 1 })
 *   Review Status:         useReviews({ employeeId: me.id, limit: 1 })
 */

import { useMemo } from 'react';
import { useMe } from '@/lib/hooks/useAuth';
import { useLeaveBalances, useLeaveList } from '@/lib/hooks/useLeave';
import { useAttendanceList, useTodayAttendance } from '@/lib/hooks/useAttendance';
import { usePayslipsList } from '@/lib/hooks/usePayslips';
import { useCycles, useReviews } from '@/lib/hooks/usePerformance';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
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
  const myId = me.data?.data?.user?.id ?? '';

  const balances = useLeaveBalances(myId);
  const today = todayISO();
  const monthStart = monthStartISO();

  const myAttendance = useAttendanceList('me', { from: monthStart, to: today });
  const todayAttendance = useTodayAttendance();
  const payslips = usePayslipsList({ limit: 1 });
  const myReviews = useReviews({ employeeId: myId });
  const openCycles = useCycles({ status: 'Open' });

  // Recent leave
  const myLeaveRequests = useLeaveList({ limit: 5 });

  // Compute attendance stats
  const attendanceStats = useMemo(() => {
    const records = myAttendance.data?.data ?? [];
    const present = records.filter(
      (r: { status?: string }) => r.status === 'Present',
    ).length;
    const lateCount = records.filter(
      (r: { late?: boolean }) => r.late,
    ).length;
    const workingDays = estimateWorkingDaysThisMonth();
    return { present, lateCount, workingDays };
  }, [myAttendance.data]);

  const latestPayslip = payslips.data?.data?.[0] ?? null;
  const latestReview = myReviews.data?.data?.[0] ?? null;
  const activeCycle = openCycles.data?.data?.[0] ?? null;

  // Annual and sick leave from balances
  const annualBalance = balances.data?.balances?.find(
    (b: { type?: string }) => b.type === 'Annual',
  ) ?? null;
  const sickBalance = balances.data?.balances?.find(
    (b: { type?: string }) => b.type === 'Sick',
  ) ?? null;

  return {
    me: me.data?.data?.user ?? null,

    annualBalance,
    sickBalance,
    allBalances: balances.data?.balances ?? [],
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
