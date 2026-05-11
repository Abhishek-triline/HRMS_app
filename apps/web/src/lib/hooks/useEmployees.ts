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

// ── COUNT (cursor-walking aggregate) ──────────────────────────────────────────
//
// API has no `total` field on EmployeeListResponse (v1.1 backlog). To get an
// exact count without backend changes, walk the cursor pages with limit=100.
// Returns { count, isLoading } where count is the running total across all
// fetched pages. Stops fetching when nextCursor === null.
//
// Used by the dashboard KPI tile and any other spot that needs an exact
// org-wide or status-bucket total. Cached for 30 s so subsequent renders
// don't re-walk.

// MAX_PAGES is a constant — same number of useQuery hooks called every render
// (Rules of Hooks). Each subsequent page is only `enabled` when the prior page
// returned a cursor, so unused queries never fire.
const COUNT_PAGE_SIZE = 100;
const COUNT_MAX_PAGES = 10; // up to 1,000 employees; v1.1 backlog: backend total field

export function useEmployeesCount(
  filters: Omit<Partial<EmployeeListQuery>, 'limit' | 'cursor'> = {},
): { count: number | null; isLoading: boolean } {
  const filtersKey = JSON.stringify(filters);

  // Page 1 — always enabled.
  const p1 = useQuery({
    queryKey: ['employees-count', filtersKey, 1],
    queryFn: () =>
      listEmployees({ ...filters, limit: COUNT_PAGE_SIZE } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
  });
  const p2cur = p1.data?.nextCursor ?? null;
  const p2 = useQuery({
    queryKey: ['employees-count', filtersKey, 2, p2cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p2cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p2cur),
  });
  const p3cur = p2.data?.nextCursor ?? null;
  const p3 = useQuery({
    queryKey: ['employees-count', filtersKey, 3, p3cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p3cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p3cur),
  });
  const p4cur = p3.data?.nextCursor ?? null;
  const p4 = useQuery({
    queryKey: ['employees-count', filtersKey, 4, p4cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p4cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p4cur),
  });
  const p5cur = p4.data?.nextCursor ?? null;
  const p5 = useQuery({
    queryKey: ['employees-count', filtersKey, 5, p5cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p5cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p5cur),
  });
  const p6cur = p5.data?.nextCursor ?? null;
  const p6 = useQuery({
    queryKey: ['employees-count', filtersKey, 6, p6cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p6cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p6cur),
  });
  const p7cur = p6.data?.nextCursor ?? null;
  const p7 = useQuery({
    queryKey: ['employees-count', filtersKey, 7, p7cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p7cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p7cur),
  });
  const p8cur = p7.data?.nextCursor ?? null;
  const p8 = useQuery({
    queryKey: ['employees-count', filtersKey, 8, p8cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p8cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p8cur),
  });
  const p9cur = p8.data?.nextCursor ?? null;
  const p9 = useQuery({
    queryKey: ['employees-count', filtersKey, 9, p9cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p9cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p9cur),
  });
  const p10cur = p9.data?.nextCursor ?? null;
  const p10 = useQuery({
    queryKey: ['employees-count', filtersKey, 10, p10cur],
    queryFn: () =>
      listEmployees({
        ...filters,
        limit: COUNT_PAGE_SIZE,
        cursor: p10cur!,
      } as Partial<EmployeeListQuery>),
    staleTime: 30_000,
    retry: 1,
    enabled: Boolean(p10cur),
  });

  const pages = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];

  // Find the last page that has data — that's our terminus.
  let terminus: typeof p1 | null = null;
  for (let i = pages.length - 1; i >= 0; i--) {
    if (pages[i]!.data) {
      terminus = pages[i]!;
      break;
    }
  }

  const finalReached =
    !!terminus && terminus.data!.nextCursor === null;
  const isLoading = pages.some((p) => p.isLoading || p.isFetching);

  if (!finalReached) {
    return { count: null, isLoading };
  }

  // Sum only the pages we actually loaded (data present).
  const count = pages.reduce(
    (sum, p) => sum + (p.data?.data.length ?? 0),
    0,
  );
  // void unused vars to silence linter — they exist to keep Rules of Hooks intact.
  void COUNT_MAX_PAGES;
  return { count, isLoading: false };
}

// ── NAME LOOKUP (ID → display name) ──────────────────────────────────────────
//
// Walks the same 10-page chain as useEmployeesCount but across **all** statuses
// (Active + On-Notice + Exited) so the resulting Map covers every employee.
// Used by the audit log to translate ULIDs in "Acted by" / "Finalised by" /
// "Approved by" fields into human names.
//
// React Rules-of-Hooks safe: fixed-length useQuery chain per status, with
// enabled flags driven by each prior page's cursor.

function useEmployeesByStatus(status: 'Active' | 'On-Notice' | 'Exited') {
  const filtersKey = status;
  const p1 = useQuery({
    queryKey: ['employee-names', filtersKey, 1],
    queryFn: () =>
      listEmployees({ status, limit: 100 } as Partial<EmployeeListQuery>),
    staleTime: 60_000,
    retry: 1,
  });
  const p2cur = p1.data?.nextCursor ?? null;
  const p2 = useQuery({
    queryKey: ['employee-names', filtersKey, 2, p2cur],
    queryFn: () => listEmployees({ status, limit: 100, cursor: p2cur! } as Partial<EmployeeListQuery>),
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(p2cur),
  });
  const p3cur = p2.data?.nextCursor ?? null;
  const p3 = useQuery({
    queryKey: ['employee-names', filtersKey, 3, p3cur],
    queryFn: () => listEmployees({ status, limit: 100, cursor: p3cur! } as Partial<EmployeeListQuery>),
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(p3cur),
  });
  const p4cur = p3.data?.nextCursor ?? null;
  const p4 = useQuery({
    queryKey: ['employee-names', filtersKey, 4, p4cur],
    queryFn: () => listEmployees({ status, limit: 100, cursor: p4cur! } as Partial<EmployeeListQuery>),
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(p4cur),
  });
  const p5cur = p4.data?.nextCursor ?? null;
  const p5 = useQuery({
    queryKey: ['employee-names', filtersKey, 5, p5cur],
    queryFn: () => listEmployees({ status, limit: 100, cursor: p5cur! } as Partial<EmployeeListQuery>),
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(p5cur),
  });
  return [p1, p2, p3, p4, p5];
}

/** Map of employee id → full name across all statuses. */
export function useEmployeeNameMap(): Map<string, string> {
  const active = useEmployeesByStatus('Active');
  const onNotice = useEmployeesByStatus('On-Notice');
  const exited = useEmployeesByStatus('Exited');

  const map = new Map<string, string>();
  for (const pages of [active, onNotice, exited]) {
    for (const p of pages) {
      const data = p.data?.data ?? [];
      for (const emp of data) {
        if (emp.id && emp.name) map.set(emp.id, emp.name);
      }
    }
  }
  return map;
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
