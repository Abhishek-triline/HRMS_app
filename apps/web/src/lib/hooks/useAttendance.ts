'use client';

/**
 * Nexora HRMS — Attendance TanStack Query hooks (Phase 3).
 *
 * useTodayAttendance    — panel state (Ready / Working / Confirm)
 * useAttendanceList     — generic list by scope (me / team / all)
 * useCheckIn            — mutation; surfaces lateMarkDeductionApplied
 * useCheckOut           — mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, undoCheckOut, getTodayAttendance, listAttendance } from '@/lib/api/attendance';
import { qk } from '@/lib/api/query-keys';
import { showToast } from '@/components/ui/Toast';
import type { AttendanceListQuery } from '@nexora/contracts/attendance';

// ── Today panel ───────────────────────────────────────────────────────────────

export function useTodayAttendance() {
  return useQuery({
    queryKey: qk.attendance.today(),
    queryFn: () => getTodayAttendance(),
    staleTime: 15_000,
    refetchInterval: 60_000, // refresh every minute so working hours stay live-ish
    retry: 1,
  });
}

// ── Attendance list ───────────────────────────────────────────────────────────

export function useAttendanceList(
  scope: 'me' | 'team' | 'all',
  query: Partial<AttendanceListQuery> = {},
) {
  return useQuery({
    queryKey: qk.attendance.list(scope, query),
    queryFn: () => listAttendance(scope, query),
    staleTime: 30_000,
    retry: 1,
  });
}

// ── Check-in ──────────────────────────────────────────────────────────────────

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkIn(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.attendance.all() });
      queryClient.invalidateQueries({ queryKey: qk.attendance.today() });

      if (data.lateMarkDeductionApplied) {
        showToast({
          type: 'error',
          title: 'Late deduction applied',
          message: `3 late marks this month — 1 day deducted from Annual leave (BL-028).`,
        });
      } else if (data.record.late) {
        showToast({
          type: 'info',
          title: 'Late mark recorded',
          message: `${data.lateMonthCount} of 3 late marks this month.`,
        });
      } else {
        showToast({ type: 'success', title: 'Checked in', message: 'Your workday has started.' });
      }
    },
    onError: () => {
      showToast({ type: 'error', title: 'Check-in failed', message: 'Please try again.' });
    },
  });
}

// ── Check-out ─────────────────────────────────────────────────────────────────

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.attendance.all() });
      queryClient.invalidateQueries({ queryKey: qk.attendance.today() });
      showToast({ type: 'success', title: 'Checked out', message: 'See you tomorrow!' });
    },
    onError: () => {
      showToast({ type: 'error', title: 'Check-out failed', message: 'Please try again.' });
    },
  });
}

// ── Undo check-out ────────────────────────────────────────────────────────────

export function useUndoCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => undoCheckOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.attendance.all() });
      queryClient.invalidateQueries({ queryKey: qk.attendance.today() });
      showToast({
        type: 'success',
        title: 'Back to working',
        message: 'Your check-out has been undone.',
      });
    },
    onError: (err: unknown) => {
      const apiErr = err as { error?: { message?: string } };
      const message =
        apiErr?.error?.message ?? 'Could not undo check-out. Please try again.';
      showToast({ type: 'error', title: 'Undo failed', message });
    },
  });
}
