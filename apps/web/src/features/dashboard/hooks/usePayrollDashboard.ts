'use client';

/**
 * usePayrollDashboard — aggregates queries for the Payroll Officer dashboard.
 *
 * KPI sources:
 *   Current Run status:     usePayrollRuns({ limit: 5 }) → current month run
 *   Employees this month:   currentRun.employeeCount
 *   Pending finalisations:  runs filtered to status === 'Draft' | 'Review'
 *   Reversals (quarter):    useReversals() → client-side filter to this quarter
 */

import { useMemo } from 'react';
import { usePayrollRuns, useReversals } from '@/lib/hooks/usePayroll';

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function quarterStartDate(): Date {
  const now = new Date();
  const qMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), qMonth, 1);
}

/** Computed once at module load time — fine for a quarterly boundary. */
const QUARTER_START = quarterStartDate();

export function usePayrollDashboard() {
  const { month, year } = currentMonthYear();

  const runs = usePayrollRuns({ limit: 10 });
  const reversals = useReversals();

  const allRuns = useMemo(() => runs.data?.data ?? [], [runs.data]);

  // Current month run
  const currentRun = useMemo(
    () => allRuns.find((r) => r.month === month && r.year === year) ?? allRuns[0] ?? null,
    [allRuns, month, year],
  );

  // Pending runs (not yet finalised)
  const pendingRuns = useMemo(
    () => allRuns.filter((r) => r.status === 'Draft' || r.status === 'Review'),
    [allRuns],
  );

  // Reversals this quarter
  const allReversals = useMemo(() => reversals.data?.data ?? [], [reversals.data]);
  const quarterReversals = useMemo(
    () =>
      allReversals.filter((r) => {
        if (!r.reversedAt) return false;
        return new Date(r.reversedAt) >= QUARTER_START;
      }),
    [allReversals],
  );

  // Recent run history for the table (last 5)
  const recentRuns = allRuns.slice(0, 5);

  return {
    currentRun,
    runsLoading: runs.isLoading,
    runsError: runs.isError,
    runsRefetch: runs.refetch,

    pendingRuns,
    pendingCount: pendingRuns.length,

    employeeCount: currentRun?.employeeCount ?? null,

    quarterReversalCount: quarterReversals.length,
    reversalsLoading: reversals.isLoading,
    reversalsError: reversals.isError,
    reversalsRefetch: reversals.refetch,
    recentReversals: allReversals.slice(0, 5),

    recentRuns,
  };
}
