/**
 * Nexora HRMS — Master data API client (Phase 5c).
 *
 * Endpoints:
 *   GET  /api/v1/masters/roles                — all authenticated roles
 *   GET  /api/v1/masters/departments           — all authenticated roles
 *   GET  /api/v1/masters/designations          — all authenticated roles
 *   GET  /api/v1/masters/employment-types      — all authenticated roles
 *   GET  /api/v1/masters/genders               — all authenticated roles
 *   POST /api/v1/masters/departments           — Admin only
 *   POST /api/v1/masters/designations          — Admin only
 *
 * Master data changes rarely (staleTime = 5 min in hooks).
 * Types from @nexora/contracts/employees — MasterItem, MasterListResponse, etc.
 */

import { apiClient } from './client';
import type {
  MasterItem,
  MasterListResponse,
  CreateDepartmentRequest,
  CreateDesignationRequest,
} from '@nexora/contracts/employees';

const BASE = '/api/v1/masters';

// ── GET endpoints ─────────────────────────────────────────────────────────────

export async function getRoles(): Promise<MasterItem[]> {
  const res = await apiClient.get<MasterListResponse>(`${BASE}/roles`);
  return res.data;
}

export async function getDepartments(): Promise<MasterItem[]> {
  const res = await apiClient.get<MasterListResponse>(`${BASE}/departments`);
  return res.data;
}

export async function getDesignations(): Promise<MasterItem[]> {
  const res = await apiClient.get<MasterListResponse>(`${BASE}/designations`);
  return res.data;
}

export async function getEmploymentTypes(): Promise<MasterItem[]> {
  const res = await apiClient.get<MasterListResponse>(`${BASE}/employment-types`);
  return res.data;
}

export async function getGenders(): Promise<MasterItem[]> {
  const res = await apiClient.get<MasterListResponse>(`${BASE}/genders`);
  return res.data;
}

// ── POST endpoints (Admin only) ───────────────────────────────────────────────

export async function createDepartment(
  input: CreateDepartmentRequest,
): Promise<MasterItem> {
  const res = await apiClient.post<{ data: MasterItem }>(`${BASE}/departments`, input);
  return res.data;
}

export async function createDesignation(
  input: CreateDesignationRequest,
): Promise<MasterItem> {
  const res = await apiClient.post<{ data: MasterItem }>(`${BASE}/designations`, input);
  return res.data;
}
