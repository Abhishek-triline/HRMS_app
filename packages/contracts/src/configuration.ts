/**
 * Configuration contract.
 *
 * Configuration values live in the key/value `configurations` table (PK = key
 * string, value = JSON). The buckets below describe the structured JSON shape
 * for each key; the table has no enum or status columns of its own.
 *
 * v2: Cross-entity FK references (e.g. employmentTypeId) are INT. The
 * weekday tokens and tax-basis enums below are part of JSON payloads stored
 * in `configurations.value` — they are NOT DB columns, so they remain string
 * tokens (the schema v2 plan §3 only re-codes status/type columns on entity
 * tables, not JSON config values).
 *
 * Endpoints (docs/HRMS_API.md § 12):
 *   GET  /config/attendance   Admin only.
 *   PUT  /config/attendance   Admin only. Atomic upsert + audit.
 *   GET  /config/leave        Admin only.
 *   PUT  /config/leave        Admin only. Atomic upsert + audit.
 */

import { z } from 'zod';
import { LeaveTypeId } from './leave.js';

// ── Attendance config ────────────────────────────────────────────────────────

/**
 * Canonical weekday tokens (Mon..Sun). Used by weeklyOffDays.
 * Stored inside a JSON array in `configurations.value` — not a DB enum, so
 * we keep them as string tokens.
 */
export const WeekdaySchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export type Weekday = z.infer<typeof WeekdaySchema>;

/**
 * AttendanceConfig — values persisted as separate Configuration rows:
 *   ATTENDANCE_LATE_THRESHOLD_TIME   → "HH:MM" string (e.g. "10:30")
 *   ATTENDANCE_STANDARD_DAILY_HOURS  → integer 1..24
 *   ATTENDANCE_WEEKLY_OFF_DAYS       → JSON array of Weekday tokens (e.g. ["Sat","Sun"])
 *   ATTENDANCE_UNDO_WINDOW_MINUTES   → integer 0..60 (0 disables undo)
 *
 * Default values (BL-027 + Indian 5-day work-week standard):
 *   lateThresholdTime  = "10:30"
 *   standardDailyHours = 8
 *   weeklyOffDays      = ["Sat", "Sun"]
 *   undoWindowMinutes  = 5
 */
export const AttendanceConfigSchema = z.object({
  /** HH:MM 24-hour format. Default "10:30". */
  lateThresholdTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM (24-hour)')
    .refine(
      (v) => {
        const [h, m] = v.split(':').map(Number);
        return (h ?? -1) >= 0 && (h ?? -1) <= 23 && (m ?? -1) >= 0 && (m ?? -1) <= 59;
      },
      { message: 'Invalid time — hour must be 00-23, minute 00-59' },
    ),
  /** Integer hours per working day. Range 1–24. Default 8. */
  standardDailyHours: z.number().int().min(1).max(24),
  /**
   * Weekday tokens that are weekly-off days for all employees.
   * Used by BL-026 status derivation (Holiday/WeeklyOff override) and by leave
   * working-day counts. Default ['Sat', 'Sun'] — the Indian 5-day work-week.
   * Duplicates are tolerated by the schema but the API deduplicates on write.
   */
  weeklyOffDays: z.array(WeekdaySchema).max(7).default(['Sat', 'Sun']),
  /**
   * Grace window after check-out within which an employee may undo it (and
   * return to the "Working" state). Default 5 minutes. Set to 0 to disable
   * undo entirely — every check-out is final and any correction must go
   * through a regularisation request.
   */
  undoWindowMinutes: z.number().int().min(0).max(60),
});
export type AttendanceConfig = z.infer<typeof AttendanceConfigSchema>;

export const AttendanceConfigResponseSchema = z.object({
  data: AttendanceConfigSchema,
});
export type AttendanceConfigResponse = z.infer<typeof AttendanceConfigResponseSchema>;

/** PUT body — all fields optional so the client can update just one. */
export const UpdateAttendanceConfigSchema = AttendanceConfigSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field must be provided' },
);
export type UpdateAttendanceConfig = z.infer<typeof UpdateAttendanceConfigSchema>;

// ── Leave config ─────────────────────────────────────────────────────────────

