/**
 * Leave Management contract.
 *
 * v2: All IDs and status/type fields are INT. Leave types are master rows
 * (leave_types) with frozen IDs (1=Annual, 2=Sick, 3=Casual, 4=Unpaid,
 * 5=Maternity, 6=Paternity — see HRMS_Schema_v2_Plan §2). Routing is INT
 * (1=Manager, 2=Admin). The frontend owns label/colour maps.
 *
 * Endpoints (docs/HRMS_API.md § 6):
 *   POST   /leave/requests                          UC-005   Employee
 *   GET    /leave/requests                          E-03/M-04/A-06
 *   GET    /leave/requests/{id}                     —        owner / chain / Admin
 *   POST   /leave/requests/{id}/approve             UC-006   Manager / Admin
 *   POST   /leave/requests/{id}/reject              UC-006   Manager / Admin
 *   POST   /leave/requests/{id}/cancel              UC-007   Owner before-start, Manager/Admin any time
 *   GET    /leave/balances/{employeeId}             E-02     SELF / Manager / Admin
 *   GET    /leave/types                             A-08     all roles (read-only catalogue)
 *
 * Business rules enforced server-side:
 *   BL-009  Two leave requests from the same employee cannot overlap
 *   BL-010  Leave/regularisation conflict — second submission rejected with
 *           a SPECIFIC code (LEAVE_REG_CONFLICT), never a generic error
 *   BL-011  No half-day leave — full-day units only
 *   BL-012  Sick leave does NOT carry forward on Jan 1 reset
 *   BL-013  Annual + Casual carry-forward caps (configurable per type)
 *   BL-014  Maternity / Paternity are event-based — no annual balance
 *   BL-015  Maternity → Admin only, up to 26 weeks per event
 *   BL-016  Paternity → Admin only, 10 working days, single block, within
 *           6 months of birth
 *   BL-017  Manager with no reporting manager → Admin approves
 *   BL-018  5 working-day SLA → escalate to Admin (NEVER auto-approve)
 *   BL-019  Cancellation rights: owner before start; Manager/Admin any time
 *   BL-020  Balance restoration: full before start, remaining-only after
 *   BL-021  Balance deduction happens immediately on approval (not start)
 *   BL-022  Manager exit → pending approvals route to Admin
 *   DN-06   No half-day leave anywhere (also enforced by integer days)
 *   DN-19   Leave/reg conflict must use specific error, not generic
 */

import { z } from 'zod';
import {
  EmployeeCodeSchema,
  EmploymentTypeIdSchema,
  IdParamSchema,
  IdSchema,
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  RoutedToIdSchema,
  VersionSchema,
} from './common.js';

// ── Leave type IDs (frozen — HRMS_Schema_v2_Plan §2) ───────────────────────

/** Frozen ID constants. Never re-number — only append new types. */
export const LeaveTypeId = {
  Annual: 1,
  Sick: 2,
  Casual: 3,
  Unpaid: 4,
  Maternity: 5,
  Paternity: 6,
} as const;
export type LeaveTypeIdValue = (typeof LeaveTypeId)[keyof typeof LeaveTypeId];

/** Any leave_types.id (>=1). Servers MUST validate against the master table. */
export const LeaveTypeIdSchema = z.number().int().min(1);

/** Maternity + Paternity are event-based; the rest accrue annually. */
export const isEventBasedLeave = (typeId: number): boolean =>
  typeId === LeaveTypeId.Maternity || typeId === LeaveTypeId.Paternity;

// ── Leave request status (§3.2) ────────────────────────────────────────────

/** 1=Pending, 2=Approved, 3=Rejected, 4=Cancelled, 5=Escalated. */
export const LeaveStatusSchema = z.number().int().min(1).max(5);

// ── Leave balances ──────────────────────────────────────────────────────────

