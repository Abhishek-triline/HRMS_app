/**
 * Nexora HRMS — Attendance & Regularisation API client (Phase 3).
 *
 * All wrappers use apiClient from the shared fetch layer.
 * Paths match /api/v1/attendance/*, /api/v1/regularisations/*, /api/v1/config/holidays
 * Types are imported from @nexora/contracts/attendance — never inlined here.
 */

import { apiClient } from './client';
import type {
  CheckInResponse,
  CheckOutResponse,
  UndoCheckOutResponse,
  TodayAttendanceResponse,
  AttendanceListQuery,
  AttendanceListResponse,
  CreateRegularisationRequest,
  CreateRegularisationResponse,
  RegularisationListQuery,
  RegularisationListResponse,
  RegularisationDetailResponse,
  ApproveRegularisationRequest,
  ApproveRegularisationResponse,
  RejectRegularisationRequest,
  RejectRegularisationResponse,
  Holiday,
  HolidayListResponse,
  ReplaceHolidaysRequest,
  ReplaceHolidaysResponse,
} from '@nexora/contracts/attendance';

const ATT_BASE = '/api/v1/attendance';
const REG_BASE = '/api/v1/regularisations';
const HOL_BASE = '/api/v1/config/holidays';

// ── Check-in / Check-out ──────────────────────────────────────────────────────

/** POST /api/v1/attendance/check-in — idempotent; stamps now() server-side */
export async function checkIn(): Promise<CheckInResponse['data']> {
  const res = await apiClient.post<CheckInResponse>(`${ATT_BASE}/check-in`, {});
  return res.data;
}

/** POST /api/v1/attendance/check-out */
export async function checkOut(): Promise<CheckOutResponse['data']> {
  const res = await apiClient.post<CheckOutResponse>(`${ATT_BASE}/check-out`, {});
  return res.data;
}

/** POST /api/v1/attendance/check-out/undo — only valid within 5 min of check-out */
export async function undoCheckOut(): Promise<UndoCheckOutResponse['data']> {
  const res = await apiClient.post<UndoCheckOutResponse>(`${ATT_BASE}/check-out/undo`, {});
  return res.data;
}

// ── Today panel ───────────────────────────────────────────────────────────────

/** GET /api/v1/attendance/me/today — panel state: Ready | Working | Confirm */
export async function getTodayAttendance(): Promise<TodayAttendanceResponse['data']> {
  const res = await apiClient.get<TodayAttendanceResponse>(`${ATT_BASE}/me/today`);
  return res.data;
}

// ── Attendance list ───────────────────────────────────────────────────────────

/**
 * List attendance records. `scope` determines which endpoint is used:
 *   'me'   → GET /attendance/me     (own records)
 *   'team' → GET /attendance/team   (manager-scoped)
 *   'all'  → GET /attendance        (admin org-wide)
 */
export async function listAttendance(
  scope: 'me' | 'team' | 'all',
  query: Partial<AttendanceListQuery> = {},
): Promise<AttendanceListResponse> {
  const path =
    scope === 'me'
      ? `${ATT_BASE}/me`
      : scope === 'team'
        ? `${ATT_BASE}/team`
        : ATT_BASE;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiClient.get<AttendanceListResponse>(`${path}${qs ? `?${qs}` : ''}`);
}

// ── Regularisations ───────────────────────────────────────────────────────────

/** POST /api/v1/regularisations — may return 409 LEAVE_REG_CONFLICT (BL-010) */
export async function submitRegularisation(
  input: CreateRegularisationRequest,
): Promise<CreateRegularisationResponse['data']> {
  const res = await apiClient.post<CreateRegularisationResponse>(REG_BASE, input);
  return res.data;
}

/** GET /api/v1/regularisations — scoped by role server-side */
export async function listRegularisations(
  query: Partial<RegularisationListQuery> = {},
): Promise<RegularisationListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiClient.get<RegularisationListResponse>(`${REG_BASE}${qs ? `?${qs}` : ''}`);
}

/** GET /api/v1/regularisations/:id */
export async function getRegularisation(id: string): Promise<RegularisationDetailResponse['data']> {
  const res = await apiClient.get<RegularisationDetailResponse>(
    `${REG_BASE}/${encodeURIComponent(id)}`,
  );
  return res.data;
}

/** POST /api/v1/regularisations/:id/approve — Manager (≤7d) or Admin (>7d) */
export async function approveRegularisation(
  id: string,
  input: ApproveRegularisationRequest,
): Promise<ApproveRegularisationResponse['data']> {
  const res = await apiClient.post<ApproveRegularisationResponse>(
    `${REG_BASE}/${encodeURIComponent(id)}/approve`,
    input,
  );
  return res.data;
}

/** POST /api/v1/regularisations/:id/reject — note is REQUIRED */
export async function rejectRegularisation(
  id: string,
  input: RejectRegularisationRequest,
): Promise<RejectRegularisationResponse['data']> {
  const res = await apiClient.post<RejectRegularisationResponse>(
    `${REG_BASE}/${encodeURIComponent(id)}/reject`,
    input,
  );
  return res.data;
}

// ── Holiday calendar ──────────────────────────────────────────────────────────

/** GET /api/v1/config/holidays?year=YYYY — any authenticated role */
export async function getHolidays(year?: number): Promise<Holiday[]> {
  const qs = year !== undefined ? `?year=${year}` : '';
  const res = await apiClient.get<HolidayListResponse>(`${HOL_BASE}${qs}`);
  return res.data;
}

/** PUT /api/v1/config/holidays — Admin only; replaces all holidays for the year */
export async function replaceHolidays(input: ReplaceHolidaysRequest): Promise<Holiday[]> {
  const res = await apiClient.put<ReplaceHolidaysResponse>(HOL_BASE, input);
  return res.data;
}
