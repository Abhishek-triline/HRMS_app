/**
 * Attendance & Regularisation contract — Phase 3.
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
 *           On-Leave > Weekly-Off / Holiday > Present > Absent.
 *   BL-027  Late mark = check-in after configured threshold (default 10:30).
 *   BL-028  3 late marks in a calendar month → 1 full day deducted from
 *           Annual leave. Each subsequent late = another full day.
 *   BL-029  Regularisation routing: ≤7d → reporting Manager; >7d → Admin.
 */

import { z } from 'zod';
import {
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  VersionSchema,
} from './common.js';

// ── Status & source ─────────────────────────────────────────────────────────

/** Five derived states per BL-026 (priority: top → bottom). */
export const AttendanceStatusSchema = z.enum([
  'Present',
  'Absent',
  'On-Leave',
  'Weekly-Off',
  'Holiday',
]);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

/**
 * Records are stamped at creation by `system` (the midnight job, the check-in,
 * an approved regularisation that overlays a corrected entry). The original
 * row is never mutated; corrections append a new row with `source =
 * regularisation` and `regularisationId` populated (BL-007 / BL-047).
 */
export const AttendanceSourceSchema = z.enum(['system', 'regularisation']);
export type AttendanceSource = z.infer<typeof AttendanceSourceSchema>;

// ── Attendance record — full + summary ──────────────────────────────────────

export const AttendanceRecordSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: ISODateOnlySchema,
  status: AttendanceStatusSchema,
  checkInTime: ISODateSchema.nullable(),
  checkOutTime: ISODateSchema.nullable(),
  /** Computed by server: (checkOut − checkIn) in milliseconds, exposed as minutes. */
  hoursWorkedMinutes: z.number().int().min(0).nullable(),
  late: z.boolean(),
  /** Cumulative late count for the calendar month at the point this row was last written. */
  lateMonthCount: z.number().int().min(0),
  /** True for unauthorised Absent days that incur LOP at payroll time. */
  lopApplied: z.boolean(),
  source: AttendanceSourceSchema,
  /** Set when source = "regularisation" — links back to the approving request. */
  regularisationId: z.string().nullable(),
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
  status: AttendanceStatusSchema.optional(),
  /** Manager / Admin filter — restrict to a specific employee. */
  employeeId: z.string().optional(),
  /** Admin-only filter for the org-wide view. */
  department: z.string().optional(),
  /** Optional "single day" shortcut. If supplied, `from` and `to` are ignored. */
  date: ISODateOnlySchema.optional(),
});
export type AttendanceListQuery = z.infer<typeof AttendanceListQuerySchema>;

/** Calendar-style payload — used by E-05 and the manager / admin grids. */
export const AttendanceListResponseSchema = z.object({
  data: z.array(
    AttendanceCalendarItemSchema.extend({
      employeeId: z.string(),
      employeeName: z.string().optional(),
      employeeCode: z.string().optional(),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type AttendanceListResponse = z.infer<typeof AttendanceListResponseSchema>;

/** Today's status for the check-in panel — used by GET /attendance/me?date=today. */
export const TodayAttendanceResponseSchema = z.object({
  data: z.object({
    record: AttendanceRecordSchema.nullable(),
    /** "Ready" → no check-in yet; "Working" → checked in; "Confirm" → checked out. */
    panelState: z.enum(['Ready', 'Working', 'Confirm']),
    lateThreshold: z.string(), // "HH:MM" from configuration (BL-027)
    standardDailyHours: z.number().int().positive(), // BL-025a (display only)
    /** Late count for the current calendar month (TC-ATT-008/009 / BL-028). */
    lateMonthCount: z.number().int().min(0),
  }),
});
export type TodayAttendanceResponse = z.infer<typeof TodayAttendanceResponseSchema>;

// ── Regularisation status & routing ─────────────────────────────────────────

export const RegStatusSchema = z.enum(['Pending', 'Approved', 'Rejected']);
export type RegStatus = z.infer<typeof RegStatusSchema>;

export const RegRoutedToSchema = z.enum(['Manager', 'Admin']);
export type RegRoutedTo = z.infer<typeof RegRoutedToSchema>;

// ── Regularisation request — full + summary ─────────────────────────────────

export const RegularisationRequestSchema = z.object({
  id: z.string(),
  code: z.string(), // R-YYYY-NNNN
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  /** The date being corrected (always in the past). */
  date: ISODateOnlySchema,
  proposedCheckIn: ISODateSchema.nullable(),
  proposedCheckOut: ISODateSchema.nullable(),
  reason: z.string(),
  status: RegStatusSchema,
  routedTo: RegRoutedToSchema,
  /** Captured at submit time so re-routing later doesn't change the audit trail. */
  ageDaysAtSubmit: z.number().int().min(0),
  approverId: z.string().nullable(),
  approverName: z.string().nullable(),
  decidedAt: ISODateSchema.nullable(),
  decidedBy: z.string().nullable(),
  decisionNote: z.string().nullable(),
  /** Link to the corrected attendance row created on approval (BL-026). */
  correctedRecordId: z.string().nullable(),
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
  routedTo: true,
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
  status: RegStatusSchema.optional(),
  routedTo: RegRoutedToSchema.optional(),
  employeeId: z.string().optional(),
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
  id: z.string(),
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
