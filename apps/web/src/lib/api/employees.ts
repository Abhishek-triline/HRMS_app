/**
 * Employee API client functions — Phase 1.
 * All calls use apiFetch from client.ts which:
 *   - Attaches credentials (cookie)
 *   - Auto-adds Idempotency-Key on POST/PATCH
 *   - Throws ApiError on non-2xx
 */

import { apiClient } from './client';
import type {
  CreateEmployeeRequest,
  CreateEmployeeResponse,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeListResponse,
  UpdateEmployeeRequest,
  UpdateSalaryRequest,
  ChangeStatusRequest,
  ReassignManagerRequest,
  TeamResponse,
  ProfileResponse,
} from '@nexora/contracts/employees';

const BASE = '/api/v1/employees';

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createEmployee(
  input: CreateEmployeeRequest,
): Promise<CreateEmployeeResponse['data']> {
  const res = await apiClient.post<CreateEmployeeResponse>(BASE, input);
  return res.data;
}

// ── LIST ──────────────────────────────────────────────────────────────────────

export async function listEmployees(
  query: Partial<EmployeeListQuery> = {},
): Promise<EmployeeListResponse> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.status != null) params.set('status', String(query.status));
  if (query.roleId != null) params.set('roleId', String(query.roleId));
  if (query.departmentId != null) params.set('departmentId', String(query.departmentId));
  if (query.employmentTypeId != null) params.set('employmentTypeId', String(query.employmentTypeId));
  if (query.managerId != null) params.set('managerId', String(query.managerId));
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);

  const qs = params.toString();
  return apiClient.get<EmployeeListResponse>(`${BASE}${qs ? `?${qs}` : ''}`);
}

// ── GET DETAIL ────────────────────────────────────────────────────────────────

export async function getEmployee(id: number): Promise<EmployeeDetail> {
  const res = await apiClient.get<{ data: EmployeeDetail }>(`${BASE}/${id}`);
  return res.data;
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export async function updateEmployee(
  id: number,
  input: UpdateEmployeeRequest,
): Promise<EmployeeDetail> {
  const res = await apiClient.patch<{ data: EmployeeDetail }>(`${BASE}/${id}`, input);
  return res.data;
}

// ── UPDATE SALARY ─────────────────────────────────────────────────────────────

export async function updateSalary(
  id: number,
  input: UpdateSalaryRequest,
): Promise<EmployeeDetail> {
  const res = await apiClient.patch<{ data: EmployeeDetail }>(`${BASE}/${id}/salary`, input);
  return res.data;
}

// ── CHANGE STATUS ─────────────────────────────────────────────────────────────

export async function changeStatus(
  id: number,
  input: ChangeStatusRequest,
): Promise<EmployeeDetail> {
  const res = await apiClient.post<{ data: EmployeeDetail }>(`${BASE}/${id}/status`, input);
  return res.data;
}

// ── REASSIGN MANAGER ──────────────────────────────────────────────────────────

export async function reassignManager(
  id: number,
  input: ReassignManagerRequest,
): Promise<EmployeeDetail> {
  const res = await apiClient.post<{ data: EmployeeDetail }>(
    `${BASE}/${id}/reassign-manager`,
    input,
  );
  return res.data;
}

// ── TEAM ──────────────────────────────────────────────────────────────────────

export async function getTeam(id: number): Promise<TeamResponse['data']> {
  const res = await apiClient.get<TeamResponse>(`${BASE}/${id}/team`);
  return res.data;
}

// ── PROFILE ───────────────────────────────────────────────────────────────────

export async function getProfile(id: number): Promise<EmployeeDetail> {
  const res = await apiClient.get<ProfileResponse>(`${BASE}/${id}/profile`);
  return res.data;
}
