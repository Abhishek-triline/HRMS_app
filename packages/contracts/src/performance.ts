/**
 * Performance Reviews contract — Phase 5.
 *
 * Endpoints (docs/HRMS_API.md § 9):
 *   POST  /performance/cycles                            A-20   Admin
 *   GET   /performance/cycles                            A-20 / M-09 / E-10
 *   GET   /performance/cycles/{id}                       A-21
 *   POST  /performance/cycles/{id}/close                 A-20   Admin (two-step)
 *   GET   /performance/cycles/{id}/reports/distribution  A-22   Admin
 *   GET   /performance/cycles/{id}/reports/missing       A-23   Admin
 *
 *   GET   /performance/reviews                           A-21 / M-09 / E-10
 *   GET   /performance/reviews/{id}                      E-10 / E-11
 *   POST  /performance/reviews/{id}/goals                M-09   Manager (or assigned reviewer)
 *   POST  /performance/reviews/{id}/goals/propose        E-11   Employee (during self-review)
 *   PATCH /performance/reviews/{id}/self-rating          E-11   Employee (until deadline)
 *   POST  /performance/reviews/{id}/manager-rating       M-10   Manager (until deadline)
 *
 * Business rules enforced server-side:
 *   BL-037  Mid-cycle joiners — skipped for that cycle; included from the next.
 *   BL-038  Goals: Manager creates 3–5 at cycle start. Employee may propose
 *           additional goals during the self-review window. Each goal is
 *           Met / Partially Met / Missed / Pending until rated.
 *   BL-039  Self-rating editable until self-review deadline. Locked after.
 *   BL-040  Manager-rating editable until manager-review deadline. The
 *           system surfaces a "Manager-Changed" tag when manager rating
 *           differs from self rating (overrideSelf flag).
 *   BL-041  Cycle closure: Admin closes; final rating locked; no edits by
 *           anyone. Returns 409 CYCLE_CLOSED on subsequent mutations.
 *   BL-042  Manager change mid-cycle: new manager submits the rating;
 *           both previous and current managers retained on the review for
 *           audit (BL-022a).
 *
 *   Option B admin self-review (Implementation Plan § 9):
 *     When a cycle is created, Admins (employees with role=Admin) get a
 *     review row whose `managerId` is a PEER ADMIN (not their own
 *     reportingManagerId, which is null). The cycle creator picks the
 *     peer-reviewer pairing per cycle. If no peer Admin is available the
 *     review is created with managerId=null and surfaces in the missing-
 *     reviews report.
 */

import { z } from 'zod';
import {
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  VersionSchema,
} from './common.js';

// ── Cycle status ────────────────────────────────────────────────────────────

export const CycleStatusSchema = z.enum(['Open', 'Self-Review', 'Manager-Review', 'Closed']);
export type CycleStatus = z.infer<typeof CycleStatusSchema>;

// ── Goal ────────────────────────────────────────────────────────────────────

export const GoalOutcomeSchema = z.enum(['Met', 'Partial', 'Missed', 'Pending']);
export type GoalOutcome = z.infer<typeof GoalOutcomeSchema>;

export const GoalSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
  text: z.string(),
  outcome: GoalOutcomeSchema,
  /** Set true when the employee proposes a goal during self-review (BL-038). */
  proposedByEmployee: z.boolean(),
  createdAt: ISODateSchema,
  version: VersionSchema,
});
export type Goal = z.infer<typeof GoalSchema>;

// ── Performance cycle ───────────────────────────────────────────────────────