/**
 * LeaveConfig — values persisted as four separate Configuration rows:
 *   LEAVE_CARRY_FORWARD_CAPS      → Record<leaveTypeId, number> JSON object
 *   LEAVE_ESCALATION_PERIOD_DAYS  → integer 1..30
 *   LEAVE_MATERNITY_DAYS          → integer (default 182 = 26 weeks)
 *   LEAVE_PATERNITY_DAYS          → integer (default 10 working days)
 *
 * Default values (Phase 2 hard-coded constants):
 *   escalationPeriodDays  = 5   (BL-018)
 *   maternityDays         = 182 (BL-015: 26 weeks)
 *   paternityDays         = 10  (BL-016: 10 working days)
 *   carryForwardCaps      = { 1: 10, 2: 0, 3: 5, 4: 0, 5: 0, 6: 0 }
 *
 * Keys here are the FROZEN leave_types.id values (1=Annual, 2=Sick, 3=Casual,
 * 4=Unpaid, 5=Maternity, 6=Paternity — see HRMS_Schema_v2_Plan §2). Sick /
 * Unpaid / event-based types are constrained to 0 by BL-012 / BL-014.
 */
export const CarryForwardCapsSchema = z.object({
  [LeaveTypeId.Annual]:    z.number().int().min(0).max(365),
  [LeaveTypeId.Sick]:      z.number().int().min(0).max(0), // always 0 — BL-012
  [LeaveTypeId.Casual]:    z.number().int().min(0).max(365),
  [LeaveTypeId.Unpaid]:    z.number().int().min(0).max(0), // always 0
  [LeaveTypeId.Maternity]: z.number().int().min(0).max(0), // event-based — BL-014
  [LeaveTypeId.Paternity]: z.number().int().min(0).max(0), // event-based — BL-014
});
export type CarryForwardCaps = z.infer<typeof CarryForwardCapsSchema>;

export const LeaveConfigSchema = z.object({
  /**
   * Per-leaveTypeId carry-forward cap. Sick/Unpaid/event-based slots must be
   * 0 (BL-012 / BL-014). Annual and Casual caps are configurable.
   */
  carryForwardCaps: CarryForwardCapsSchema,
  /** Working days before a Pending leave escalates to Admin (BL-018). Range 1-30. Default 5. */
  escalationPeriodDays: z.number().int().min(1).max(30),
  /** Calendar days per Maternity event (BL-015). Default 182 (26 weeks). */
  maternityDays: z.number().int().min(1).max(730),
  /** Working days per Paternity event (BL-016). Default 10. */
  paternityDays: z.number().int().min(1).max(90),
});
export type LeaveConfig = z.infer<typeof LeaveConfigSchema>;

export const LeaveConfigResponseSchema = z.object({
  data: LeaveConfigSchema,
});
export type LeaveConfigResponse = z.infer<typeof LeaveConfigResponseSchema>;

/** PUT body — all fields optional so the client can update just one bucket. */
export const UpdateLeaveConfigSchema = z
  .object({
    carryForwardCaps: CarryForwardCapsSchema.partial().optional(),
    escalationPeriodDays: z.number().int().min(1).max(30).optional(),
    maternityDays: z.number().int().min(1).max(730).optional(),
    paternityDays: z.number().int().min(1).max(90).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });
export type UpdateLeaveConfig = z.infer<typeof UpdateLeaveConfigSchema>;

// ── Leave Encashment config keys ─────────────────────────────────────────────

/**
 * EncashmentConfig — values persisted as four separate Configuration rows:
 *   ENCASHMENT_WINDOW_START_MONTH  → integer 1-12 (default 12 = December)
 *   ENCASHMENT_WINDOW_END_MONTH    → integer 1-12 (default 1 = January)
 *   ENCASHMENT_WINDOW_END_DAY      → integer 1-31 (default 15)
 *   ENCASHMENT_MAX_PERCENT         → integer 1-100 (default 50)
 */
export const EncashmentConfigSchema = z.object({
  /** Month (1-12) in which the encashment request window opens. Default 12. */
  windowStartMonth: z.number().int().min(1).max(12),
  /** Month (1-12) in which the encashment request window closes. Default 1. */
  windowEndMonth: z.number().int().min(1).max(12),
  /** Day of windowEndMonth at which the window closes. Default 15. */
  windowEndDay: z.number().int().min(1).max(31),
  /** Maximum encashable percentage of remaining balance. Default 50. */
  maxPercent: z.number().int().min(1).max(100),
});
export type EncashmentConfig = z.infer<typeof EncashmentConfigSchema>;

export const EncashmentConfigResponseSchema = z.object({
  data: EncashmentConfigSchema,
});
export type EncashmentConfigResponse = z.infer<typeof EncashmentConfigResponseSchema>;
