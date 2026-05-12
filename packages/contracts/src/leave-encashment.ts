/**
 * Leave Encashment contract (additive — BL-LE-01..14).
 *
 * Endpoints (docs/HRMS_API.md §10):
 *   POST   /leave-encashments                        E (SELF)
 *   GET    /leave-encashments                        E / MGR / A (scoped)
 *   GET    /leave-encashments/:id                    E / MGR / A
 *   POST   /leave-encashments/:id/cancel             E (pre-ManagerApproved) / A
 *   GET    /leave-encashments/queue                  MGR / A
 *   POST   /leave-encashments/:id/manager-approve    MGR
 *   POST   /leave-encashments/:id/admin-finalise      A
 *   POST   /leave-encashments/:id/reject             MGR / A
 */

import { z } from 'zod';
import { ISODateSchema, PaginationQuerySchema, VersionSchema } from './common.js';

// ── Status enum ────────────────────────────────────────────────────────────────

export const LeaveEncashmentStatusSchema = z.enum([
  'Pending',
  'ManagerApproved',
  'AdminFinalised',
  'Paid',
  'Rejected',
  'Cancelled',
]);
export type LeaveEncashmentStatus = z.infer<typeof LeaveEncashmentStatusSchema>;

// ── Full detail ────────────────────────────────────────────────────────────────

export const LeaveEncashmentDetailSchema = z.object({
  id: z.string(),
  code: z.string(),                    // LE-YYYY-NNNN
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  year: z.number().int().min(2000).max(2999),
  daysRequested: z.number().int().min(1),
  daysApproved: z.number().int().min(0).nullable(),
  ratePerDayPaise: z.number().int().min(0).nullable(),
  amountPaise: z.number().int().min(0).nullable(),
  status: LeaveEncashmentStatusSchema,
  routedTo: z.enum(['Manager', 'Admin']),
  approverId: z.string().nullable(),
  approverName: z.string().nullable(),
  decidedAt: ISODateSchema.nullable(),
  decidedBy: z.string().nullable(),
  decisionNote: z.string().nullable(),
  escalatedAt: ISODateSchema.nullable(),
  paidInPayslipId: z.string().nullable(),
  paidAt: ISODateSchema.nullable(),
  cancelledAt: ISODateSchema.nullable(),
  cancelledBy: z.string().nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type LeaveEncashmentDetail = z.infer<typeof LeaveEncashmentDetailSchema>;

// ── Summary (queue / history tables) ──────────────────────────────────────────

export const LeaveEncashmentSummarySchema = LeaveEncashmentDetailSchema.pick({
  id: true,
  code: true,
  employeeId: true,
  employeeName: true,
  employeeCode: true,
  year: true,
  daysRequested: true,
  daysApproved: true,
  amountPaise: true,
  status: true,
  routedTo: true,
  approverId: true,
  escalatedAt: true,
  createdAt: true,
  version: true,
});
export type LeaveEncashmentSummary = z.infer<typeof LeaveEncashmentSummarySchema>;

// ── POST /leave-encashments ────────────────────────────────────────────────────

export const LeaveEncashmentRequestSchema = z.object({
  year: z.number().int().min(2000).max(2999),
  daysRequested: z.number().int().min(1),
});
export type LeaveEncashmentRequest = z.infer<typeof LeaveEncashmentRequestSchema>;

export const LeaveEncashmentRequestResponseSchema = z.object({
  data: LeaveEncashmentDetailSchema,
});
export type LeaveEncashmentRequestResponse = z.infer<typeof LeaveEncashmentRequestResponseSchema>;

// ── GET /leave-encashments (list) ─────────────────────────────────────────────

export const LeaveEncashmentListQuerySchema = PaginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2999).optional(),
  status: LeaveEncashmentStatusSchema.optional(),
  employeeId: z.string().optional(),
});
export type LeaveEncashmentListQuery = z.infer<typeof LeaveEncashmentListQuerySchema>;

export const LeaveEncashmentListResponseSchema = z.object({
  data: z.array(LeaveEncashmentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type LeaveEncashmentListResponse = z.infer<typeof LeaveEncashmentListResponseSchema>;

// ── GET /leave-encashments/queue ──────────────────────────────────────────────

export const LeaveEncashmentQueueResponseSchema = z.object({
  data: z.array(LeaveEncashmentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type LeaveEncashmentQueueResponse = z.infer<typeof LeaveEncashmentQueueResponseSchema>;

// ── POST /leave-encashments/:id/manager-approve ───────────────────────────────

export const ManagerApproveEncashmentBodySchema = z.object({
  note: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type ManagerApproveEncashmentBody = z.infer<typeof ManagerApproveEncashmentBodySchema>;

// ── POST /leave-encashments/:id/admin-finalise ────────────────────────────────

export const AdminFinaliseEncashmentBodySchema = z.object({
  /** Optional override for days to approve. Server clamps to floor(daysRemaining × 0.5). */
  daysApproved: z.number().int().min(1).optional(),
  note: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type AdminFinaliseEncashmentBody = z.infer<typeof AdminFinaliseEncashmentBodySchema>;

// ── POST /leave-encashments/:id/reject ────────────────────────────────────────

export const RejectEncashmentBodySchema = z.object({
  note: z.string().min(1).max(2000),
  version: VersionSchema,
});
export type RejectEncashmentBody = z.infer<typeof RejectEncashmentBodySchema>;

// ── POST /leave-encashments/:id/cancel ────────────────────────────────────────

export const CancelEncashmentBodySchema = z.object({
  note: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type CancelEncashmentBody = z.infer<typeof CancelEncashmentBodySchema>;

// ── Generic action response ───────────────────────────────────────────────────

export const LeaveEncashmentActionResponseSchema = z.object({
  data: LeaveEncashmentDetailSchema,
});
export type LeaveEncashmentActionResponse = z.infer<typeof LeaveEncashmentActionResponseSchema>;
