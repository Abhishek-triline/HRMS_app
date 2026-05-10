/**
 * Nexora HRMS — Configuration API client (Phase 7).
 *
 * Endpoints:
 *   GET  /api/v1/config/attendance
 *   PUT  /api/v1/config/attendance
 *   GET  /api/v1/config/leave
 *   PUT  /api/v1/config/leave
 *
 * Types from @nexora/contracts/configuration — no inline types here.
 */

import { apiClient } from './client';
import type {
  AttendanceConfig,
  AttendanceConfigResponse,
  LeaveConfig,
  LeaveConfigResponse,
} from '@nexora/contracts/configuration';

const ATT_BASE = '/api/v1/config/attendance';
const LEAVE_BASE = '/api/v1/config/leave';

// ── Attendance Config ────────────────────────────────────────────────────────

/** GET /api/v1/config/attendance */
export async function getAttendanceConfig(): Promise<AttendanceConfig> {
  const res = await apiClient.get<AttendanceConfigResponse>(ATT_BASE);
  return res.data;
}

/** PUT /api/v1/config/attendance — body: full AttendanceConfig */
export async function updateAttendanceConfig(body: AttendanceConfig): Promise<AttendanceConfig> {
  const res = await apiClient.put<AttendanceConfigResponse>(ATT_BASE, body);
  return res.data;
}

// ── Leave Config ─────────────────────────────────────────────────────────────

/** GET /api/v1/config/leave */
export async function getLeaveConfig(): Promise<LeaveConfig> {
  const res = await apiClient.get<LeaveConfigResponse>(LEAVE_BASE);
  return res.data;
}

/** PUT /api/v1/config/leave — body: full LeaveConfig */
export async function updateLeaveConfig(body: LeaveConfig): Promise<LeaveConfig> {
  const res = await apiClient.put<LeaveConfigResponse>(LEAVE_BASE, body);
  return res.data;
}
