/**
 * Attendance & Regularisation contract.
 *
 * v2: IDs are INT; status/source/routing fields are INT codes.
 *
 * §3.4 attendance_records.status_id: 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday.
 * §3.4 attendance_records.source_id: 1=system, 2=regularisation.
 * §3.4 regularisation_requests.status_id: 1=Pending, 2=Approved, 3=Rejected.
 * §3.4 regularisation_requests.routed_to_id: 1=Manager, 2=Admin.
 *
 * Endpoints (docs/HRMS_API.md § 7):
 *   POST /attendance/check-in                  E-06   any signed-in user (BL-004)
 *   POST /attendance/check-out                 E-06   same — mandatory after check-in (BL-024)
 *   GET  /attendance/me                        E-05   own
 *   GET  /attendance/team                      M-05   manager-of-team
 *   GET  /attendance                           A-09   admin org-wide
 *   POST /regularisations                      E-07   any signed-in user
 *   GET  /regularisations                      E-07/M-06/A-10
 *   GET  /regularisations/{id}                 owner / approver / chain / Admin
 *   POST /regularisations/{id}/approve         M-06 (≤7d) / A-10 (>7d)
 *   POST /regularisations/{id}/reject          same
 *
 * Holidays (docs/HRMS_API.md § 12):
 *   GET  /config/holidays                      any signed-in user (used by status derivation)
 *   PUT  /config/holidays                      Admin only
 *
 * Business rules enforced server-side:
 *   BL-010  Leave/regularisation conflict — second submission rejected with
 *           SPECIFIC code (LEAVE_REG_CONFLICT). Phase 2 stubbed the
 *           opposite direction; Phase 3 fills in BOTH directions.
 *   BL-023  Auto-generate one Attendance row per Active employee at 00:00,
 *           default status = Absent.
 *   BL-024  Check-out is mandatory once check-in is recorded.
 *   BL-025  hoursWorked = checkOutTime − checkInTime (system-computed).
 *   BL-025a Standard daily working hours configurable (default 8) — display
 *           only, does NOT drive deductions, overtime, or payroll.
 *   BL-026  Status derivation priority:
 *           OnLeave > WeeklyOff / Holiday > Present > Absent.
 *   BL-027  Late mark = check-in after configured threshold (default 10:30).
 *   BL-028  3 late marks in a calendar month → 1 full day deducted from
 *           Annual leave. Each subsequent late = another full day.
 *   BL-029  Regularisation routing: ≤7d → reporting Manager; >7d → Admin.
 */

import { z } from 'zod';
import {
  EmployeeCodeSchema,
  IdParamSchema,
  IdSchema,
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  RoutedToIdSchema,
  VersionSchema,
} from './common.js';

// ── Status & source ─────────────────────────────────────────────────────────

/** §3.4: 1=Present, 2=Absent, 3=OnLeave, 4=WeeklyOff, 5=Holiday. */
export const AttendanceStatusSchema = z.number().int().min(1).max(5);

export const AttendanceStatus = {
  Present: 1,
  Absent: 2,
  OnLeave: 3,
  WeeklyOff: 4,
  Holiday: 5,
} as const;
export type AttendanceStatusValue =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

/**
 * §3.4: 1=system (midnight job / check-in), 2=regularisation (approved correction).
 * Original rows are never mutated; corrections append a new row with source_id=2.
 */
export const AttendanceSourceIdSchema = z.number().int().min(1).max(2);

// ── Attendance record — full + summary ──────────────────────────────────────

export const AttendanceRecordSchema = z.object({
  id: IdSchema,
  employeeId: IdSchema,
  date: ISODateOnlySchema,
  status: AttendanceStatusSchema,
  checkInTime: ISODateSchema.nullable(),
  checkOutTime: ISODateSchema.nullable(),
  /** Computed by server: (checkOut − checkIn) in milliseconds, exposed as minutes. */
  hoursWorkedMinutes: z.number().int().min(0).nullable(),
  /** Daily-hours target snapshotted at row creation time. Frozen for historical correctness. */
  targetHours: z.number().int().positive(),
  late: z.boolean(),
  /** Cumulative late count for the calendar month at the point this row was last written. */
  lateMonthCount: z.number().int().min(0),
  /** True for unauthorised Absent days that incur LOP at payroll time. */
  lopApplied: z.boolean(),
  sourceId: AttendanceSourceIdSchema,
  /** Set when sourceId = 2 — links back to the approving regularisation request. */
  regularisationId: IdSchema.nullable(),
  createdAt: ISODateSchema,
  version: VersionSchema,
});
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

