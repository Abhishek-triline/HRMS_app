'use client';

/**
 * TanStack Query hooks for tax configuration — Phase 4, A-17.
 *
 * Admin-only: the backend enforces role; the UI gates the page via middleware.
 * v1 note: only a single reference rate is configurable. The Indian slab engine
 * is deferred to v2 (BL-036a).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { qk } from '@/lib/api/query-keys';
import { getTaxSettings, updateTaxSettings } from '@/lib/api/payroll';
import type { UpdateTaxSettingsRequest } from '@nexora/contracts/payroll';

function generateKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useTaxSettings() {
  return useQuery({
    queryKey: qk.taxConfig(),
    queryFn: getTaxSettings,
    staleTime: 5 * 60_000, // 5 minutes — changes rarely
  });
}

export function useUpdateTaxSettings() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(generateKey());

  return useMutation({
    mutationFn: (input: UpdateTaxSettingsRequest) =>
      updateTaxSettings(input, { idempotencyKey: idempotencyKeyRef.current }),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.taxConfig(), data);
      idempotencyKeyRef.current = generateKey();
    },
  });
}
