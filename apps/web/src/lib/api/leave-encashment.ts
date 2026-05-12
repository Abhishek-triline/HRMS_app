/**
 * Nexora HRMS — Leave Encashment API client (BL-LE-01..14).
 *
 * All wrappers use apiClient from the shared fetch layer.
 * Paths match /api/v1/leave-encashments/* as documented in HRMS_LeaveEncashment_Plan.md.
 * Types are imported from @nexora/contracts/leave-encashment — never inlined here.
 */

import { apiClient } from './client';
import type {
  LeaveEncashmentRequest,
  LeaveEncashmentListQuery,
  LeaveEncashmentListResponse,
  LeaveEncashmentDetail,
  LeaveEncashmentQueueResponse,
  ManagerApproveEncashmentBody,
  AdminFinaliseEncashmentBody,
  RejectEncashmentBody,
  CancelEncashmentBody,
  LeaveEncashmentActionResponse,
  LeaveEncashmentRequestResponse,
} from '@nexora/contracts/leave-encashment';

const BASE = '/api/v1/leave-encashments';

// ── Submit ────────────────────────────────────────────────────────────────────

/** POST /api/v1/leave-encashments — Employee only. */
export async function submitEncashment(
  input: LeaveEncashmentRequest,
): Promise<LeaveEncashmentDetail> {
  const res = await apiClient.post<LeaveEncashmentRequestResponse>(BASE, input);
  return res.data;
}

// ── List ──────────────────────────────────────────────────────────────────────

/** GET /api/v1/leave-encashments — scoped by role server-side */
export async function listEncashments(
  query: Partial<LeaveEncashmentListQuery> = {},
): Promise<LeaveEncashmentListResponse> {
  const params = new URLSearchParams();
  const entries = Object.entries(query) as [string, string | number | undefined][];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiClient.get<LeaveEncashmentListResponse>(`${BASE}${qs ? `?${qs}` : ''}`);
}

// ── Detail ────────────────────────────────────────────────────────────────────

/** GET /api/v1/leave-encashments/:id */
export async function getEncashment(id: string): Promise<LeaveEncashmentDetail> {
  const res = await apiClient.get<{ data: LeaveEncashmentDetail }>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  return res.data;
}

// ── Queue ─────────────────────────────────────────────────────────────────────

/** GET /api/v1/leave-encashments/queue — Manager or Admin */
export async function getEncashmentQueue(
  query: { cursor?: string; limit?: number } = {},
): Promise<LeaveEncashmentQueueResponse> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiClient.get<LeaveEncashmentQueueResponse>(`${BASE}/queue${qs ? `?${qs}` : ''}`);
}

// ── Cancel ────────────────────────────────────────────────────────────────────

/** POST /api/v1/leave-encashments/:id/cancel */
export async function cancelEncashment(
  id: string,
  input: CancelEncashmentBody,
): Promise<LeaveEncashmentDetail> {
  const res = await apiClient.post<LeaveEncashmentActionResponse>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
    input,
  );
  return res.data;
}

// ── Manager approve ───────────────────────────────────────────────────────────

/** POST /api/v1/leave-encashments/:id/manager-approve */
export async function managerApproveEncashment(
  id: string,
  input: ManagerApproveEncashmentBody,
): Promise<LeaveEncashmentDetail> {
  const res = await apiClient.post<LeaveEncashmentActionResponse>(
    `${BASE}/${encodeURIComponent(id)}/manager-approve`,
    input,
  );
  return res.data;
}

// ── Admin finalise ────────────────────────────────────────────────────────────

/** POST /api/v1/leave-encashments/:id/admin-finalise */
export async function adminFinaliseEncashment(
  id: string,
  input: AdminFinaliseEncashmentBody,
): Promise<LeaveEncashmentDetail> {
  const res = await apiClient.post<LeaveEncashmentActionResponse>(
    `${BASE}/${encodeURIComponent(id)}/admin-finalise`,
    input,
  );
  return res.data;
}

// ── Reject ────────────────────────────────────────────────────────────────────

/** POST /api/v1/leave-encashments/:id/reject — Manager or Admin */
export async function rejectEncashment(
  id: string,
  input: RejectEncashmentBody,
): Promise<LeaveEncashmentDetail> {
  const res = await apiClient.post<LeaveEncashmentActionResponse>(
    `${BASE}/${encodeURIComponent(id)}/reject`,
    input,
  );
  return res.data;
}
