'use client';

/**
 * Nexora HRMS — Leave Encashment TanStack Query hooks (BL-LE-01..14).
 *
 * Query hooks:   useMyEncashments, useEncashment, useEncashmentQueue
 * Mutation hooks: useSubmitEncashment, useCancelEncashment,
 *                 useManagerApproveEncashment, useAdminFinaliseEncashment,
 *                 useRejectEncashment
 *
 * Each mutation invalidates the affected cache segments on success.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitEncashment,
  listEncashments,
  getEncashment,
  cancelEncashment,
  getEncashmentQueue,
  managerApproveEncashment,
  adminFinaliseEncashment,
  rejectEncashment,
} from '@/lib/api/leave-encashment';
import { qk } from '@/lib/api/query-keys';
import { useToast } from '@/lib/hooks/useToast';
import type {
  LeaveEncashmentListQuery,
  LeaveEncashmentRequest,
  CancelEncashmentBody,
  ManagerApproveEncashmentBody,
  AdminFinaliseEncashmentBody,
  RejectEncashmentBody,
} from '@nexora/contracts/leave-encashment';

// ── LIST (own) ─────────────────────────────────────────────────────────────────

export function useMyEncashments(year?: number) {
  const q: Partial<LeaveEncashmentListQuery> = year ? { year } : {};
  return useQuery({
    queryKey: qk.encashment.list(q),
    queryFn: () => listEncashments(q),
    staleTime: 15_000,
    retry: 1,
  });
}

/**
 * Full-query variant of useMyEncashments. The role-scoped server filters the
 * dataset (employee sees their own, manager sees their team, admin sees all);
 * this hook lets callers pass status / cursor / limit explicitly.
 */
export function useEncashmentList(query: Partial<LeaveEncashmentListQuery> = {}) {
  return useQuery({
    queryKey: qk.encashment.list(query as Record<string, unknown>),
    queryFn: () => listEncashments(query),
    staleTime: 15_000,
    retry: 1,
  });
}

// ── DETAIL ────────────────────────────────────────────────────────────────────

export function useEncashment(id: number) {
  return useQuery({
    queryKey: qk.encashment.detail(id),
    queryFn: () => getEncashment(id),
    staleTime: 30_000,
    retry: 1,
    enabled: id > 0,
  });
}

// ── QUEUE (Manager / Admin) ───────────────────────────────────────────────────

export function useEncashmentQueue() {
  return useQuery({
    queryKey: qk.encashment.queue(),
    queryFn: () => getEncashmentQueue(),
    staleTime: 15_000,
    retry: 1,
  });
}

// ── SUBMIT ────────────────────────────────────────────────────────────────────

export function useSubmitEncashment() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: LeaveEncashmentRequest) => submitEncashment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.encashment.all() });
      toast.success('Encashment request submitted', 'Your request has been sent for approval.');
    },
    onError: (err: Error) => {
      // Surface the error to the calling component — it decides how to render it.
      // Caller can also handle specific error codes (ENCASHMENT_OUT_OF_WINDOW etc.)
      toast.error('Submission failed', err.message ?? 'Please try again.');
    },
  });
}

// ── CANCEL ────────────────────────────────────────────────────────────────────

export function useCancelEncashment(id: number) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: CancelEncashmentBody) => cancelEncashment(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.encashment.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.encashment.all() });
      toast.success('Encashment request cancelled');
    },
    onError: (err: Error) => {
      toast.error('Cancellation failed', err.message ?? 'Please try again.');
    },
  });
}

// ── MANAGER APPROVE ───────────────────────────────────────────────────────────

export function useManagerApproveEncashment(id: number) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: ManagerApproveEncashmentBody) => managerApproveEncashment(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.encashment.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.encashment.all() });
      toast.success('Encashment approved', 'Request forwarded to Admin for finalisation.');
    },
    onError: (err: Error) => {
      toast.error('Approval failed', err.message ?? 'Please try again.');
    },
  });
}

// ── ADMIN FINALISE ────────────────────────────────────────────────────────────

export function useAdminFinaliseEncashment(id: number) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: AdminFinaliseEncashmentBody) => adminFinaliseEncashment(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.encashment.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.encashment.all() });
      const days = data.daysApproved ?? 0;
      const amount = data.amountPaise != null ? `· ₹${(data.amountPaise / 100).toLocaleString('en-IN')}` : '';
      toast.success(
        'Encashment finalised',
        `${days} day${days !== 1 ? 's' : ''} ${amount} queued for next payroll.`,
      );
    },
    onError: (err: Error) => {
      toast.error('Finalisation failed', err.message ?? 'Please try again.');
    },
  });
}

// ── REJECT ────────────────────────────────────────────────────────────────────

export function useRejectEncashment(id: number) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: RejectEncashmentBody) => rejectEncashment(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.encashment.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.encashment.all() });
      toast.success('Encashment request rejected');
    },
    onError: (err: Error) => {
      toast.error('Rejection failed', err.message ?? 'Please try again.');
    },
  });
}
