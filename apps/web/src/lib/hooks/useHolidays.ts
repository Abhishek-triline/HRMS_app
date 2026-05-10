'use client';

/**
 * Nexora HRMS — Holiday calendar TanStack Query hooks (Phase 3).
 *
 * useHolidays      — GET /config/holidays?year=YYYY — any role
 * useReplaceHolidays — PUT /config/holidays — Admin only
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHolidays, replaceHolidays } from '@/lib/api/attendance';
import { qk } from '@/lib/api/query-keys';
import { showToast } from '@/components/ui/Toast';
import type { ReplaceHolidaysRequest } from '@nexora/contracts/attendance';

// ── Fetch ─────────────────────────────────────────────────────────────────────

export function useHolidays(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: qk.holidays.byYear(y),
    queryFn: () => getHolidays(y),
    staleTime: 5 * 60_000, // holiday calendar changes rarely
    retry: 1,
  });
}

// ── Replace (Admin only) ──────────────────────────────────────────────────────

export function useReplaceHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReplaceHolidaysRequest) => replaceHolidays(input),
    onSuccess: (_data, variables) => {
      // Bust the specific year cache
      queryClient.invalidateQueries({ queryKey: qk.holidays.byYear(variables.year) });
      showToast({
        type: 'success',
        title: 'Holiday calendar saved',
        message: `${variables.year} holiday list has been replaced.`,
      });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Save failed.';
      showToast({ type: 'error', title: 'Save failed', message: msg });
    },
  });
}
