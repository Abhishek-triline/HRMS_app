/**
 * Leave Management contract — Phase 2.
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
  EmploymentTypeSchema,
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  VersionSchema,
} from './common.js';

// ── Leave types & status ────────────────────────────────────────────────────

/**
 * Six leave types — fixed by SRS § Module 2. The system never invents new
 * types at runtime; quotas + carry-forward caps are configurable per type.
 */
export const LeaveTypeSchema = z.enum([
  'Annual',
  'Sick',
  'Casual',
  'Unpaid',
  'Maternity',
  'Paternity',
]);
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

/** Maternity + Paternity are event-based; the rest accrue annually. */
export const isEventBasedLeave = (type: LeaveType): boolean =>
  type === 'Maternity' || type === 'Paternity';

export const LeaveStatusSchema = z.enum([
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Escalated',
]);
export type LeaveStatus = z.infer<typeof LeaveStatusSchema>;

/** Routing tag stamped at submit time so the queue UI can filter quickly. */
export const RoutedToSchema = z.enum(['Manager', 'Admin']);
export type RoutedTo = z.infer<typeof RoutedToSchema>;

// ── Leave balances ──────────────────────────────────────────────────────────

/**
 * Balance shape returned by GET /leave/balances/{employeeId}.
 *
 * - `annual` / `sick` / `casual` carry an integer day count for the current
 *   calendar year (BL-011 — never fractional).
 * - `maternity` and `paternity` are event-based (BL-014) — no annual balance,
 *   only an `eligible` flag that the server computes from prior usage windows.
 *   `remainingDays` is the unconsumed portion of the current event's allocation
 *   (0 if the employee has never claimed, or if the most recent event is
 *   already fully consumed).
 * - `unpaid` is unbounded — included so the client can render a uniform card
 *   (`total = null`).
 */
export const LeaveBalanceSchema = z.object({
  type: LeaveTypeSchema,
  /** Days remaining for accrual-based types; null for unpaid. */
  remaining: z.number().int().min(0).nullable(),
  /** Total quota for this employment type for the current year; null for event-based / unpaid. */
  total: z.number().int().min(0).nullable(),
  carryForwardCap: z.number().int().min(0).nullable(),
  /** Event-based types only — e.g. female employees are eligible for Maternity. */
  eligible: z.boolean().nullable(),
});
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;

export const LeaveBalancesResponseSchema = z.object({
  data: z.object({
    employeeId: z.string(),
    year: z.number().int().min(1900).max(2999),
    balances: z.array(LeaveBalanceSchema),
  }),
});
export type LeaveBalancesResponse = z.infer<typeof LeaveBalancesResponseSchema>;

// ── Leave types catalogue (read-only) ───────────────────────────────────────

export const LeaveTypeQuotaSchema = z.object({
  employmentType: EmploymentTypeSchema,
  daysPerYear: z.number().int().min(0),
});

export const LeaveTypeCatalogItemSchema = z.object({
  type: LeaveTypeSchema,
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

export const LeaveRequestSchema = z.object({
  id: z.string(),
  code: z.string(), // L-YYYY-NNNN
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  type: LeaveTypeSchema,
  fromDate: ISODateOnlySchema,
  toDate: ISODateOnlySchema,
  /** Computed by server — full days only (BL-011). */
  days: z.number().int().min(1),
  reason: z.string(),
  status: LeaveStatusSchema,
  routedTo: RoutedToSchema,
  /** Employee whose queue currently owns the request — Manager (or Admin on escalation/event-based). */
  approverId: z.string().nullable(),
  approverName: z.string().nullable(),
  decidedAt: ISODateSchema.nullable(),
  decidedBy: z.string().nullable(),
  decisionNote: z.string().nullable(),
  /** Set when the 5-working-day SLA elapses and the request escalates (BL-018). */
  escalatedAt: ISODateSchema.nullable(),
  /** Cancellation provenance — null if never cancelled. */
  cancelledAt: ISODateSchema.nullable(),
  cancelledBy: z.string().nullable(),
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
  type: true,
  fromDate: true,
  toDate: true,
  days: true,
  reason: true,
  status: true,
  routedTo: true,
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
    type: LeaveTypeSchema,
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
  status: LeaveStatusSchema.optional(),
  type: LeaveTypeSchema.optional(),
  fromDate: ISODateOnlySchema.optional(),
  toDate: ISODateOnlySchema.optional(),
  /** Manager / Admin filter — restrict to a specific employee. */
  employeeId: z.string().optional(),
  /** Admin-only — restrict to escalated / event-based queue. */
  routedTo: RoutedToSchema.optional(),
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
 */
export const LeaveConflictDetailsSchema = z.object({
  conflictType: z.enum(['Leave', 'Regularisation']),
  conflictId: z.string(),
  conflictCode: z.string(),
  conflictFrom: ISODateOnlySchema,
  conflictTo: ISODateOnlySchema.nullable(),
  conflictStatus: z.string(),
});
export type LeaveConflictDetails = z.infer<typeof LeaveConflictDetailsSchema>;

// ── Admin-only: balance adjustment (A-07) ───────────────────────────────────

/**
 * One-off adjustment to an employee's balance — Admin-only. Used when a
 * carry-forward miscalculation needs correcting, or when sick leave is
 * granted manually outside the standard flow. Always audit-logged.
 */
export const AdjustBalanceRequestSchema = z.object({
  employeeId: z.string(),
  type: LeaveTypeSchema,
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
  employmentType: EmploymentTypeSchema,
  daysPerYear: z.number().int().min(0).max(365),
});
export type UpdateLeaveQuotaRequest = z.infer<typeof UpdateLeaveQuotaRequestSchema>;
