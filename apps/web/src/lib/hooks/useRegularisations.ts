'use client';

/**
 * Nexora HRMS — Regularisation TanStack Query hooks (Phase 3).
 *
 * useRegularisations       — list (scoped by role server-side)
 * useRegularisation        — single detail
 * useSubmitRegularisation  — create; surfaces ApiError so form can render ConflictErrorBlock
 * useApproveRegularisation — approve decision (Manager ≤7d / Admin >7d)
 * useRejectRegularisation  — reject decision (note REQUIRED)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRegularisations,
  getRegularisation,
  submitRegularisation,
  approveRegularisation,
  rejectRegularisation,
} from '@/lib/api/attendance';
import { qk } from '@/lib/api/query-keys';
import { showToast } from '@/components/ui/Toast';
import type {
  RegularisationListQuery,
  CreateRegularisationRequest,
  ApproveRegularisationRequest,
  RejectRegularisationRequest,
} from '@nexora/contracts/attendance';

// ── List ──────────────────────────────────────────────────────────────────────

export function useRegularisations(query: Partial<RegularisationListQuery> = {}) {
  return useQuery({
    queryKey: qk.regularisations.list(query),
    queryFn: () => listRegularisations(query),
    staleTime: 15_000,
    retry: 1,
  });
}

// ── Detail ────────────────────────────────────────────────────────────────────

export function useRegularisation(id: string) {
  return useQuery({
    queryKey: qk.regularisations.detail(id),
    queryFn: () => getRegularisation(id),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(id),
  });
}

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * Creates a new regularisation request. On 409 LEAVE_REG_CONFLICT, the
 * ApiError is surfaced to the caller — the form renders ConflictErrorBlock
 * (Phase 2 component) rather than a generic error string (DN-19 / BL-010).
 */
export function useSubmitRegularisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRegularisationRequest) => submitRegularisation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.regularisations.all() });
      queryClient.invalidateQueries({ queryKey: qk.attendance.all() });
      showToast({
        type: 'success',
        title: 'Regularisation submitted',
        message: 'Your request has been routed for approval.',
      });
    },
    // Do NOT add onError here — let the ApiError propagate so the form can
    // inspect error.code and render ConflictErrorBlock if LEAVE_REG_CONFLICT.
  });
}

// ── Approve ───────────────────────────────────────────────────────────────────

export function useApproveRegularisation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveRegularisationRequest) => approveRegularisation(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.regularisations.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.regularisations.all() });
      queryClient.invalidateQueries({ queryKey: qk.attendance.all() });
      showToast({ type: 'success', title: 'Approved', message: 'Regularisation has been approved and attendance corrected.' });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Approval failed.';
      showToast({ type: 'error', title: 'Approval failed', message: msg });
      // Invalidate detail in case of VERSION_MISMATCH so the stale version is refreshed
      queryClient.invalidateQueries({ queryKey: qk.regularisations.detail(id) });
      queryClient.invalidateQueries({ queryKey: qk.regularisations.all() });
    },
  });
}

// ── Reject ────────────────────────────────────────────────────────────────────

export function useRejectRegularisation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectRegularisationRequest) => rejectRegularisation(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.regularisations.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.regularisations.all() });
      showToast({ type: 'info', title: 'Rejected', message: 'Regularisation request has been rejected.' });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Rejection failed.';
      showToast({ type: 'error', title: 'Rejection failed', message: msg });
      queryClient.invalidateQueries({ queryKey: qk.regularisations.detail(id) });
      queryClient.invalidateQueries({ queryKey: qk.regularisations.all() });
    },
  });
}
