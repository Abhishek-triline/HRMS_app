/**
 * Nexora HRMS — Notifications API client (Phase 6).
 *
 * Endpoints:
 *   GET   /api/v1/notifications              — cursor-paginated feed
 *   POST  /api/v1/notifications/mark-read    — mark one/many/all as read
 *   GET   /api/v1/notifications/unread-count — bell count
 *
 * Types are imported from @nexora/contracts/notifications — never inlined.
 */

import { apiClient } from './client';
import type {
  NotificationListResponse,
  MarkReadRequest,
  MarkReadResponse,
  UnreadCountResponse,
} from '@nexora/contracts/notifications';

const BASE = '/api/v1/notifications';

// ── Query params builder ─────────────────────────────────────────────────────

export interface NotificationFilters {
  /** Filter by category ID code(s) — INT, matches §3.7. */
  categoryId?: number | number[];
  unread?: boolean;
  since?: string;
  cursor?: string;
  limit?: number;
}

function buildParams(filters: NotificationFilters): string {
  const params = new URLSearchParams();

  if (filters.categoryId != null) {
    const cats = Array.isArray(filters.categoryId) ? filters.categoryId : [filters.categoryId];
    cats.forEach((c) => params.append('categoryId', String(c)));
  }
  if (filters.unread !== undefined) {
    params.set('unread', String(filters.unread));
  }
  if (filters.since) {
    params.set('since', filters.since);
  }
  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }
  if (filters.limit !== undefined) {
    params.set('limit', String(filters.limit));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ── GET /notifications ───────────────────────────────────────────────────────

/** Fetch one page of the notification feed. */
export async function listNotifications(
  filters: NotificationFilters = {},
): Promise<NotificationListResponse> {
  const qs = buildParams(filters);
  return apiClient.get<NotificationListResponse>(`${BASE}${qs}`);
}

// ── POST /notifications/mark-read ────────────────────────────────────────────

/** Mark one or more notifications as read, or all with { all: true }. */
export async function markNotificationsRead(
  body: MarkReadRequest,
): Promise<MarkReadResponse> {
  return apiClient.post<MarkReadResponse>(`${BASE}/mark-read`, body);
}

// ── GET /notifications/unread-count ─────────────────────────────────────────

/** Fetch the current unread count. Used by the header bell (60s poll). */
export async function getUnreadCount(): Promise<UnreadCountResponse['data']> {
  const res = await apiClient.get<UnreadCountResponse>(`${BASE}/unread-count`);
  return res.data;
}
