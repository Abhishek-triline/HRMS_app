'use client';

/**
 * TanStack Query hooks for payslips — Phase 4.
 *
 * useUpdatePayslipTax surfaces:
 *   409 PAYSLIP_IMMUTABLE (BL-031) — payslip is locked; run is finalised.
 *   409 VERSION_MISMATCH  — stale data; invalidates detail + list.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { qk } from '@/lib/api/query-keys';
import {
  listPayslips,
  getPayslip,
  updatePayslipTax,
  downloadPayslipPdf,
} from '@/lib/api/payroll';
import type { PayslipListQuery, UpdatePayslipTaxRequest } from '@nexora/contracts/payroll';

function generateKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function usePayslipsList(
  query: Partial<PayslipListQuery> = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: qk.payslips.list(query),
    queryFn: () => listPayslips(query),
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function usePayslip(id: number) {
  return useQuery({
    queryKey: qk.payslips.detail(id),
    queryFn: () => getPayslip(id),
    enabled: id > 0,
    staleTime: 20_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdatePayslipTax(id: number) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(generateKey());

  return useMutation({
    mutationFn: (input: UpdatePayslipTaxRequest) =>
      updatePayslipTax(id, input, { idempotencyKey: idempotencyKeyRef.current }),
    onSuccess: (data) => {
      // Update the payslip cache with the new computed net.
      queryClient.setQueryData(qk.payslips.detail(id), data);
      idempotencyKeyRef.current = generateKey();
    },
    onError: () => {
      // On VERSION_MISMATCH or PAYSLIP_IMMUTABLE, refresh the detail so the
      // UI reflects the current locked state.
      void queryClient.invalidateQueries({ queryKey: qk.payslips.detail(id) });
    },
  });
}

/**
 * Triggers a browser download of the payslip PDF.
 * Returns a mutation that, on success, creates a temporary object URL,
 * clicks it, and revokes it. Filename follows the pattern P-YYYY-MM-NNNN.pdf.
 */
export function useDownloadPayslipPdf(payslipCode: string) {
  return useMutation({
    mutationFn: (id: number) => downloadPayslipPdf(id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${payslipCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
