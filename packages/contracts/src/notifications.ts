/**
 * Notifications contract.
 *
 * v2: All IDs are INT; category is an INT code.
 * §3.7 notifications.category_id: 1=Leave, 2=Attendance, 3=Payroll, 4=Performance,
 * 5=Status, 6=Configuration, 7=Auth, 8=System.
 *
 * Endpoints (docs/HRMS_API.md § 10):
 *   GET   /notifications                Any signed-in user. Own feed.
 *   POST  /notifications/mark-read      Any signed-in user. Body: { ids } or { all: true }.
 *   GET   /notifications/unread-count   Any signed-in user. Used by the header bell.
 *
 * Business rules enforced server-side:
 *   BL-043  Notifications are system-generated only. No public POST.
 *   BL-044  Strict role-scoping (Admin / Manager / Employee / PayrollOfficer).
 *   BL-045  Retention: 90 days (configurable). Audit-relevant events remain
 *           permanently in `audit_log` regardless of notification retention.
 *   BL-046  v1 ships in-app only — no email, SMS, push, or third-party.
 *   DN-26   No user-authored / free-form notifications.
 *   DN-27   No external delivery in v1.
 */

import { z } from 'zod';
import {
  IdParamSchema,
  IdSchema,
  ISODateSchema,
  PaginationQuerySchema,
} from './common.js';

// ── Categories (§3.7) ──────────────────────────────────────────────────────

/** 1=Leave, 2=Attendance, 3=Payroll, 4=Performance, 5=Status, 6=Configuration, 7=Auth, 8=System. */
export const NotificationCategoryIdSchema = z.number().int().min(1).max(8);

export const NotificationCategoryId = {
  Leave: 1,
  Attendance: 2,
  Payroll: 3,
  Performance: 4,
  Status: 5,
  Configuration: 6,
  Auth: 7,
  System: 8,
} as const;
export type NotificationCategoryIdValue =
  (typeof NotificationCategoryId)[keyof typeof NotificationCategoryId];

// ── Notification record ─────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: IdSchema,
  recipientId: IdSchema,
  categoryId: NotificationCategoryIdSchema,
  /** Short, role-aware headline ≤ 120 chars, e.g. "Leave request approved". */
  title: z.string().max(120),
  /** Plain-text body ≤ 600 chars. No HTML — UI renders text only. */
  body: z.string().max(600),
  /**
   * Deep link to the originating record, e.g. /employee/leave/L-2026-0118.
   *
   * Security: only relative paths starting with `/` are valid.
   * `javascript:`, absolute URLs (http://, https://), and
   * protocol-relative URLs (//example.com) are all rejected by the regex.
   */
  link: z
    .string()
    .max(191)
    .regex(/^\/[A-Za-z0-9/_\-?=&%.]*$/, 'link must be a relative path starting with /')
    .nullable(),
  unread: z.boolean(),
  /**
   * Reference back to the audit-log row that produced this notification, when
   * applicable. Lets the UI link Admin / forensic views from the audit.
   */
  auditLogId: IdSchema.nullable(),
  createdAt: ISODateSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

// ── GET /notifications ──────────────────────────────────────────────────────

export const NotificationListQuerySchema = PaginationQuerySchema.extend({
  /** Filter by one or more categories. Multi-value: pass `?categoryId=1&categoryId=3`. */
  categoryId: z
    .union([
      z.coerce.number().int().min(1).max(8),
      z.array(z.coerce.number().int().min(1).max(8)),
    ])
    .optional(),
  /** Show only unread items. */
  unread: z.coerce.boolean().optional(),
  /** Restrict to entries newer than this timestamp. Useful for refresh polling. */
  since: ISODateSchema.optional(),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

export const NotificationListResponseSchema = z.object({
  data: z.array(NotificationSchema),
  nextCursor: z.string().nullable(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

// ── POST /notifications/mark-read ───────────────────────────────────────────

/**
 * Either explicit IDs or `{ all: true }` to mark every unread item as read.
 * The handler intersects with `recipientId == req.user.id` so a caller can
 * never affect another user's feed (BL-044).
 */
export const MarkReadRequestSchema = z.union([
  z.object({ ids: z.array(IdParamSchema).min(1).max(500) }),
  z.object({ all: z.literal(true) }),
]);
export type MarkReadRequest = z.infer<typeof MarkReadRequestSchema>;

export const MarkReadResponseSchema = z.object({
  data: z.object({
    updated: z.number().int().min(0),
  }),
});
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;

// ── GET /notifications/unread-count ─────────────────────────────────────────

export const UnreadCountResponseSchema = z.object({
  data: z.object({
    count: z.number().int().min(0),
  }),
});
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;
