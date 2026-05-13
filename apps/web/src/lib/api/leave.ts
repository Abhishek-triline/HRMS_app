/**
 * Nexora HRMS — Leave Management API client (Phase 2).
 *
 * All wrappers use apiClient from the shared fetch layer.
 * Paths match /api/v1/leave/* as documented in HRMS_Implementation_Plan.md.
 * Types are imported from @nexora/contracts/leave — never inlined here.
 */

import { apiClient } from './client';
import type {
  LeaveTypesResponse,
  LeaveBalancesResponse,
  CreateLeaveRequest,
  CreateLeaveResponse,
  LeaveListQuery,
  LeaveListResponse,
  LeaveRequest,
  ApproveLeaveRequest,
  ApproveLeaveResponse,
  RejectLeaveRequest,
  RejectLeaveResponse,
  CancelLeaveRequest,
  CancelLeaveResponse,
  AdjustBalanceRequest,
  AdjustBalanceResponse,
  UpdateLeaveTypeRequest,
  UpdateLeaveQuotaRequest,
} from '@nexora/contracts/leave';

const BASE = '/api/v1/leave';

// ── Catalogue ─────────────────────────────────────────────────────────────────

/** GET /api/v1/leave/types — public catalogue, all authenticated roles */
export async function getLeaveTypes(): Promise<LeaveTypesResponse['data']> {
  const res = await apiClient.get<LeaveTypesResponse>(`${BASE}/types`);
  return res.data;
}

// ── Balances ──────────────────────────────────────────────────────────────────

/** GET /api/v1/leave/balances/:employeeId — SELF / Manager / Admin */
export async function getLeaveBalances(
  employeeId: number,
): Promise<LeaveBalancesResponse['data']> {
  const res = await apiClient.get<LeaveBalancesResponse>(
    `${BASE}/balances/${employeeId}`,
  );
  return res.data;
}

// ── Requests — create ─────────────────────────────────────────────────────────

/** POST /api/v1/leave/requests — Employee only. May throw 409 LEAVE_OVERLAP / LEAVE_REG_CONFLICT / INSUFFICIENT_BALANCE */
export async function createLeave(
  input: CreateLeaveRequest,
): Promise<CreateLeaveResponse['data']> {
  const res = await apiClient.post<CreateLeaveResponse>(`${BASE}/requests`, input);
  return res.data;
}

// ── Requests — list ───────────────────────────────────────────────────────────

/** GET /api/v1/leave/requests — scoped by role server-side */
export async function listLeave(query: Partial<LeaveListQuery> = {}): Promise<LeaveListResponse> {
  const params = new URLSearchParams();
  const entries = Object.entries(query) as [string, string | number | undefined][];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiClient.get<LeaveListResponse>(`${BASE}/requests${qs ? `?${qs}` : ''}`);
}

// ── Requests — detail ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/leave/requests/:idOrCode
 * Accepts either the numeric id ("42") or the human-readable code
 * ("L-2026-0018"). Notifications link by code so the URL is meaningful
 * when shared; list pages link by id. The server resolves either form.
 */
export async function getLeave(idOrCode: number | string): Promise<LeaveRequest> {
  const res = await apiClient.get<{ data: LeaveRequest }>(
    `${BASE}/requests/${idOrCode}`,
  );
  return res.data;
}

// ── Decisions ─────────────────────────────────────────────────────────────────

/** POST /api/v1/leave/requests/:id/approve — Manager (own queue) or Admin */
export async function approveLeave(
  id: number,
  input: ApproveLeaveRequest,
): Promise<ApproveLeaveResponse['data']> {
  const res = await apiClient.post<ApproveLeaveResponse>(
    `${BASE}/requests/${id}/approve`,
    input,
  );
  return res.data;
}

/** POST /api/v1/leave/requests/:id/reject — note is REQUIRED */
export async function rejectLeave(
  id: number,
  input: RejectLeaveRequest,
): Promise<RejectLeaveResponse['data']> {
  const res = await apiClient.post<RejectLeaveResponse>(
    `${BASE}/requests/${id}/reject`,
    input,
  );
  return res.data;
}

/** POST /api/v1/leave/requests/:id/cancel — owner before start / Manager-in-chain / Admin always */
export async function cancelLeave(
  id: number,
  input: CancelLeaveRequest,
): Promise<CancelLeaveResponse['data']> {
  const res = await apiClient.post<CancelLeaveResponse>(
    `${BASE}/requests/${id}/cancel`,
    input,
  );
  return res.data;
}

// ── Admin: balance adjustment ─────────────────────────────────────────────────

/** POST /api/v1/leave/balances/adjust — Admin only */
export async function adjustBalance(
  input: AdjustBalanceRequest,
): Promise<AdjustBalanceResponse['data']> {
  const res = await apiClient.post<AdjustBalanceResponse>(`${BASE}/balances/adjust`, input);
  return res.data;
}

// ── Admin: leave configuration ────────────────────────────────────────────────

/** GET /api/v1/leave/config/types — Admin alias for /types */
export async function getLeaveConfig(): Promise<LeaveTypesResponse['data']> {
  const res = await apiClient.get<LeaveTypesResponse>(`${BASE}/config/types`);
  return res.data;
}

/** PATCH /api/v1/leave/config/types/:type — update carry-forward cap or per-event max */
export async function updateLeaveType(
  type: string,
  input: UpdateLeaveTypeRequest,
): Promise<LeaveTypesResponse['data'][number]> {
  return apiClient.patch<LeaveTypesResponse['data'][number]>(
    `${BASE}/config/types/${encodeURIComponent(type)}`,
    input,
  );
}

/** PATCH /api/v1/leave/config/quotas/:type — update per-employment-type quota */
export async function updateLeaveQuota(
  type: string,
  input: UpdateLeaveQuotaRequest,
): Promise<LeaveTypesResponse['data'][number]> {
  return apiClient.patch<LeaveTypesResponse['data'][number]>(
    `${BASE}/config/quotas/${encodeURIComponent(type)}`,
    input,
  );
}