/**
 * Balance shape returned by GET /leave/balances/{employeeId}.
 *
 * For accrual types (Annual/Sick/Casual): `remaining` is an integer day count
 * for the current calendar year (BL-011 — never fractional). `total` is the
 * year's quota for the employee's employment type.
 *
 * For event-based types (Maternity/Paternity): `total` and `remaining` are
 * null. `eligible` reflects gender / employment / prior-window rules.
 *
 * For Unpaid: `total` is null (unbounded); `remaining` is null too.
 */
export const LeaveBalanceSchema = z.object({
  leaveTypeId: LeaveTypeIdSchema,
  /** Days remaining for accrual-based types; null for event-based / unpaid. */
  remaining: z.number().int().min(0).nullable(),
  /** Total quota for this employment type for the current year; null for event-based / unpaid. */
  total: z.number().int().min(0).nullable(),
  carryForwardCap: z.number().int().min(0).nullable(),
  /** Event-based types only — eligibility computed by the server. */
  eligible: z.boolean().nullable(),
});
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;

export const LeaveBalancesResponseSchema = z.object({
  data: z.object({
    employeeId: IdSchema,
    year: z.number().int().min(1900).max(2999),
    balances: z.array(LeaveBalanceSchema),
  }),
});
export type LeaveBalancesResponse = z.infer<typeof LeaveBalancesResponseSchema>;

// ── Leave types catalogue (read-only) ───────────────────────────────────────

export const LeaveTypeQuotaSchema = z.object({
  employmentTypeId: EmploymentTypeIdSchema,
  daysPerYear: z.number().int().min(0),
});

export const LeaveTypeCatalogItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  isEventBased: z.boolean(),
  requiresAdminApproval: z.boolean(),
  carryForwardCap: z.number().int().min(0).nullable(),
  maxDaysPerEvent: z.number().int().min(0).nullable(),
  quotas: z.array(LeaveTypeQuotaSchema),
});
export type LeaveTypeCatalogItem = z.infer<typeof LeaveTypeCatalogItemSchema>;

export const LeaveTypesResponseSchema = z.object({
  data: z.array(LeaveTypeCatalogItemSchema),
});
export type LeaveTypesResponse = z.infer<typeof LeaveTypesResponseSchema>;

// ── Leave request — full + summary ──────────────────────────────────────────

/**
 * `cancelledByRoleId` (§3.2): 1=Self (employee cancelled their own), 2=Manager,
 * 3=Admin. Null when never cancelled.
 */
export const CancelledByRoleIdSchema = z.number().int().min(1).max(3);

