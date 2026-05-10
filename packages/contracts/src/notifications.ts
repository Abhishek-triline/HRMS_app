/**
 * Notifications contract — Phase 6.
 *
 * Endpoints (docs/HRMS_API.md § 10):
 *   GET   /notifications                Any signed-in user. Own feed.
 *   POST  /notifications/mark-read      Any signed-in user. Body: { ids } or { all: true }.
 *   GET   /notifications/unread-count   Any signed-in user. Used by the header bell.
 *
 * Business rules enforced server-side:
 *   BL-043  Notifications are system-generated only. Produced by qualifying
 *           events in phases 1–5 (leave / regularisation / payroll /
 *           performance / status / configuration changes). Users CANNOT
 *           author free-form notifications. There is NO public POST.
 *   BL-044  Strict role-scoping:
 *             Admin            → org-wide events (escalations, payroll
 *                                 finalise, missing reviews, status changes,
 *                                 config changes)
 *             Manager          → team-scoped events (subordinate leave /
 *                                 reg requests, manager-review deadlines)
 *             Employee         → personal events (own leave/reg outcomes,
 *                                 payslip ready, late warnings, self-review
 *                                 windows)
 *             PayrollOfficer   → payroll-pipeline events (run finalisation
 *                                 prompts, tax-rate updates, LOP anomalies,
 *                                 reversals, mid-month-joiner detections)
 *           No cross-role exposure — A user only ever receives notifications
 *           that match their role + ownership of the underlying record.
 *   BL-045  Retention: 90 days (configurable). After that the row is
 *           archived/pruned by the daily cron. **Audit-relevant events**
 *           (approvals, payroll runs, reversals, status changes) remain
 *           permanently in `audit_log` regardless of notification retention.
 *   BL-046  v1 ships in-app only — no email, SMS, push, or third-party
 *           delivery channels.
 *   DN-26   No user-authored / free-form notifications.
 *   DN-27   No external delivery in v1.
 */

import { z } from 'zod';
import {
  ISODateSchema,
  PaginationQuerySchema,
} from './common.js';

// ── Categories ──────────────────────────────────────────────────────────────

/**
 * The eight categories the system emits. Each notification carries exactly
 * one. The frontend filter chips map to these directly.
 */
export const NotificationCategorySchema = z.enum([
  'Leave',
  'Attendance',
  'Payroll',
  'Performance',
  'Status',
  'Configuration',
  'Auth',
  'System',
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

// ── Notification record ─────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  category: NotificationCategorySchema,
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
  auditLogId: z.string().nullable(),
  createdAt: ISODateSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

// ── GET /notifications ──────────────────────────────────────────────────────

export const NotificationListQuerySchema = PaginationQuerySchema.extend({
  /** Filter by one or more categories. Multi-value: pass `?category=Leave&category=Payroll`. */
  category: z
    .union([NotificationCategorySchema, z.array(NotificationCategorySchema)])
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
  z.object({ ids: z.array(z.string()).min(1).max(500) }),
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
