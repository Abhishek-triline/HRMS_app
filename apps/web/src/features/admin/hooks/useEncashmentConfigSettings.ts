'use client';

/**
 * useEncashmentConfigSettings / useUpdateEncashmentConfigSettings
 *
 * Wraps GET + PUT /api/v1/config/encashment.
 * The four keys (windowStartMonth, windowEndMonth, windowEndDay, maxPercent)
 * map directly to EncashmentConfig from @nexora/contracts/configuration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEncashmentConfig, updateEncashmentConfig } from '@/lib/api/configuration';
import { qk } from '@/lib/api/query-keys';
import type { EncashmentConfig } from '@nexora/contracts/configuration';

export function useEncashmentConfigSettings() {
  return useQuery({
    queryKey: qk.config.encashment(),
    queryFn: getEncashmentConfig,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useUpdateEncashmentConfigSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EncashmentConfig>) => updateEncashmentConfig(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.config.encashment() });
    },
  });
}
