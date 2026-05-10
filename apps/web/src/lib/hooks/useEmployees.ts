'use client';

/**
 * TanStack Query hooks for the employees module — Phase 1.
 *
 * Query hooks: useEmployeesList, useEmployee, useTeam, useProfile
 * Mutation hooks: useCreateEmployee, useUpdateEmployee, useUpdateSalary,
 *                 useChangeStatus, useReassignManager
 *
 * All mutations invalidate the affected cache segments on success.
 * ApiError is surfaced to the caller — UI decides how to present it.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  updateSalary,
  changeStatus,
  reassignManager,
  getTeam,
  getProfile,
} from '@/lib/api/employees';
import { qk } from '@/lib/api/query-keys';
import type {
  EmployeeListQuery,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  UpdateSalaryRequest,
  ChangeStatusRequest,
  ReassignManagerRequest,
} from '@nexora/contracts/employees';

// ── LIST ──────────────────────────────────────────────────────────────────────

export function useEmployeesList(query: Partial<EmployeeListQuery> = {}) {
  return useQuery({
    queryKey: qk.employees.list(query as Record<string, unknown>),
    queryFn: () => listEmployees(query),
    staleTime: 30_000,
    retry: 1,
  });
}

// ── DETAIL ────────────────────────────────────────────────────────────────────

export function useEmployee(id: string) {
  return useQuery({
    queryKey: qk.employees.detail(id),
    queryFn: () => getEmployee(id),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(id),
  });
}

// ── TEAM ──────────────────────────────────────────────────────────────────────

export function useTeam(id: string) {
  return useQuery({
    queryKey: qk.employees.team(id),
    queryFn: () => getTeam(id),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(id),
  });
}

// ── PROFILE ───────────────────────────────────────────────────────────────────

export function useProfile(id: string) {
  return useQuery({
    queryKey: qk.employees.profile(id),
    queryFn: () => getProfile(id),
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(id),
  });
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEmployeeRequest) => createEmployee(input),
    onSuccess: () => {
      // Invalidate the entire employees list so the new record appears
      queryClient.invalidateQueries({ queryKey: qk.employees.all });
    },
  });
}

// ── UPDATE EMPLOYEE ───────────────────────────────────────────────────────────

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEmployeeRequest) => updateEmployee(id, input),
    onSuccess: (updated) => {
      // Update the detail cache optimistically
      queryClient.setQueryData(qk.employees.detail(id), updated);
      // Invalidate the list to reflect name/dept/role changes
      queryClient.invalidateQueries({ queryKey: qk.employees.all });
    },
  });
}

// ── UPDATE SALARY ─────────────────────────────────────────────────────────────

export function useUpdateSalary(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSalaryRequest) => updateSalary(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.employees.detail(id), updated);
    },
  });
}

// ── CHANGE STATUS ─────────────────────────────────────────────────────────────

export function useChangeStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeStatusRequest) => changeStatus(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.employees.detail(id), updated);
      // Also refetch the list so directory reflects new status
      queryClient.invalidateQueries({ queryKey: qk.employees.all });
    },
  });
}

// ── REASSIGN MANAGER ──────────────────────────────────────────────────────────

export function useReassignManager(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReassignManagerRequest) => reassignManager(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.employees.detail(id), updated);
      // Hierarchy changed — bust team cache for all managers
      queryClient.invalidateQueries({ queryKey: qk.employees.all });
    },
  });
}
