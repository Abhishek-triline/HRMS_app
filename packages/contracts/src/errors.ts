/**
 * Named error codes — canonical catalog from docs/HRMS_API.md § 13.
 * Backend MUST emit one of these codes; frontend MUST map UI copy from this set.
 * No generic validation error for the leave/regularisation conflicts (BL-010, DN-19).
 */

import { z } from 'zod';

export const ErrorCode = {
  // Generic / transport
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_OWNER: 'NOT_OWNER',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Auth
  LOCKED: 'LOCKED', // 423 — 5-strikes lockout
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  PASSWORD_RESET_REQUIRED: 'PASSWORD_RESET_REQUIRED',

  // Concurrency
  VERSION_MISMATCH: 'VERSION_MISMATCH',

  // Leave (BL-009 / BL-010 / BL-014)
  LEAVE_OVERLAP: 'LEAVE_OVERLAP',
  LEAVE_REG_CONFLICT: 'LEAVE_REG_CONFLICT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  // Self-apply guardrails: past-date / same-day-after-check-in / year-cross
  LEAVE_FROM_DATE_IN_PAST: 'LEAVE_FROM_DATE_IN_PAST',
  LEAVE_SAME_DAY_ALREADY_CHECKED_IN: 'LEAVE_SAME_DAY_ALREADY_CHECKED_IN',
  LEAVE_CROSSES_YEAR_BOUNDARY: 'LEAVE_CROSSES_YEAR_BOUNDARY',

  // Payroll (BL-031 / BL-034)
  RUN_ALREADY_FINALISED: 'RUN_ALREADY_FINALISED',
  // SEC-P8-007: DB unique constraint fallback for concurrent run creates
  RUN_ALREADY_EXISTS: 'RUN_ALREADY_EXISTS',
  PAYSLIP_IMMUTABLE: 'PAYSLIP_IMMUTABLE',

  // Performance (BL-041)
  CYCLE_CLOSED: 'CYCLE_CLOSED',
  CYCLE_PHASE: 'CYCLE_PHASE',

  // Hierarchy
  CIRCULAR_REPORTING: 'CIRCULAR_REPORTING',

  // Attendance undo (check-out reversal)
  UNDO_WINDOW_EXPIRED: 'UNDO_WINDOW_EXPIRED',
  UNDO_OUTSIDE_DAY: 'UNDO_OUTSIDE_DAY',

  // Regularisation duplicate — another reg already exists for the same
  // (employee, date), either Pending or already Approved. Surfaces on
  // submit (blocks the duplicate up-front) and on approve (graceful 409
  // instead of a P2002 unique-constraint 500 when the date's overlay slot
  // is already taken by another reg).
  REGULARISATION_DUPLICATE: 'REGULARISATION_DUPLICATE',

  // Leave Encashment (BL-LE-01..14)
  ENCASHMENT_OUT_OF_WINDOW: 'ENCASHMENT_OUT_OF_WINDOW',
  ENCASHMENT_ALREADY_USED: 'ENCASHMENT_ALREADY_USED',
  ENCASHMENT_INSUFFICIENT_BALANCE: 'ENCASHMENT_INSUFFICIENT_BALANCE',
  ENCASHMENT_INVALID_LEAVE_TYPE: 'ENCASHMENT_INVALID_LEAVE_TYPE',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard error envelope returned by every API failure.
 * Matches docs/HRMS_API.md § 13 exactly.
 */
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    ruleId: z.string().optional(), // e.g. "BL-009"
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/**
 * Convenience helper for creating envelopes server-side.
 * Use this — never inline an object literal — to keep shape stable.
 */
export function errorEnvelope(
  code: ErrorCodeValue | string,
  message: string,
  options: { details?: Record<string, unknown>; ruleId?: string } = {},
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      ...(options.details ? { details: options.details } : {}),
      ...(options.ruleId ? { ruleId: options.ruleId } : {}),
    },
  };
}
