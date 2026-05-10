/**
 * Payroll contract — Phase 4.
 *
 * Endpoints (docs/HRMS_API.md § 8):
 *   POST /payroll/runs                              A-12 / P-03   Admin / PO
 *   GET  /payroll/runs                              A-11 / P-02   Admin / PO
 *   GET  /payroll/runs/{id}                         A-13 / P-04   Admin / PO
 *   POST /payroll/runs/{id}/finalise                A-14 / P-05   Admin / PO  (two-step + BL-034 guard)
 *   POST /payroll/runs/{id}/reverse                 A-15          Admin only  (BL-033)
 *   GET  /payslips                                  E-08 / payslip.html
 *   GET  /payslips/{id}                             E-09 / payslip.html
 *   PATCH /payslips/{id}/tax                        P-04 / UC-014  PO  (Review state only)
 *   GET  /payslips/{id}/pdf                         E-08          server-rendered
 *
 * Business rules enforced server-side:
 *   BL-030  Salary structure changes apply from NEXT payroll run only.
 *           Past runs are unaffected.
 *   BL-031  Finalised payslip is IMMUTABLE — cannot be edited by anyone.
 *   BL-032  Reversal creates a NEW reversal record; original never modified.
 *   BL-033  Only Admin can initiate a reversal.
 *   BL-034  Concurrent finalisation: exactly one succeeds; the other fails
 *           gracefully with `409 RUN_ALREADY_FINALISED` carrying the
 *           winner's name + timestamp.
 *   BL-035  LOP formula: (Basic + Allowances) ÷ workingDays × LOPDays.
 *   BL-036  Mid-month joiner / exit: salary pro-rated on days actually worked.
 *   BL-036a v1: PayrollOfficer enters tax manually per payslip. The system
 *           shows a reference figure (gross taxable × flat rate) but the
 *           value is editable until the run is finalised.
 *   BL-003  Indian fiscal calendar — April–March. Not configurable.
 */

import { z } from 'zod';
import {
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  VersionSchema,
} from './common.js';

// ── Money in paise ──────────────────────────────────────────────────────────

/**
 * All money values stored as integer paise (₹1 = 100 paise) to avoid float
 * drift. Cap kept generous (≤100 cr per line item).
 */
const PaiseSchema = z.number().int().nonnegative().max(1_00_00_00_00 * 100);

// ── Run + payslip lifecycle ─────────────────────────────────────────────────

export const PayrollRunStatusSchema = z.enum(['Draft', 'Review', 'Finalised', 'Reversed']);
export type PayrollRunStatus = z.infer<typeof PayrollRunStatusSchema>;

export const PayslipStatusSchema = z.enum(['Draft', 'Review', 'Finalised', 'Reversed']);
export type PayslipStatus = z.infer<typeof PayslipStatusSchema>;

// ── Payroll run — full + summary ────────────────────────────────────────────

