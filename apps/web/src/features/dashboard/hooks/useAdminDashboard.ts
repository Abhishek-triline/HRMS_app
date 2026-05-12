'use client';

/**
 * useAdminDashboard — aggregates all queries needed for the Admin dashboard.
 *
 * KPI sources (no new endpoints; client-side filters from existing hooks):
 *   Employees:         useEmployeesCount({ status: 1 }) → active count
 *   On Leave Today:    useLeaveList({ status: 2, from: today, to: today })
 *   Pending Approvals: useLeaveList({ status: 1 })
 *   Payroll:           usePayrollRuns({ limit: 5 }) filtered to current month/year
 *
 * v2: status codes are INT (1=Active, 2=Approved, 1=Pending).
 */

import { useEmployeesCount } from '@/lib/hooks/useEmployees';
import { useLeaveList } from '@/lib/hooks/useLeave';
import { usePayrollRuns } from '@/lib/hooks/usePayroll';
import { useAuditLogs } from '@/features/admin/hooks/useAuditLogs';
import { EMPLOYEE_STATUS, LEAVE_STATUS } from '@/lib/status/maps';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function useAdminDashboard() {
  const today = todayISO();
  const { month, year } = currentMonthYear();

  const activeCount = useEmployeesCount({ status: EMPLOYEE_STATUS.Active });
  const onLeaveToday = useLeaveList({ status: LEAVE_STATUS.Approved, fromDate: today, toDate: today });
  const pendingLeave = useLeaveList({ status: LEAVE_STATUS.Pending });
  const payrollRuns = usePayrollRuns({ limit: 5 });
  const auditLogs = useAuditLogs({});

  // Find current-month payroll run (client-side filter)
  const currentRun = payrollRuns.data?.data?.find(
    (r) => r.month === month && r.year === year,
  ) ?? payrollRuns.data?.data?.[0] ?? null;

  // Pending leave count
  const pendingCount = (pendingLeave.data?.data ?? []).length;

  // Top 5 pending for the table
  const pendingLeaveTop5 = (pendingLeave.data?.data ?? []).slice(0, 5);

  // Recent activity — first page of audit logs
  const recentActivity = auditLogs.data?.pages?.[0]?.data?.slice(0, 8) ?? [];

  // Active employee count — exact via cursor walk.
  const empTotal = activeCount.count;

  // On-leave today count
  const onLeaveTodayCount = (onLeaveToday.data?.data ?? []).length;

  return {
    empTotal,
    empLoading: activeCount.isLoading,
    empError: false,
    empRefetch: () => {
      /* useEmployeesCount has no single refetch — invalidation via QueryClient. */
    },

    onLeaveTodayCount,
    onLeaveTodayLoading: onLeaveToday.isLoading,
    onLeaveTodayError: onLeaveToday.isError,
    onLeaveTodayRefetch: onLeaveToday.refetch,

    pendingCount,
    pendingLoading: pendingLeave.isLoading,
    pendingError: pendingLeave.isError,
    pendingRefetch: pendingLeave.refetch,

    currentRun,
    payrollLoading: payrollRuns.isLoading,
    payrollError: payrollRuns.isError,
    payrollRefetch: payrollRuns.refetch,

    pendingLeaveTop5,
    pendingLeaveLoading: pendingLeave.isLoading,

    recentActivity,
    auditLoading: auditLogs.isLoading,
    auditError: auditLogs.isError,
    auditRefetch: auditLogs.refetch,

    // All payroll runs for the table
    allRuns: payrollRuns.data?.data ?? [],
  };
}