export const PerformanceCycleSchema = z.object({
  id: z.string(),
  code: z.string(), // C-YYYY-H1 or C-YYYY-H2
  fyStart: ISODateOnlySchema,
  fyEnd: ISODateOnlySchema,
  status: CycleStatusSchema,
  selfReviewDeadline: ISODateOnlySchema,
  managerReviewDeadline: ISODateOnlySchema,
  closedAt: ISODateSchema.nullable(),
  closedBy: z.string().nullable(),
  closedByName: z.string().nullable(),
  createdBy: z.string(),
  createdByName: z.string(),
  /** Active employees at cycle start, EXCLUDING mid-cycle joiners (BL-037). */
  participants: z.number().int().min(0),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type PerformanceCycle = z.infer<typeof PerformanceCycleSchema>;

export const PerformanceCycleSummarySchema = PerformanceCycleSchema.pick({
  id: true,
  code: true,
  fyStart: true,
  fyEnd: true,
  status: true,
  selfReviewDeadline: true,
  managerReviewDeadline: true,
  participants: true,
  closedAt: true,
});
export type PerformanceCycleSummary = z.infer<typeof PerformanceCycleSummarySchema>;

// ── Review ──────────────────────────────────────────────────────────────────

export const PerformanceReviewSchema = z.object({
  id: z.string(),
  cycleId: z.string(),
  cycleCode: z.string(),
  cycleStatus: CycleStatusSchema,
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  /** The current owner of the manager-rating slot. May change mid-cycle (BL-042). */
  managerId: z.string().nullable(),
  managerName: z.string().nullable(),
  /** Previous managerId — set on reassignment so the audit shows both. */
  previousManagerId: z.string().nullable(),
  previousManagerName: z.string().nullable(),
  goals: z.array(GoalSchema),
  selfRating: z.number().int().min(1).max(5).nullable(),
  selfNote: z.string().nullable(),
  selfSubmittedAt: ISODateSchema.nullable(),
  managerRating: z.number().int().min(1).max(5).nullable(),
  managerNote: z.string().nullable(),
  managerSubmittedAt: ISODateSchema.nullable(),
  /** True when manager rating differs from self rating (BL-040 — surfaces "Mgr changed" tag). */
  managerOverrodeSelf: z.boolean(),
  /** Set when the cycle closes (BL-041). Equal to managerRating once locked. */
  finalRating: z.number().int().min(1).max(5).nullable(),
  lockedAt: ISODateSchema.nullable(),
  /** True for employees who joined after fyStart — skipped for this cycle (BL-037). */
  isMidCycleJoiner: z.boolean(),
  /** Department + designation for the distribution report (A-22). */
  department: z.string().nullable(),
  designation: z.string().nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type PerformanceReview = z.infer<typeof PerformanceReviewSchema>;

export const PerformanceReviewSummarySchema = PerformanceReviewSchema.pick({
  id: true,
  cycleId: true,
  cycleCode: true,
  employeeId: true,
  employeeName: true,
  employeeCode: true,
  managerId: true,
  managerName: true,
  selfRating: true,
  managerRating: true,
  managerOverrodeSelf: true,
  finalRating: true,
  isMidCycleJoiner: true,
  department: true,
  designation: true,
});
export type PerformanceReviewSummary = z.infer<typeof PerformanceReviewSummarySchema>;

// ── POST /performance/cycles ────────────────────────────────────────────────

/**
 * Cycle creation — Admin only. Validates: fyStart < fyEnd, deadlines fall
 * inside the cycle window. The Indian fiscal calendar (April–March) is
 * fixed; cycles align to either H1 (April–September) or H2 (October–March).
 *
 * `adminPeerReviewers`: Option B admin self-review (Implementation Plan § 9).
 * Map of `{ adminEmployeeId → peerAdminEmployeeId }`. The cycle creator
 * pairs admins so each gets a peer-Admin reviewer. Admins not listed in
 * the map are surfaced in the missing-reviews report with a null managerId.
 */
export const CreateCycleRequestSchema = z.object({
  fyStart: ISODateOnlySchema,
  fyEnd: ISODateOnlySchema,
  selfReviewDeadline: ISODateOnlySchema,
  managerReviewDeadline: ISODateOnlySchema,
  adminPeerReviewers: z.record(z.string(), z.string()).optional(),
});
export type CreateCycleRequest = z.infer<typeof CreateCycleRequestSchema>;

export const CreateCycleResponseSchema = z.object({
  data: z.object({
    cycle: PerformanceCycleSchema,
    reviewCount: z.number().int().min(0),
    skipped: z.array(
      z.object({
        employeeId: z.string(),
        employeeName: z.string(),
        reason: z.literal('MidCycleJoiner'),
      }),
    ),
  }),
});
export type CreateCycleResponse = z.infer<typeof CreateCycleResponseSchema>;

// ── GET /performance/cycles ─────────────────────────────────────────────────

export const CycleListQuerySchema = PaginationQuerySchema.extend({
  status: CycleStatusSchema.optional(),
  fyStartFrom: ISODateOnlySchema.optional(),
  fyStartTo: ISODateOnlySchema.optional(),
});
export type CycleListQuery = z.infer<typeof CycleListQuerySchema>;

export const CycleListResponseSchema = z.object({
  data: z.array(PerformanceCycleSummarySchema),
  nextCursor: z.string().nullable(),
});
export type CycleListResponse = z.infer<typeof CycleListResponseSchema>;

// ── GET /performance/cycles/{id} ────────────────────────────────────────────

export const CycleDetailResponseSchema = z.object({
  data: z.object({
    cycle: PerformanceCycleSchema,
    reviews: z.array(PerformanceReviewSummarySchema),
  }),
});
export type CycleDetailResponse = z.infer<typeof CycleDetailResponseSchema>;

// ── POST /performance/cycles/{id}/close ─────────────────────────────────────

/**
 * Two-step close — client must POST `confirm: 'CLOSE'` literal.
 * Locks all final ratings; no further edits by anyone (BL-041).
 */
export const CloseCycleRequestSchema = z.object({
  confirm: z.literal('CLOSE'),
  version: VersionSchema,
});
export type CloseCycleRequest = z.infer<typeof CloseCycleRequestSchema>;

export const CloseCycleResponseSchema = z.object({
  data: z.object({
    cycle: PerformanceCycleSchema,
    lockedReviews: z.number().int().min(0),
  }),
});
export type CloseCycleResponse = z.infer<typeof CloseCycleResponseSchema>;

// ── Reports ─────────────────────────────────────────────────────────────────

/** A-22 — rating distribution per department per cycle. */
export const DistributionBucketSchema = z.object({
  department: z.string(),
  rating1: z.number().int().min(0),
  rating2: z.number().int().min(0),
  rating3: z.number().int().min(0),
  rating4: z.number().int().min(0),
  rating5: z.number().int().min(0),
  notRated: z.number().int().min(0),
});
export type DistributionBucket = z.infer<typeof DistributionBucketSchema>;

export const DistributionReportResponseSchema = z.object({
  data: z.object({
    cycleId: z.string(),
    cycleCode: z.string(),
    buckets: z.array(DistributionBucketSchema),
  }),
});
export type DistributionReportResponse = z.infer<typeof DistributionReportResponseSchema>;

/** A-23 — employees with no submitted manager rating in the current cycle. */
export const MissingReviewItemSchema = z.object({
  reviewId: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  department: z.string().nullable(),
  designation: z.string().nullable(),
  managerId: z.string().nullable(),
  managerName: z.string().nullable(),
  selfSubmitted: z.boolean(),
  managerSubmitted: z.boolean(),
});
export type MissingReviewItem = z.infer<typeof MissingReviewItemSchema>;

export const MissingReviewsResponseSchema = z.object({
  data: z.object({
    cycleId: z.string(),
    cycleCode: z.string(),
    items: z.array(MissingReviewItemSchema),
  }),
});
export type MissingReviewsResponse = z.infer<typeof MissingReviewsResponseSchema>;

// ── GET /performance/reviews ────────────────────────────────────────────────

export const ReviewListQuerySchema = PaginationQuerySchema.extend({
  cycleId: z.string().optional(),
  employeeId: z.string().optional(),
  managerId: z.string().optional(),
});
export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>;

export const ReviewListResponseSchema = z.object({
  data: z.array(PerformanceReviewSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ReviewListResponse = z.infer<typeof ReviewListResponseSchema>;

// ── GET /performance/reviews/{id} ───────────────────────────────────────────

export const ReviewDetailResponseSchema = z.object({
  data: PerformanceReviewSchema,
});
export type ReviewDetailResponse = z.infer<typeof ReviewDetailResponseSchema>;

// ── POST /performance/reviews/{id}/goals (Manager) ──────────────────────────

/**
 * Manager creates a goal at cycle start. The 3–5 typical count is a UX
 * guideline (BL-038); the server only enforces a minimum of 1 character on
 * `text` and a hard cap (e.g. 20) per review to prevent abuse.
 */
export const CreateGoalRequestSchema = z.object({
  text: z.string().min(3).max(500),
});
export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

export const CreateGoalResponseSchema = z.object({
  data: z.object({ goal: GoalSchema }),
});
export type CreateGoalResponse = z.infer<typeof CreateGoalResponseSchema>;

// ── POST /performance/reviews/{id}/goals/propose (Employee) ─────────────────

/**
 * Employee may propose additional goals during the self-review window only
 * (BL-038). Outcome stays Pending until the manager rates it.
 */
export const ProposeGoalRequestSchema = z.object({
  text: z.string().min(3).max(500),
});
export type ProposeGoalRequest = z.infer<typeof ProposeGoalRequestSchema>;

export const ProposeGoalResponseSchema = CreateGoalResponseSchema;
export type ProposeGoalResponse = z.infer<typeof ProposeGoalResponseSchema>;

// ── PATCH /performance/reviews/{id}/self-rating ─────────────────────────────

export const SelfRatingRequestSchema = z.object({
  selfRating: z.number().int().min(1).max(5),
  selfNote: z.string().max(2000).optional(),
  version: VersionSchema,
});
export type SelfRatingRequest = z.infer<typeof SelfRatingRequestSchema>;

export const SelfRatingResponseSchema = ReviewDetailResponseSchema;
export type SelfRatingResponse = z.infer<typeof SelfRatingResponseSchema>;

// ── POST /performance/reviews/{id}/manager-rating ───────────────────────────

/**
 * Manager submits / updates the manager rating + per-goal outcomes.
 * Editable until `managerReviewDeadline` (BL-040). Sets `managerOverrodeSelf`
 * when the new rating differs from `selfRating` (or when self has no rating).
 */
export const ManagerRatingRequestSchema = z.object({
  managerRating: z.number().int().min(1).max(5),
  managerNote: z.string().max(2000).optional(),
  goals: z
    .array(
      z.object({
        id: z.string(),
        outcome: GoalOutcomeSchema,
      }),
    )
    .optional(),
  version: VersionSchema,
});
export type ManagerRatingRequest = z.infer<typeof ManagerRatingRequestSchema>;

export const ManagerRatingResponseSchema = ReviewDetailResponseSchema;
export type ManagerRatingResponse = z.infer<typeof ManagerRatingResponseSchema>;