/** Compact form for calendar / monthly views. */
export const AttendanceCalendarItemSchema = z.object({
  date: ISODateOnlySchema,
  status: AttendanceStatusSchema,
  checkInTime: ISODateSchema.nullable(),
  checkOutTime: ISODateSchema.nullable(),
  hoursWorkedMinutes: z.number().int().min(0).nullable(),
  late: z.boolean(),
  /**
   * Daily-hours target that applied on this date, snapshotted at row
   * creation time. The "below target" chart classification compares
   * hoursWorkedMinutes against this — not against the current global
   * config — so historical days keep the policy that applied then.
   */
  targetHours: z.number().int().positive(),
});
export type AttendanceCalendarItem = z.infer<typeof AttendanceCalendarItemSchema>;

// ── POST /attendance/check-in ───────────────────────────────────────────────

/**
 * No request body — server stamps `now()`. The handler is idempotent: a
 * second call on the same calendar day returns the existing record.
 */
export const CheckInRequestSchema = z.object({}).strict();
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;

export const CheckInResponseSchema = z.object({
  data: z.object({
    record: AttendanceRecordSchema,
    /** True if this check-in pushed the late count to a multiple of 3 — UI shows the BL-028 deduction notice. */
    lateMarkDeductionApplied: z.boolean(),
    /** Updated late count in the current calendar month. */
    lateMonthCount: z.number().int().min(0),
  }),
});
export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;

// ── POST /attendance/check-out ──────────────────────────────────────────────

export const CheckOutRequestSchema = z.object({}).strict();
export type CheckOutRequest = z.infer<typeof CheckOutRequestSchema>;

export const CheckOutResponseSchema = z.object({
  data: z.object({
    record: AttendanceRecordSchema,
    hoursWorkedMinutes: z.number().int().min(0),
  }),
});
export type CheckOutResponse = z.infer<typeof CheckOutResponseSchema>;

// ── POST /attendance/check-out/undo ────────────────────────────────────────

/**
 * Undo a check-out. Payload is byte-identical to CheckInResponse so the
 * frontend can reuse the same deserialisation path. Only allowed within
 * 5 minutes of the check-out; after that, a regularisation is required.
 */
export const UndoCheckOutResponseSchema = CheckInResponseSchema;
export type UndoCheckOutResponse = CheckInResponse;

// ── GET /attendance/me, /attendance/team, /attendance ───────────────────────

export const AttendanceListQuerySchema = PaginationQuerySchema.extend({
  /** Defaults: server picks the current calendar month if neither is supplied. */
  from: ISODateOnlySchema.optional(),
  to: ISODateOnlySchema.optional(),
  status: z.coerce.number().int().min(1).max(5).optional(),
  /** Manager / Admin filter — restrict to a specific employee. */
  employeeId: IdParamSchema.optional(),
  /** Admin-only filter for the org-wide view. */
  departmentId: IdParamSchema.optional(),
  /** Optional "single day" shortcut. If supplied, `from` and `to` are ignored. */
  date: ISODateOnlySchema.optional(),
});
export type AttendanceListQuery = z.infer<typeof AttendanceListQuerySchema>;