export const PayrollRunSchema = z.object({
  id: z.string(),
  code: z.string(), // RUN-YYYY-MM
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2999),
  status: PayrollRunStatusSchema,
  workingDays: z.number().int().min(1).max(31),
  /** Effective dates of the period — server computes from month + year + holidays. */
  periodStart: ISODateOnlySchema,
  periodEnd: ISODateOnlySchema,
  initiatedBy: z.string(),
  initiatedByName: z.string(),
  initiatedAt: ISODateSchema,
  finalisedBy: z.string().nullable(),
  finalisedByName: z.string().nullable(),
  finalisedAt: ISODateSchema.nullable(),
  reversedBy: z.string().nullable(),
  reversedByName: z.string().nullable(),
  reversedAt: ISODateSchema.nullable(),
  reversalReason: z.string().nullable(),
  /** Aggregate totals across all payslips, computed live from the rows. */
  employeeCount: z.number().int().min(0),
  totalGrossPaise: PaiseSchema,
  totalLopPaise: PaiseSchema,
  totalTaxPaise: PaiseSchema,
  totalNetPaise: PaiseSchema,
  /** Set on reversal records. Null on originals. */
  reversalOfRunId: z.string().nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type PayrollRun = z.infer<typeof PayrollRunSchema>;

export const PayrollRunSummarySchema = PayrollRunSchema.pick({
  id: true,
  code: true,
  month: true,
  year: true,
  status: true,
  initiatedByName: true,
  finalisedAt: true,
  employeeCount: true,
  totalGrossPaise: true,
  totalNetPaise: true,
  reversalOfRunId: true,
  createdAt: true,
});
export type PayrollRunSummary = z.infer<typeof PayrollRunSummarySchema>;

// ── Payslip — full + summary ────────────────────────────────────────────────

export const PayslipSchema = z.object({
  id: z.string(),
  code: z.string(), // P-YYYY-MM-NNNN
  runId: z.string(),
  runCode: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  designation: z.string().nullable(),
  department: z.string().nullable(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2999),
  status: PayslipStatusSchema,
  /** Pay period boundaries — usually the run's period; may differ on a reversal record. */
  periodStart: ISODateOnlySchema,
  periodEnd: ISODateOnlySchema,
  workingDays: z.number().int().min(0).max(31),
  /** Days actually worked — used for proration on mid-month joiners/exits (BL-036). */
  daysWorked: z.number().int().min(0).max(31),
  lopDays: z.number().int().min(0).max(31),
  /** Snapshot of the salary structure applied — taken from the latest
      `effectiveFrom <= periodStart` (BL-030). */
  basicPaise: PaiseSchema,
  allowancesPaise: PaiseSchema,
  /** Pro-rated amount actually earned this period (BL-036). */
  grossPaise: PaiseSchema,
  /** Loss of pay deduction (BL-035). */
  lopDeductionPaise: PaiseSchema,
  /** Reference figure computed from `gross × standardRate` (BL-036a). */
  referenceTaxPaise: PaiseSchema,
  /** Final tax — entered by PO during Review. Defaults to referenceTaxPaise. */
  finalTaxPaise: PaiseSchema,
  /** Standard non-tax deductions (PF, professional tax, etc.). */
  otherDeductionsPaise: PaiseSchema,
  /** Net pay = gross − lopDeduction − finalTax − otherDeductions. */
  netPayPaise: PaiseSchema,
  finalisedAt: ISODateSchema.nullable(),
  /** Set on reversal records — links back to the original payslip. */
  reversalOfPayslipId: z.string().nullable(),
  /** Set on the original payslip when a reversal exists. */
  reversedByPayslipId: z.string().nullable(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type Payslip = z.infer<typeof PayslipSchema>;

export const PayslipSummarySchema = PayslipSchema.pick({
  id: true,
  code: true,
  runId: true,
  employeeId: true,
  employeeName: true,
  employeeCode: true,
  month: true,
  year: true,
  status: true,
  workingDays: true,
  lopDays: true,
  grossPaise: true,
  finalTaxPaise: true,
  netPayPaise: true,
  finalisedAt: true,
  reversalOfPayslipId: true,
});
export type PayslipSummary = z.infer<typeof PayslipSummarySchema>;

// ── POST /payroll/runs (initiate) ───────────────────────────────────────────

export const CreatePayrollRunRequestSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2999),
  /** Optional override; default = working days computed from holidays + weekends. */
  workingDays: z.number().int().min(1).max(31).optional(),
});
export type CreatePayrollRunRequest = z.infer<typeof CreatePayrollRunRequestSchema>;

export const CreatePayrollRunResponseSchema = z.object({
  data: z.object({
    run: PayrollRunSchema,
    payslipCount: z.number().int().min(0),
  }),
});
export type CreatePayrollRunResponse = z.infer<typeof CreatePayrollRunResponseSchema>;

// ── GET /payroll/runs ───────────────────────────────────────────────────────

export const PayrollRunListQuerySchema = PaginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2999).optional(),
  status: PayrollRunStatusSchema.optional(),
});
export type PayrollRunListQuery = z.infer<typeof PayrollRunListQuerySchema>;

export const PayrollRunListResponseSchema = z.object({
  data: z.array(PayrollRunSummarySchema),
  nextCursor: z.string().nullable(),
});
export type PayrollRunListResponse = z.infer<typeof PayrollRunListResponseSchema>;

// ── GET /payroll/runs/{id} ──────────────────────────────────────────────────

export const PayrollRunDetailResponseSchema = z.object({
  data: z.object({
    run: PayrollRunSchema,
    payslips: z.array(PayslipSummarySchema),
  }),
});
export type PayrollRunDetailResponse = z.infer<typeof PayrollRunDetailResponseSchema>;

// ── POST /payroll/runs/{id}/finalise ────────────────────────────────────────

/**
 * BL-034: two-step confirmation. Client must POST with `confirm: "FINALISE"`
 * (literal, case-sensitive) — typing the word in the UI proves intent.
 *
 * Concurrent guard: server takes a row lock on the run + status check inside
 * a transaction. If another caller already won, returns 409
 * `RUN_ALREADY_FINALISED` with `details.winnerName` and `details.winnerAt`.
 */
export const FinaliseRunRequestSchema = z.object({
  confirm: z.literal('FINALISE'),
  version: VersionSchema,
});
export type FinaliseRunRequest = z.infer<typeof FinaliseRunRequestSchema>;

export const FinaliseRunResponseSchema = z.object({
  data: z.object({
    run: PayrollRunSchema,
  }),
});
export type FinaliseRunResponse = z.infer<typeof FinaliseRunResponseSchema>;

