'use client';

/**
 * Nexora HRMS — Leave Management TanStack Query hooks (Phase 2).
 *
 * Query hooks: useLeaveTypes, useLeaveBalances, useLeaveList, useLeave
 * Mutation hooks: useCreateLeave, useApproveLeave, useRejectLeave,
 *                 useCancelLeave, useAdjustBalance,
 *                 useUpdateLeaveType, useUpdateLeaveQuota
 *
 * Each mutation invalidates the affected cache segments on success.
 * ApiError is surfaced to callers — UI decides how to render (conflict
 * errors must use ConflictErrorBlock per DN-19).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeaveTypes,
  getLeaveBalances,
  listLeave,
  getLeave,
  createLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  adjustBalance,
  getLeaveConfig,
  updateLeaveType,
  updateLeaveQuota,
} from '@/lib/api/leave';
import { qk } from '@/lib/api/query-keys';
import type {
  LeaveListQuery,
  CreateLeaveRequest,
  ApproveLeaveRequest,
  RejectLeaveRequest,
  CancelLeaveRequest,
  AdjustBalanceRequest,
  UpdateLeaveTypeRequest,
  UpdateLeaveQuotaRequest,
} from '@nexora/contracts/leave';

// ── CATALOGUE ─────────────────────────────────────────────────────────────────

export function useLeaveTypes() {
  return useQuery({
    queryKey: qk.leave.types(),
    queryFn: () => getLeaveTypes(),
    staleTime: 5 * 60_000, // catalogue changes rarely
    retry: 1,
  });
}

// ── BALANCES ──────────────────────────────────────────────────────────────────

export function useLeaveBalances(employeeId: string) {
  return useQuery({
    queryKey: qk.leave.balances(employeeId),
    queryFn: () => getLeaveBalances(employeeId),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(employeeId),
  });
}

// ── LIST ──────────────────────────────────────────────────────────────────────

export function useLeaveList(query: Partial<LeaveListQuery> = {}) {
  return useQuery({
    queryKey: qk.leave.list(query as Record<string, unknown>),
    queryFn: () => listLeave(query),
    staleTime: 15_000,
    retry: 1,
  });
}

// ── DETAIL ────────────────────────────────────────────────────────────────────

export function useLeave(id: string) {
  return useQuery({
    queryKey: qk.leave.detail(id),
    queryFn: () => getLeave(id),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(id),
  });
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export function useCreateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLeaveRequest) => createLeave(input),
    onSuccess: () => {
      // Invalidate list + balances (balance is read back after submit)
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
    },
  });
}

// ── APPROVE ───────────────────────────────────────────────────────────────────

export function useApproveLeave(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveLeaveRequest) => approveLeave(id, input),
    onSuccess: (data) => {
      // Update the detail cache immediately
      queryClient.setQueryData(qk.leave.detail(id), data);
      // Invalidate the list so queue refreshes
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
    },
  });
}

// ── REJECT ────────────────────────────────────────────────────────────────────

export function useRejectLeave(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectLeaveRequest) => rejectLeave(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.leave.detail(id), data);
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
    },
  });
}

// ── CANCEL ────────────────────────────────────────────────────────────────────

export function useCancelLeave(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CancelLeaveRequest) => cancelLeave(id, input),
    onSuccess: (data) => {
      // Update detail with the cancelled request
      queryClient.setQueryData(qk.leave.detail(id), { ...data.leaveRequest });
      // Bust list + balances (days restored)
      queryClient.invalidateQueries({ queryKey: qk.leave.all() });
    },
  });
}

// ── ADMIN: ADJUST BALANCE ─────────────────────────────────────────────────────

export function useAdjustBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdjustBalanceRequest) => adjustBalance(input),
    onSuccess: (_data, variables) => {
      // Bust the affected employee's balance cache
      queryClient.invalidateQueries({
        queryKey: qk.leave.balances(variables.employeeId),
      });
    },
  });
}

// ── ADMIN: LEAVE CONFIG ───────────────────────────────────────────────────────

export function useLeaveConfig() {
  return useQuery({
    queryKey: [...qk.leave.types(), 'config'],
    queryFn: () => getLeaveConfig(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useUpdateLeaveType(type: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLeaveTypeRequest) => updateLeaveType(type, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.leave.types() });
    },
  });
}

export function useUpdateLeaveQuota(type: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateLeaveQuotaRequest) => updateLeaveQuota(type, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.leave.types() });
    },
  });
}
