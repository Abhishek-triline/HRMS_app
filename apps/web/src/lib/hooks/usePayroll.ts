'use client';

/**
 * TanStack Query hooks for payroll runs and reversals — Phase 4.
 *
 * Each mutation auto-generates an Idempotency-Key per invocation.
 * The key is stable within a single mutation instance (stored in a ref so
 * TanStack Query retries reuse the same key and the backend deduplicates).
 *
 * BL-034: useFinaliseRun surfaces RUN_ALREADY_FINALISED as an ApiError with
 * code 'RUN_ALREADY_FINALISED' and details.winnerName / details.winnerAt.
 * BL-032 / BL-033: useReverseRun is Admin-only — the backend enforces the
 * role check; the UI hides the button, but the hook itself has no role guard.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { qk } from '@/lib/api/query-keys';
import {
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  finaliseRun,
  reverseRun,
  listReversals,
} from '@/lib/api/payroll';
import type {
  PayrollRunListQuery,
  CreatePayrollRunRequest,
  FinaliseRunRequest,
  ReverseRunRequest,
} from '@nexora/contracts/payroll';

function generateKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function usePayrollRuns(query: Partial<PayrollRunListQuery> = {}) {
  return useQuery({
    queryKey: qk.payroll.runs(query),
    queryFn: () => listPayrollRuns(query),
    staleTime: 30_000,
  });
}

export function usePayrollRun(id: number) {
  return useQuery({
    queryKey: qk.payroll.run(id),
    queryFn: () => getPayrollRun(id),
    enabled: id > 0,
    staleTime: 20_000,
  });
}

export function useReversals() {
  return useQuery({
    queryKey: qk.payroll.reversals(),
    queryFn: () => listReversals(),
    staleTime: 60_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();
  // One stable key per mutation instance — retries reuse the same key.
  const idempotencyKeyRef = useRef<string>(generateKey());

  return useMutation({
    mutationFn: (input: CreatePayrollRunRequest) =>
      createPayrollRun(input, { idempotencyKey: idempotencyKeyRef.current }),
    onSuccess: () => {
      // Invalidate run list so the new draft appears immediately.
      void queryClient.invalidateQueries({ queryKey: qk.payroll.all() });
      // Rotate key so a fresh call starts a new idempotency window.
      idempotencyKeyRef.current = generateKey();
    },
  });
}

export function useFinaliseRun(id: number) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(generateKey());

  return useMutation({
    mutationFn: (input: FinaliseRunRequest) =>
      finaliseRun(id, input, { idempotencyKey: idempotencyKeyRef.current }),
    onSuccess: (data) => {
      // Update run detail cache optimistically with the returned finalised run.
      queryClient.setQueryData(qk.payroll.run(id), data);
      void queryClient.invalidateQueries({ queryKey: qk.payroll.runs() });
      idempotencyKeyRef.current = generateKey();
    },
    // On 409 RUN_ALREADY_FINALISED: the error propagates to the caller;
    // the modal renders the named conflict block (BL-034).
    onError: () => {
      // Refresh the run so the UI shows the winner's finalised state.
      void queryClient.invalidateQueries({ queryKey: qk.payroll.run(id) });
    },
  });
}

export function useReverseRun(id: number) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(generateKey());

  return useMutation({
    mutationFn: (input: ReverseRunRequest) =>
      reverseRun(id, input, { idempotencyKey: idempotencyKeyRef.current }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.payroll.all() });
      void queryClient.invalidateQueries({ queryKey: qk.payroll.reversals() });
      idempotencyKeyRef.current = generateKey();
    },
  });
}
