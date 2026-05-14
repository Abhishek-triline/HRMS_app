/**
 * Payroll contract.
 *
 * v2: All IDs are INT; status fields are INT codes.
 * §3.5 payroll_run.status_id / payslip.status_id: 1=Draft, 2=Review, 3=Finalised, 4=Reversed.
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
  EmployeeCodeSchema,
  IdParamSchema,
  IdSchema,
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

// ── Run + payslip lifecycle (§3.5) ─────────────────────────────────────────

/** 1=Draft, 2=Review, 3=Finalised, 4=Reversed. */
export const PayrollRunStatusSchema = z.number().int().min(1).max(4);
/** 1=Draft, 2=Review, 3=Finalised, 4=Reversed. */
export const PayslipStatusSchema = z.number().int().min(1).max(4);

export const PayrollRunStatus = {
  Draft: 1,
  Review: 2,
  Finalised: 3,
  Reversed: 4,
} as const;
export type PayrollRunStatusValue =
  (typeof PayrollRunStatus)[keyof typeof PayrollRunStatus];

// ── Payroll run — full + summary ────────────────────────────────────────────

export const PayrollRunSchema = z.object({
  id: IdSchema,
  code: z.string(), // RUN-YYYY-MM
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2999),
  status: PayrollRunStatusSchema,
  workingDays: z.number().int().min(1).max(31),
  /** Effective dates of the period — server computes from month + year + holidays. */
  periodStart: ISODateOnlySchema,
  periodEnd: ISODateOnlySchema,
  initiatedBy: IdSchema,
  initiatedByName: z.string(),
  initiatedAt: ISODateSchema,
  finalisedBy: IdSchema.nullable(),
  finalisedByName: z.string().nullable(),
  finalisedAt: ISODateSchema.nullable(),
  reversedBy: IdSchema.nullable(),
  reversedByName: z.string().nullable(),
  reversedAt: ISODateSchema.nullable(),
  reversalReason: z.string().nullable(),
  /** Aggregate totals across all payslips, computed live from the rows. */
  employeeCount: z.number().int().min(0),
  totalGrossPaise: PaiseSchema,
  totalLopPaise: PaiseSchema,
  totalTaxPaise: PaiseSchema,
  totalNetPaise: PaiseSchema,
  /** Count of payslips with lopDays > 0 (BL-024). */
  lopCount: z.number().int().min(0),
  /** Count of mid-month joiners (workingDays < run.workingDays). */
  proRatedCount: z.number().int().min(0),
  /** Set on reversal records. Null on originals. */
  reversalOfRunId: IdSchema.nullable(),
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
  id: IdSchema,
  code: z.string(), // P-YYYY-MM-NNNN
  runId: IdSchema,
  runCode: z.string(),
  employeeId: IdSchema,
  employeeName: z.string(),
  employeeCode: EmployeeCodeSchema,
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
  /**
   * MONEY FIELDS — nullable for hardening (see canSeePayslipMoney). A
   * Manager viewing a subordinate's payslip gets these as null; Admin,
   * PayrollOfficer, and the employee themselves see real numbers.
   * Snapshot of the salary structure applied — taken from the latest
   * `effectiveFrom <= periodStart` (BL-030).
   */
  basicPaise: PaiseSchema.nullable(),
  allowancesPaise: PaiseSchema.nullable(),
  /** Pro-rated amount actually earned this period (BL-036). */
  grossPaise: PaiseSchema.nullable(),
  /** Loss of pay deduction (BL-035). */
  lopDeductionPaise: PaiseSchema.nullable(),
  /** Reference figure computed from `gross × standardRate` (BL-036a). */
  referenceTaxPaise: PaiseSchema.nullable(),
  /** Final tax — entered by PO during Review. Defaults to referenceTaxPaise. */
  finalTaxPaise: PaiseSchema.nullable(),
  /** Standard non-tax deductions (PF, professional tax, etc.). */
  otherDeductionsPaise: PaiseSchema.nullable(),
  /** Net pay = gross − lopDeduction − finalTax − otherDeductions. */
  netPayPaise: PaiseSchema.nullable(),
  finalisedAt: ISODateSchema.nullable(),
  /** Encashment days paid in this payslip (BL-LE-09). 0 if no encashment. */
  encashmentDays: z.number().int().min(0).default(0),
  /** Encashment amount in paise (BL-LE-08). Adds to gross — null when redacted. */
  encashmentPaise: z.number().int().min(0).nullable().default(0),
  /** FK to the encashment record paid in this payslip. Null for payslips without encashment. */
  encashmentId: IdSchema.nullable().default(null),
  /** Set on reversal records — links back to the original payslip. */
  reversalOfPayslipId: IdSchema.nullable(),
  /** Set on the original payslip when a reversal exists. */
  reversedByPayslipId: IdSchema.nullable(),
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
  status: z.coerce.number().int().min(1).max(4).optional(),
});
export type PayrollRunListQuery = z.infer<typeof PayrollRunListQuerySchema>;