/** Calendar-style payload — used by E-05 and the manager / admin grids. */
export const AttendanceListResponseSchema = z.object({
  data: z.array(
    AttendanceCalendarItemSchema.extend({
      employeeId: IdSchema,
      employeeName: z.string().optional(),
      employeeCode: EmployeeCodeSchema.optional(),
      /** Department name for grid views; null when employee has no department. */
      department: z.string().nullable().optional(),
      /** Running count of late marks in the row's calendar month, snapshotted at last write. */
      lateMonthCount: z.number().int().min(0),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type AttendanceListResponse = z.infer<typeof AttendanceListResponseSchema>;

/**
 * GET /attendance/stats — aggregate counts for a date (or range) with optional
 * department filter. Used by the org-wide and team attendance dashboards so
 * the KPI strip doesn't have to count rows from a paginated table.
 */
export const AttendanceStatsQuerySchema = z.object({
  date: ISODateOnlySchema.optional(),
  from: ISODateOnlySchema.optional(),
  to: ISODateOnlySchema.optional(),
  departmentId: IdParamSchema.optional(),
});
export type AttendanceStatsQuery = z.infer<typeof AttendanceStatsQuerySchema>;

export const AttendanceStatsResponseSchema = z.object({
  data: z.object({
    /** Total attendance rows matching the filter (e.g. active employees on the day). */
    total: z.number().int().min(0),
    present: z.number().int().min(0),
    absent: z.number().int().min(0),
    onLeave: z.number().int().min(0),
    weeklyOff: z.number().int().min(0),
    holiday: z.number().int().min(0),
    /** Count of rows with the late flag set. */
    late: z.number().int().min(0),
    /** Count of rows with status=Absent and no check-in time. */
    yetToCheckIn: z.number().int().min(0),
  }),
});
export type AttendanceStatsResponse = z.infer<typeof AttendanceStatsResponseSchema>;

/** Today's status for the check-in panel — used by GET /attendance/me?date=today. */
export const TodayAttendanceResponseSchema = z.object({
  data: z.object({
    record: AttendanceRecordSchema.nullable(),
    /** 1=Ready (no check-in yet), 2=Working (checked in), 3=Confirm (checked out). */
    panelStateId: z.number().int().min(1).max(3),
    lateThreshold: z.string(), // "HH:MM" from configuration (BL-027)
    standardDailyHours: z.number().int().positive(), // BL-025a (display only)
    /** Late count for the current calendar month (TC-ATT-008/009 / BL-028). */
    lateMonthCount: z.number().int().min(0),
    /**
     * Minutes after a check-out within which the employee may undo it.
     * 0 means undo is disabled — the panel should hide / disable the
     * Undo control and any successful checkout is final.
     */
    undoWindowMinutes: z.number().int().min(0).max(60),
  }),
});
export type TodayAttendanceResponse = z.infer<typeof TodayAttendanceResponseSchema>;

// ── Regularisation status & routing ─────────────────────────────────────────

/** §3.4: 1=Pending, 2=Approved, 3=Rejected. */
export const RegStatusSchema = z.number().int().min(1).max(3);

export const RegStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
} as const;
export type RegStatusValue = (typeof RegStatus)[keyof typeof RegStatus];

// ── Regularisation request — full + summary ─────────────────────────────────

export const RegularisationRequestSchema = z.object({
  id: IdSchema,
  code: z.string(), // R-YYYY-NNNN
  employeeId: IdSchema,
  employeeName: z.string(),
  employeeCode: EmployeeCodeSchema,
  /** The date being corrected (always in the past). */
  date: ISODateOnlySchema,
  proposedCheckIn: ISODateSchema.nullable(),
  proposedCheckOut: ISODateSchema.nullable(),
  reason: z.string(),
  status: RegStatusSchema,
  routedToId: RoutedToIdSchema,
  /** Captured at submit time so re-routing later doesn't change the audit trail. */
  ageDaysAtSubmit: z.number().int().min(0),
  approverId: IdSchema.nullable(),
  approverName: z.string().nullable(),
  decidedAt: ISODateSchema.nullable(),
  decidedBy: IdSchema.nullable(),
  decisionNote: z.string().nullable(),
  /** Link to the corrected attendance row created on approval (BL-026). */
  correctedRecordId: IdSchema.nullable(),
  /**
   * Snapshot of the original system-generated attendance row for the
   * (employeeId, date) being corrected. Surfaced on the detail endpoint
   * so the approver can compare original vs proposed without a second
   * round-trip. Null when no system row exists yet (extremely rare —
   * the midnight job creates one for every active employee).
   */
  originalRecord: z
    .object({
      status: AttendanceStatusSchema,
      checkInTime: ISODateSchema.nullable(),
      checkOutTime: ISODateSchema.nullable(),
      late: z.boolean(),
    })
    .nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type RegularisationRequest = z.infer<typeof RegularisationRequestSchema>;

export const RegularisationSummarySchema = RegularisationRequestSchema.pick({
  id: true,
  code: true,
  employeeId: true,
  employeeName: true,
  employeeCode: true,
  date: true,
  status: true,
  routedToId: true,
  ageDaysAtSubmit: true,
  approverName: true,
  createdAt: true,
});
export type RegularisationSummary = z.infer<typeof RegularisationSummarySchema>;

// ── POST /regularisations ───────────────────────────────────────────────────

export const CreateRegularisationRequestSchema = z
  .object({
    date: ISODateOnlySchema,
    /** Only the time portion is meaningful — the server combines with `date`. */
    proposedCheckIn: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24-hour)')
      .optional()
      .nullable(),
    proposedCheckOut: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24-hour)')
      .optional()
      .nullable(),
    reason: z.string().min(5).max(1000),
  })
  .refine(
    (v) => v.proposedCheckIn || v.proposedCheckOut,
    'At least one of proposedCheckIn or proposedCheckOut is required',
  );
export type CreateRegularisationRequest = z.infer<typeof CreateRegularisationRequestSchema>;

export const CreateRegularisationResponseSchema = z.object({
  data: z.object({
    regularisation: RegularisationRequestSchema,
  }),
});
export type CreateRegularisationResponse = z.infer<typeof CreateRegularisationResponseSchema>;

// ── GET /regularisations ────────────────────────────────────────────────────

export const RegularisationListQuerySchema = PaginationQuerySchema.extend({
  status: z.coerce.number().int().min(1).max(3).optional(),
  routedToId: z.coerce.number().int().min(1).max(2).optional(),
  employeeId: IdParamSchema.optional(),
  fromDate: ISODateOnlySchema.optional(),
  toDate: ISODateOnlySchema.optional(),
});
export type RegularisationListQuery = z.infer<typeof RegularisationListQuerySchema>;

export const RegularisationListResponseSchema = z.object({
  data: z.array(RegularisationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type RegularisationListResponse = z.infer<typeof RegularisationListResponseSchema>;

export const RegularisationDetailResponseSchema = z.object({
  data: RegularisationRequestSchema,
});
export type RegularisationDetailResponse = z.infer<typeof RegularisationDetailResponseSchema>;

// ── Decision endpoints ──────────────────────────────────────────────────────

export const ApproveRegularisationRequestSchema = z.object({
  note: z.string().max(500).optional(),
  version: VersionSchema,
});
export type ApproveRegularisationRequest = z.infer<typeof ApproveRegularisationRequestSchema>;

export const ApproveRegularisationResponseSchema = RegularisationDetailResponseSchema;
export type ApproveRegularisationResponse = z.infer<typeof ApproveRegularisationResponseSchema>;

export const RejectRegularisationRequestSchema = z.object({
  /** Required — TC-REG-005 fails without it. */
  note: z.string().min(3).max(500),
  version: VersionSchema,
});
export type RejectRegularisationRequest = z.infer<typeof RejectRegularisationRequestSchema>;

export const RejectRegularisationResponseSchema = RegularisationDetailResponseSchema;
export type RejectRegularisationResponse = z.infer<typeof RejectRegularisationResponseSchema>;

// ── Holiday calendar ────────────────────────────────────────────────────────

export const HolidaySchema = z.object({
  id: IdSchema,
  date: ISODateOnlySchema,
  name: z.string().min(1).max(120),
});
export type Holiday = z.infer<typeof HolidaySchema>;

export const HolidayListResponseSchema = z.object({
  data: z.array(HolidaySchema),
});
export type HolidayListResponse = z.infer<typeof HolidayListResponseSchema>;

/**
 * PUT /config/holidays — replaces the calendar for a given year (HRMS_API.md
 * § 12). Pass `year` and the full set of holiday rows for that year.
 */
export const ReplaceHolidaysRequestSchema = z.object({
  year: z.number().int().min(2000).max(2999),
  holidays: z
    .array(
      z.object({
        date: ISODateOnlySchema,
        name: z.string().min(1).max(120),
      }),
    )
    .max(100),
});
export type ReplaceHolidaysRequest = z.infer<typeof ReplaceHolidaysRequestSchema>;

export const ReplaceHolidaysResponseSchema = HolidayListResponseSchema;
export type ReplaceHolidaysResponse = z.infer<typeof ReplaceHolidaysResponseSchema>;
