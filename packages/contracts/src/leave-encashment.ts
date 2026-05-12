/**
 * Leave Encashment contract (BL-LE-01..14).
 *
 * v2: All IDs and status fields are INT. status_id (§3.3):
 *   1=Pending, 2=ManagerApproved, 3=AdminFinalised, 4=Paid, 5=Rejected, 6=Cancelled.
 * routed_to_id (§3.3): 1=Manager, 2=Admin.
 *
 * Endpoints (docs/HRMS_API.md §10):
 *   POST   /leave-encashments                        E (SELF)
 *   GET    /leave-encashments                        E / MGR / A (scoped)
 *   GET    /leave-encashments/:id                    E / MGR / A
 *   POST   /leave-encashments/:id/cancel             E (pre-ManagerApproved) / A
 *   GET    /leave-encashments/queue                  MGR / A
 *   POST   /leave-encashments/:id/manager-approve    MGR
 *   POST   /leave-encashments/:id/admin-finalise     A
 *   POST   /leave-encashments/:id/reject             MGR / A
 */

import { z } from 'zod';
import {
  EmployeeCodeSchema,
  IdParamSchema,
  IdSchema,
  ISODateSchema,
  PaginationQuerySchema,
  RoutedToIdSchema,
  VersionSchema,
} from './common.js';

// ── Status (§3.3) ───────────────────────────────────────────────────────────

/** 1=Pending, 2=ManagerApproved, 3=AdminFinalised, 4=Paid, 5=Rejected, 6=Cancelled. */
export const LeaveEncashmentStatusIdSchema = z.number().int().min(1).max(6);

export const LeaveEncashmentStatusId = {
  Pending: 1,
  ManagerApproved: 2,
  AdminFinalised: 3,
  Paid: 4,
  Rejected: 5,
  Cancelled: 6,
} as const;
export type LeaveEncashmentStatusIdValue =
  (typeof LeaveEncashmentStatusId)[keyof typeof LeaveEncashmentStatusId];

// ── Full detail ────────────────────────────────────────────────────────────

export const LeaveEncashmentDetailSchema = z.object({
  id: IdSchema,
  code: z.string(), // LE-YYYY-NNNN
  employeeId: IdSchema,
  employeeName: z.string(),
  employeeCode: EmployeeCodeSchema,
  year: z.number().int().min(2000).max(2999),
  daysRequested: z.number().int().min(1),
  daysApproved: z.number().int().min(0).nullable(),
  ratePerDayPaise: z.number().int().min(0).nullable(),
  amountPaise: z.number().int().min(0).nullable(),
  statusId: LeaveEncashmentStatusIdSchema,
  routedToId: RoutedToIdSchema,
  approverId: IdSchema.nullable(),
  approverName: z.string().nullable(),
  decidedAt: ISODateSchema.nullable(),
  decidedBy: IdSchema.nullable(),
  decisionNote: z.string().nullable(),
  escalatedAt: ISODateSchema.nullable(),
  paidInPayslipId: IdSchema.nullable(),
  paidAt: ISODateSchema.nullable(),
  cancelledAt: ISODateSchema.nullable(),
  cancelledBy: IdSchema.nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type LeaveEncashmentDetail = z.infer<typeof LeaveEncashmentDetailSchema>;

// ── Summary (queue / history tables) ──────────────────────────────────────

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
  statusId: true,
  routedToId: true,
  approverId: true,
  escalatedAt: true,
  createdAt: true,
  version: true,
});
export type LeaveEncashmentSummary = z.infer<typeof LeaveEncashmentSummarySchema>;

// ── POST /leave-encashments ────────────────────────────────────────────────

export const LeaveEncashmentRequestSchema = z.object({
  year: z.number().int().min(2000).max(2999),
  daysRequested: z.number().int().min(1),
});
export type LeaveEncashmentRequest = z.infer<typeof LeaveEncashmentRequestSchema>;

export const LeaveEncashmentRequestResponseSchema = z.object({
  data: LeaveEncashmentDetailSchema,
});
export type LeaveEncashmentRequestResponse = z.infer<typeof LeaveEncashmentRequestResponseSchema>;

// ── GET /leave-encashments (list) ─────────────────────────────────────────

export const LeaveEncashmentListQuerySchema = PaginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2999).optional(),
  statusId: z.coerce.number().int().min(1).max(6).optional(),
  employeeId: IdParamSchema.optional(),
});
export type LeaveEncashmentListQuery = z.infer<typeof LeaveEncashmentListQuerySchema>;

export const LeaveEncashmentListResponseSchema = z.object({
  data: z.array(LeaveEncashmentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type LeaveEncashmentListResponse = z.infer<typeof LeaveEncashmentListResponseSchema>;

// ── GET /leave-encashments/queue ──────────────────────────────────────────

export const LeaveEncashmentQueueResponseSchema = z.object({
  data: z.array(LeaveEncashmentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type LeaveEncashmentQueueResponse = z.infer<typeof LeaveEncashmentQueueResponseSchema>;

// ── POST /leave-encashments/:id/manager-approve ───────────────────────────

export const ManagerApproveEncashmentBodySchema = z.object({
  note: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type ManagerApproveEncashmentBody = z.infer<typeof ManagerApproveEncashmentBodySchema>;

// ── POST /leave-encashments/:id/admin-finalise ────────────────────────────

export const AdminFinaliseEncashmentBodySchema = z.object({
  /** Optional override for days to approve. Server clamps to floor(daysRemaining × 0.5). */
  daysApproved: z.number().int().min(1).optional(),
  note: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type AdminFinaliseEncashmentBody = z.infer<typeof AdminFinaliseEncashmentBodySchema>;

// ── POST /leave-encashments/:id/reject ────────────────────────────────────

export const RejectEncashmentBodySchema = z.object({
  note: z.string().min(1).max(2000),
  version: VersionSchema,
});
export type RejectEncashmentBody = z.infer<typeof RejectEncashmentBodySchema>;

// ── POST /leave-encashments/:id/cancel ────────────────────────────────────

export const CancelEncashmentBodySchema = z.object({
  note: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type CancelEncashmentBody = z.infer<typeof CancelEncashmentBodySchema>;

// ── Generic action response ───────────────────────────────────────────────

export const LeaveEncashmentActionResponseSchema = z.object({
  data: LeaveEncashmentDetailSchema,
});
export type LeaveEncashmentActionResponse = z.infer<typeof LeaveEncashmentActionResponseSchema>;