export const LeaveRequestSchema = z.object({
  id: IdSchema,
  code: z.string(), // L-YYYY-NNNN
  employeeId: IdSchema,
  employeeName: z.string(),
  employeeCode: EmployeeCodeSchema,
  leaveTypeId: LeaveTypeIdSchema,
  leaveTypeName: z.string(),
  fromDate: ISODateOnlySchema,
  toDate: ISODateOnlySchema,
  /** Computed by server — full days only (BL-011). */
  days: z.number().int().min(1),
  reason: z.string(),
  status: LeaveStatusSchema,
  routedToId: RoutedToIdSchema,
  /** Employee whose queue currently owns the request — Manager (or Admin on escalation/event-based). */
  approverId: IdSchema.nullable(),
  approverName: z.string().nullable(),
  decidedAt: ISODateSchema.nullable(),
  decidedBy: IdSchema.nullable(),
  decisionNote: z.string().nullable(),
  /** Set when the 5-working-day SLA elapses and the request escalates (BL-018). */
  escalatedAt: ISODateSchema.nullable(),
  /** Cancellation provenance — null if never cancelled. */
  cancelledAt: ISODateSchema.nullable(),
  cancelledBy: IdSchema.nullable(),
  /** Full name of the person who cancelled — null if never cancelled. */
  cancelledByName: z.string().nullable(),
  /** §3.2: 1=Self, 2=Manager, 3=Admin; null when never cancelled. */
  cancelledByRoleId: CancelledByRoleIdSchema.nullable(),
  /** True if the cancel happened after `fromDate` — BL-020 partial restore branch. */
  cancelledAfterStart: z.boolean(),
  /** Effective deduction recorded on approval (BL-021); null when not yet approved. */
  deductedDays: z.number().int().min(0).nullable(),
  /** Days returned to balance on cancellation (BL-020). */
  restoredDays: z.number().int().min(0).nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

/** Compact form for queue + history tables. */
export const LeaveRequestSummarySchema = LeaveRequestSchema.pick({
  id: true,
  code: true,
  employeeId: true,
  employeeName: true,
  employeeCode: true,
  leaveTypeId: true,
  leaveTypeName: true,
  fromDate: true,
  toDate: true,
  days: true,
  reason: true,
  status: true,
  routedToId: true,
  approverName: true,
  escalatedAt: true,
  createdAt: true,
});
export type LeaveRequestSummary = z.infer<typeof LeaveRequestSummarySchema>;

// ── POST /leave/requests ────────────────────────────────────────────────────

/**
 * Create a leave request.
 *
 * Server enforces:
 *   - days >= 1, fromDate <= toDate (full-day, BL-011)
 *   - balance check for accrual types (BL-014)
 *   - overlap with existing approved/pending leave → 409 LEAVE_OVERLAP (BL-009)
 *   - overlap with approved regularisation → 409 LEAVE_REG_CONFLICT (BL-010)
 *   - routing — Maternity/Paternity → Admin (BL-015/016); manager-with-no-manager
 *     → Admin (BL-017); else Manager
 */
export const CreateLeaveRequestSchema = z
  .object({
    leaveTypeId: LeaveTypeIdSchema,
    fromDate: ISODateOnlySchema,
    toDate: ISODateOnlySchema,
    reason: z.string().min(3).max(1000),
  })
  .strict();
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequestSchema>;

export const CreateLeaveResponseSchema = z.object({
  data: z.object({
    leaveRequest: LeaveRequestSchema,
    /** Snapshot of the affected balance after the hold (BL-021 deducts on APPROVAL, not submit). */
    balanceAfterSubmit: LeaveBalanceSchema.nullable(),
  }),
});
export type CreateLeaveResponse = z.infer<typeof CreateLeaveResponseSchema>;

// ── GET /leave/requests ─────────────────────────────────────────────────────

export const LeaveListQuerySchema = PaginationQuerySchema.extend({
  status: z.coerce.number().int().min(1).max(5).optional(),
  leaveTypeId: z.coerce.number().int().positive().optional(),
  fromDate: ISODateOnlySchema.optional(),
  toDate: ISODateOnlySchema.optional(),
  /** Manager / Admin filter — restrict to a specific employee. */
  employeeId: IdParamSchema.optional(),
  /** Admin-only — restrict to escalated / event-based queue. */
  routedToId: z.coerce.number().int().min(1).max(2).optional(),
  sort: z.string().optional(),
});
export type LeaveListQuery = z.infer<typeof LeaveListQuerySchema>;

export const LeaveListResponseSchema = z.object({
  data: z.array(LeaveRequestSummarySchema),
  nextCursor: z.string().nullable(),
});
export type LeaveListResponse = z.infer<typeof LeaveListResponseSchema>;

// ── GET /leave/requests/{id} ────────────────────────────────────────────────

export const LeaveRequestDetailResponseSchema = z.object({
  data: LeaveRequestSchema,
});
export type LeaveRequestDetailResponse = z.infer<typeof LeaveRequestDetailResponseSchema>;

// ── POST /leave/requests/{id}/approve ───────────────────────────────────────

export const ApproveLeaveRequestSchema = z.object({
  note: z.string().max(500).optional(),
  version: VersionSchema,
});
export type ApproveLeaveRequest = z.infer<typeof ApproveLeaveRequestSchema>;

export const ApproveLeaveResponseSchema = LeaveRequestDetailResponseSchema;
export type ApproveLeaveResponse = z.infer<typeof ApproveLeaveResponseSchema>;

// ── POST /leave/requests/{id}/reject ────────────────────────────────────────

export const RejectLeaveRequestSchema = z.object({
  /** Rejection note is REQUIRED — TC-LEAVE-011 fails without it. */
  note: z.string().min(3).max(500),
  version: VersionSchema,
});
export type RejectLeaveRequest = z.infer<typeof RejectLeaveRequestSchema>;

export const RejectLeaveResponseSchema = LeaveRequestDetailResponseSchema;
export type RejectLeaveResponse = z.infer<typeof RejectLeaveResponseSchema>;

// ── POST /leave/requests/{id}/cancel ────────────────────────────────────────

export const CancelLeaveRequestSchema = z.object({
  note: z.string().max(500).optional(),
  version: VersionSchema,
});
export type CancelLeaveRequest = z.infer<typeof CancelLeaveRequestSchema>;

export const CancelLeaveResponseSchema = z.object({
  data: z.object({
    leaveRequest: LeaveRequestSchema,
    /** Days returned to the balance for this cancellation (BL-020). */
    restoredDays: z.number().int().min(0),
  }),
});
export type CancelLeaveResponse = z.infer<typeof CancelLeaveResponseSchema>;

// ── Conflict error details (BL-009 / BL-010) ────────────────────────────────

/**
 * Carried in `error.details` when LEAVE_OVERLAP or LEAVE_REG_CONFLICT fires.
 * The frontend uses this to render a named conflict block (DN-19 — never a
 * generic error).
 *
 * `conflictTypeId`: 1=Leave, 2=Regularisation.
 */
export const LeaveConflictDetailsSchema = z.object({
  conflictTypeId: z.number().int().min(1).max(2),
  conflictId: IdSchema,
  conflictCode: z.string(),
  conflictFrom: ISODateOnlySchema,
  conflictTo: ISODateOnlySchema.nullable(),
  /** Snapshot of the conflicting record's status. */
  conflictStatus: z.number().int(),
});
export type LeaveConflictDetails = z.infer<typeof LeaveConflictDetailsSchema>;

// ── Admin-only: balance adjustment (A-07) ───────────────────────────────────

/**
 * One-off adjustment to an employee's balance — Admin-only. Used when a
 * carry-forward miscalculation needs correcting, or when sick leave is
 * granted manually outside the standard flow. Always audit-logged.
 */
export const AdjustBalanceRequestSchema = z.object({
  employeeId: IdSchema,
  leaveTypeId: LeaveTypeIdSchema,
  /** Positive = grant; negative = deduct. Integer days only (BL-011). */
  delta: z.number().int().refine((v) => v !== 0, 'delta must not be zero'),
  reason: z.string().min(5).max(500),
});
export type AdjustBalanceRequest = z.infer<typeof AdjustBalanceRequestSchema>;

export const AdjustBalanceResponseSchema = z.object({
  data: z.object({
    balance: LeaveBalanceSchema,
  }),
});
export type AdjustBalanceResponse = z.infer<typeof AdjustBalanceResponseSchema>;

// ── Admin-only: leave configuration (A-08) ──────────────────────────────────

/** Update a leave type's carry-forward cap or per-event maximum. */
export const UpdateLeaveTypeRequestSchema = z.object({
  carryForwardCap: z.number().int().min(0).max(365).nullable().optional(),
  maxDaysPerEvent: z.number().int().min(0).max(365).nullable().optional(),
});
export type UpdateLeaveTypeRequest = z.infer<typeof UpdateLeaveTypeRequestSchema>;

/** Update the per-employment-type quota for a leave type. */
export const UpdateLeaveQuotaRequestSchema = z.object({
  employmentTypeId: EmploymentTypeIdSchema,
  daysPerYear: z.number().int().min(0).max(365),
});
export type UpdateLeaveQuotaRequest = z.infer<typeof UpdateLeaveQuotaRequestSchema>;