export const PayrollRunListResponseSchema = z.object({
  data: z.array(PayrollRunSummarySchema),
  nextCursor: z.string().nullable(),
});
export type PayrollRunListResponse = z.infer<typeof PayrollRunListResponseSchema>;

// ── GET /payroll/runs/{id} ──────────────────────────────────────────────────

/**
 * Run detail returns only the run summary now. Payslips are fetched via the
 * paginated GET /payslips?runId=X endpoint so large runs don't ship 1000+
 * line items in one response. Aggregate totals + lopCount / proRatedCount
 * already live on the run.
 */
export const PayrollRunDetailResponseSchema = z.object({
  data: z.object({
    run: PayrollRunSchema,
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
  winnerId: IdSchema,
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
  employeeId: IdParamSchema.optional(),
  status: z.coerce.number().int().min(1).max(4).optional(),
  /** Filter to a single payroll run (BUG-PAY-004 fix). */
  runId: IdParamSchema.optional(),
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
 * parent run is `Review` (status=2). Recomputes net = gross − lop − finalTax − other.
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
  reversalRunId: IdSchema,
  reversalRunCode: z.string(),
  originalRunId: IdSchema,
  originalRunCode: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2999),
  reversedBy: IdSchema,
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
 * Gross-taxable-income basis — stored as Configuration key
 * `TAX_GROSS_TAXABLE_BASIS` (a JSON string value; not a DB enum/master).
 *
 * v1: stored + displayed but the payroll engine still uses `gross × rate`
 * unconditionally. The branch will be wired in v2 once the slab engine lands.
 */
export const GrossTaxableBasisSchema = z.enum([
  'GrossMinusStandardDeduction',
  'GrossFull',
  'BasicOnly',
]);
export type GrossTaxableBasis = z.infer<typeof GrossTaxableBasisSchema>;

/**
 * v1 — single configurable reference rate plus a (display-only) basis hint.
 * Configurable Indian slab engine is deferred to v2.
 */
export const TaxSettingsSchema = z.object({
  /** Decimal — e.g. 0.095 for 9.5 percent. The reference figure on every
      payslip is computed as `gross × referenceRate`. */
  referenceRate: z.number().min(0).max(1),
  /** Definition used to compute the reference figure. v1: display-only. */
  grossTaxableBasis: GrossTaxableBasisSchema,
  updatedBy: z.string().nullable(),
  updatedAt: ISODateSchema.nullable(),
});
export type TaxSettings = z.infer<typeof TaxSettingsSchema>;

export const TaxSettingsResponseSchema = z.object({
  data: TaxSettingsSchema,
});
export type TaxSettingsResponse = z.infer<typeof TaxSettingsResponseSchema>;

/**
 * PUT/PATCH body — both fields optional so the rate and basis can be saved
 * independently. At least one field is required.
 */
export const UpdateTaxSettingsRequestSchema = z
  .object({
    referenceRate: z.number().min(0).max(1).optional(),
    grossTaxableBasis: GrossTaxableBasisSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateTaxSettingsRequest = z.infer<typeof UpdateTaxSettingsRequestSchema>;

export const UpdateTaxSettingsResponseSchema = TaxSettingsResponseSchema;
export type UpdateTaxSettingsResponse = z.infer<typeof UpdateTaxSettingsResponseSchema>;
