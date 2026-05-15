/**
 * Nexora HRMS — Audit Log API client (Phase 7).
 *
 * GET /api/v1/audit-logs (Admin-only, cursor-paginated, read-only)
 * Types are imported from @nexora/contracts/audit — no inline types here.
 */

import { apiClient } from './client';
import type {
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogExportResponse,
} from '@nexora/contracts/audit';

const BASE = '/api/v1/audit-logs';

export type AuditLogFilters = Omit<AuditLogListQuery, 'cursor' | 'limit'>;

/**
 * GET /api/v1/audit-logs — cursor-paginated, Admin-only.
 * Returns the raw envelope { data, nextCursor }.
 */
export async function listAuditLogs(
  filters: AuditLogFilters & { cursor?: string; limit?: number } = {},
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiClient.get<AuditLogListResponse>(`${BASE}${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/v1/audit-logs/export — single-shot Admin export, no cursor.
 * Server hard-caps at 20,000 rows and reports `truncated` when hit.
 */
export async function exportAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLogExportResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiClient.get<AuditLogExportResponse>(`${BASE}/export${qs ? `?${qs}` : ''}`);
}
