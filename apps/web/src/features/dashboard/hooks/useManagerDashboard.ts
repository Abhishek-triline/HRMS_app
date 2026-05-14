'use client';

/**
 * useManagerDashboard — aggregates queries for the Manager dashboard.
 *
 * KPI sources:
 *   My Team:            useTeam(me.id)
 *   Pending Approvals:  useLeaveList({ status: 1 })
 *   Late Marks (month): useAttendanceList('team', { from: monthStart, to: today })
 *                       → client-side count of records where late === true
 *   Review Cycle:       useCycles({ status: 1, limit: 1 }) — 1=Open
 *
 * v2: me.id is number, status codes are INT.
 */

import { useMemo } from 'react';
import { useMe } from '@/lib/hooks/useAuth';
import { useTeam } from '@/lib/hooks/useEmployees';
import { useLeaveList } from '@/lib/hooks/useLeave';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { useCycles, useReviews } from '@/lib/hooks/usePerformance';
import { LEAVE_STATUS, ROUTED_TO } from '@/lib/status/maps';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function useManagerDashboard() {
  const me = useMe();
  const myId: number | undefined = me.data?.data?.user?.id;

  const team = useTeam(myId ?? 0);
  const pendingLeave = useLeaveList({ status: LEAVE_STATUS.Pending });

  const today = todayISO();
  const monthStart = monthStartISO();

  const teamAttendance = useAttendanceList('team', {
    from: monthStart,
    to: today,
  });

  const openCycles = useCycles({ status: 1 }); // 1 = Open

  // Reviews where I am the manager — my direct reports' pending manager ratings
  const myReviews = useReviews({ managerId: myId });

  // Client-side: count late marks for my team this month
  const lateMarkCount = useMemo(() => {
    const records = teamAttendance.data?.data ?? [];
    return records.filter((r) => r.late).length;
  }, [teamAttendance.data]);

  // Today's attendance for team panel
  const teamToday = useMemo(() => {
    const records = teamAttendance.data?.data ?? [];
    return records.filter((r) => r.date === today);
  }, [teamAttendance.data, today]);

  // Pending approvals scoped to my queue
  const pendingMine = useMemo(() => {
    const all = pendingLeave.data?.data ?? [];
    // Client-filter to approvals routed to Manager (routedToId=1)
    return all.filter(
      (r) => r.routedToId === ROUTED_TO.Manager,
    );
  }, [pendingLeave.data]);

  const activeCycle = openCycles.data?.data?.[0] ?? null;

  // Reviews pending manager rating — use absence of managerRating as the signal
  const pendingReviews = useMemo(() => {
    const all = myReviews.data?.data ?? [];
    return all.filter(
      (r) => r.selfRating != null && r.managerRating == null,
    );
  }, [myReviews.data]);

  return {
    me: me.data?.data?.user ?? null,

    teamMembers: team.data?.current ?? [],
    teamCount: team.data?.current?.length ?? null,
    teamLoading: team.isLoading,
    teamError: team.isError,
    teamRefetch: team.refetch,

    pendingMine,
    pendingCount: pendingMine.length,
    pendingLoading: pendingLeave.isLoading,
    pendingError: pendingLeave.isError,
    pendingRefetch: pendingLeave.refetch,

    lateMarkCount,
    teamAttendanceLoading: teamAttendance.isLoading,
    teamAttendanceError: teamAttendance.isError,
    teamAttendanceRefetch: teamAttendance.refetch,

    teamToday,

    activeCycle,
    cycleLoading: openCycles.isLoading,
    cycleError: openCycles.isError,
    cycleRefetch: openCycles.refetch,

    pendingReviews,
    reviewsLoading: myReviews.isLoading,

    // My own goals for the goals panel
    myGoalReview: myReviews.data?.data?.find(
      (r) => r.employeeId === myId,
    ) ?? null,
  };
}