/** Carried in `error.details` when BL-034 fires on the losing caller. */
export const RunAlreadyFinalisedDetailsSchema = z.object({
  winnerId: z.string(),
  winnerName: z.string(),
  winnerAt: ISODateSchema,
});
export type RunAlreadyFinalisedDetails = z.infer<typeof RunAlreadyFinalisedDetailsSchema>;

// ── POST /payroll/runs/{id}/reverse (Admin only) ────────────────────────────

export const ReverseRunRequestSchema = z.object({
  /** Required — must clearly state why. Audit-logged. */
  reason: z.string().min(10).max(2000),
  /** Two-step confirmation token mirroring finalise. */
  confirm: z.literal('REVERSE'),
});
export type ReverseRunRequest = z.infer<typeof ReverseRunRequestSchema>;

export const ReverseRunResponseSchema = z.object({
  data: z.object({
    /** The newly created reversal run. The original is still untouched. */
    reversalRun: PayrollRunSchema,
    /** Reversal payslip count. */
    payslipCount: z.number().int().min(0),
  }),
});
export type ReverseRunResponse = z.infer<typeof ReverseRunResponseSchema>;

// ── GET /payslips ───────────────────────────────────────────────────────────

export const PayslipListQuerySchema = PaginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2999).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  employeeId: z.string().optional(),
  status: PayslipStatusSchema.optional(),
  /** Filter to a single payroll run (BUG-PAY-004 fix). */
  runId: z.string().optional(),
  /** Filter to reversal records only (or originals only). */
  isReversal: z.coerce.boolean().optional(),
});
export type PayslipListQuery = z.infer<typeof PayslipListQuerySchema>;

export const PayslipListResponseSchema = z.object({
  data: z.array(PayslipSummarySchema),
  nextCursor: z.string().nullable(),
});
export type PayslipListResponse = z.infer<typeof PayslipListResponseSchema>;

// ── GET /payslips/{id} ──────────────────────────────────────────────────────

export const PayslipDetailResponseSchema = z.object({
  data: PayslipSchema,
});
export type PayslipDetailResponse = z.infer<typeof PayslipDetailResponseSchema>;

// ── PATCH /payslips/{id}/tax ────────────────────────────────────────────────

/**
 * BL-036a — only PO (and Admin) can edit the final tax, only while the
 * parent run is `Review`. Recomputes net = gross − lop − finalTax − other.
 */
export const UpdatePayslipTaxRequestSchema = z.object({
  finalTaxPaise: PaiseSchema,
  version: VersionSchema,
});
export type UpdatePayslipTaxRequest = z.infer<typeof UpdatePayslipTaxRequestSchema>;

export const UpdatePayslipTaxResponseSchema = PayslipDetailResponseSchema;
export type UpdatePayslipTaxResponse = z.infer<typeof UpdatePayslipTaxResponseSchema>;

// ── Reversal history (A-24 / P-07) ──────────────────────────────────────────

export const ReversalHistoryItemSchema = z.object({
  reversalRunId: z.string(),
  reversalRunCode: z.string(),
  originalRunId: z.string(),
  originalRunCode: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2999),
  reversedBy: z.string(),
  reversedByName: z.string(),
  reversedAt: ISODateSchema,
  reason: z.string(),
  affectedEmployees: z.number().int().min(0),
  netAdjustmentPaise: z.number().int(), // negative for reversals (paid-back)
});
export type ReversalHistoryItem = z.infer<typeof ReversalHistoryItemSchema>;

export const ReversalHistoryResponseSchema = z.object({
  data: z.array(ReversalHistoryItemSchema),
  nextCursor: z.string().nullable(),
});
export type ReversalHistoryResponse = z.infer<typeof ReversalHistoryResponseSchema>;

// ── Tax settings (A-17) ─────────────────────────────────────────────────────

/**
 * v1 — single configurable reference rate. Configurable Indian slab engine
 * is deferred to v2.
 */
export const TaxSettingsSchema = z.object({
  /** Decimal — e.g. 0.095 for 9.5 percent. The reference figure on every
      payslip is computed as `gross × referenceRate`. */
  referenceRate: z.number().min(0).max(1),
  updatedBy: z.string().nullable(),
  updatedAt: ISODateSchema.nullable(),
});
export type TaxSettings = z.infer<typeof TaxSettingsSchema>;

export const TaxSettingsResponseSchema = z.object({
  data: TaxSettingsSchema,
});
export type TaxSettingsResponse = z.infer<typeof TaxSettingsResponseSchema>;

export const UpdateTaxSettingsRequestSchema = z.object({
  referenceRate: z.number().min(0).max(1),
});
export type UpdateTaxSettingsRequest = z.infer<typeof UpdateTaxSettingsRequestSchema>;

export const UpdateTaxSettingsResponseSchema = TaxSettingsResponseSchema;
export type UpdateTaxSettingsResponse = z.infer<typeof UpdateTaxSettingsResponseSchema>;
