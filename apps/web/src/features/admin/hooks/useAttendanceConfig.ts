'use client';

/**
 * useAttendanceConfig / useUpdateAttendanceConfig
 *
 * Wraps GET + PUT /api/v1/config/attendance.
 * Mutation invalidates the query and toasts on success/failure.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttendanceConfig, updateAttendanceConfig } from '@/lib/api/configuration';
import { qk } from '@/lib/api/query-keys';
import { showToast } from '@/components/ui/Toast';
import type { AttendanceConfig } from '@nexora/contracts/configuration';

export function useAttendanceConfig() {
  return useQuery({
    queryKey: qk.config.attendance(),
    queryFn: getAttendanceConfig,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useUpdateAttendanceConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AttendanceConfig) => updateAttendanceConfig(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.config.attendance() });
      showToast({ type: 'success', title: 'Attendance config saved', message: 'Settings updated successfully.' });
    },
    onError: (err: Error) => {
      showToast({ type: 'error', title: 'Save failed', message: err.message ?? 'Please try again.' });
    },
  });
}
