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
      // Invalidate any list queries that include this payslip so the row
      // on the run-detail page picks up the new version. Without this the
      // parent re-renders with stale version and a second save in the same
      // session returns VERSION_MISMATCH.
      void queryClient.invalidateQueries({ queryKey: ['payslips', 'list'] });
      idempotencyKeyRef.current = generateKey();
    },
    onError: () => {
      // On VERSION_MISMATCH or PAYSLIP_IMMUTABLE, refresh the detail + the
      // list so the UI reflects the current locked state and the new
      // version propagates to the parent table.
      void queryClient.invalidateQueries({ queryKey: qk.payslips.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ['payslips', 'list'] });
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

/**
 * Prints the payslip PDF — the same PDF the Download button produces — so
 * the printed page is identical to the downloaded document, byte for byte.
 *
 * The blob is mounted in a hidden iframe and we call print() on its window;
 * Chromium-based browsers honour this directly on PDF iframes. If a browser
 * refuses (some Firefox versions), we fall back to opening the PDF in a new
 * tab so the user can use the native viewer's Print control.
 */
export function usePrintPayslipPdf() {
  return useMutation({
    mutationFn: (id: number) => downloadPayslipPdf(id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.src = url;

      let printed = false;
      iframe.onload = () => {
        // Some browsers fire load twice for PDF blobs; guard so we only print once.
        if (printed) return;
        printed = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(url, '_blank', 'noopener');
        }
      };

      document.body.appendChild(iframe);
      // Keep the iframe + object URL alive long enough for the print dialog
      // to stay interactive. The user can dismiss the dialog at their pace.
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60_000);
    },
  });
}
