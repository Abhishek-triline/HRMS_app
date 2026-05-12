'use client';

/**
 * TanStack Query hooks for master data (departments, designations, roles,
 * employment types, genders). All are stale for 5 minutes since master data
 * changes rarely.
 *
 * Admin-only mutation hooks: useCreateDepartment, useCreateDesignation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRoles,
  getDepartments,
  getDesignations,
  getEmploymentTypes,
  getGenders,
  createDepartment,
  createDesignation,
} from '@/lib/api/masters';
import { qk } from '@/lib/api/query-keys';
import type {
  MasterItem,
  CreateDepartmentRequest,
  CreateDesignationRequest,
} from '@nexora/contracts/employees';

const MASTERS_STALE = 5 * 60_000; // 5 minutes

// ── GET hooks ─────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: qk.masters.roles(),
    queryFn: getRoles,
    staleTime: MASTERS_STALE,
    retry: 1,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: qk.masters.departments(),
    queryFn: getDepartments,
    staleTime: MASTERS_STALE,
    retry: 1,
  });
}

export function useDesignations() {
  return useQuery({
    queryKey: qk.masters.designations(),
    queryFn: getDesignations,
    staleTime: MASTERS_STALE,
    retry: 1,
  });
}

export function useEmploymentTypes() {
  return useQuery({
    queryKey: qk.masters.employmentTypes(),
    queryFn: getEmploymentTypes,
    staleTime: MASTERS_STALE,
    retry: 1,
  });
}

export function useGenders() {
  return useQuery({
    queryKey: qk.masters.genders(),
    queryFn: getGenders,
    staleTime: MASTERS_STALE,
    retry: 1,
  });
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Returns an id→name Map from a MasterItem[] (or empty Map while loading). */
export function masterItemsToMap(items: MasterItem[] | undefined): Map<number, string> {
  const map = new Map<number, string>();
  if (!items) return map;
  for (const item of items) map.set(item.id, item.name);
  return map;
}

// ── POST hooks (Admin only) ───────────────────────────────────────────────────

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentRequest) => createDepartment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.masters.departments() });
    },
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDesignationRequest) => createDesignation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.masters.designations() });
    },
  });
}
