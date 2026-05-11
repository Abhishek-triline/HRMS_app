'use client';

/**
 * useLeaveConfigSettings / useUpdateLeaveConfigSettings
 *
 * Wraps GET + PUT /api/v1/config/leave.
 * (Named with "Settings" suffix to avoid collision with the existing
 *  useLeaveConfig hook in lib/hooks/useLeave which handles per-type quotas.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaveConfig, updateLeaveConfig } from '@/lib/api/configuration';
import { qk } from '@/lib/api/query-keys';
import { showToast } from '@/components/ui/Toast';
import type { LeaveConfig } from '@nexora/contracts/configuration';

export function useLeaveConfigSettings() {
  return useQuery({
    queryKey: qk.config.leave(),
    queryFn: getLeaveConfig,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useUpdateLeaveConfigSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<LeaveConfig>) => updateLeaveConfig(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.config.leave() });
      showToast({ type: 'success', title: 'Leave config saved', message: 'Settings updated successfully.' });
    },
    onError: (err: Error) => {
      showToast({ type: 'error', title: 'Save failed', message: err.message ?? 'Please try again.' });
    },
  });
}
