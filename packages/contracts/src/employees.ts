/**
 * Employees & Hierarchy contract — Phase 1.
 *
 * Endpoints (docs/HRMS_API.md § 5):
 *   POST   /employees                              UC-001  Admin only
 *   GET    /employees                              A-02    Admin / Manager (scoped)
 *   GET    /employees/{id}                         A-04    Admin / Manager-team / SELF
 *   PATCH  /employees/{id}                         A-04    Admin only
 *   PATCH  /employees/{id}/salary                  D-04    Admin only — applies next run (BL-030)
 *   POST   /employees/{id}/status                  A-05    Admin only — On-Notice / Exited (BL-006)
 *   POST   /employees/{id}/reassign-manager        UC-003  Admin only — circular check (BL-005)
 *   GET    /employees/{id}/team                    M-02    Manager-own / Admin
 *   GET    /employees/{id}/profile                 profile SELF / Admin (read-only)
 *
 * Rules:
 *   BL-005  No circular reporting chains
 *   BL-006  Status transitions (Active / On-Notice / Exited manual; On-Leave system-set)
 *   BL-007  Historical records never deleted
 *   BL-008  EMP code never reused (re-joiner gets a new code)
 *   BL-022  Pending approvals stay with previous manager; Admin if exited
 *   BL-022a Past team members surface separately for the previous manager
 *   BL-030  Salary edits apply from next payroll run only
 */

import { z } from 'zod';
import {
  EmployeeCodeSchema,
  EmployeeStatusSchema,
  EmploymentTypeSchema,
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  RoleSchema,
  VersionSchema,
} from './common.js';

// ── Salary structure ────────────────────────────────────────────────────────

/**
 * Money is stored as integer paise to avoid float drift (per HRMS_API.md § 1).
 * UI formats with Intl.NumberFormat('en-IN'); never display paise to users.
 */
const PaiseSchema = z.number().int().nonnegative().max(1_00_00_00_00 * 100); // ≤ 100 cr

export const SalaryStructureSchema = z.object({
  basic_paise: PaiseSchema,
  allowances_paise: PaiseSchema,
  effectiveFrom: ISODateOnlySchema,
});
export type SalaryStructure = z.infer<typeof SalaryStructureSchema>;

// ── Employee — full + summary forms ─────────────────────────────────────────

/**
 * Detail shape — returned by GET /employees/{id}, PATCH /employees/{id},
 * and the profile endpoint. Includes salary only for Admin / SELF.
 */
export const EmployeeDetailSchema = z.object({
  id: z.string(),
  code: EmployeeCodeSchema,
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  status: EmployeeStatusSchema,
  department: z.string().nullable(),
  designation: z.string().nullable(),
  employmentType: EmploymentTypeSchema,
  reportingManagerId: z.string().nullable(),
  reportingManagerName: z.string().nullable(),
  reportingManagerCode: EmployeeCodeSchema.nullable(),
  joinDate: ISODateOnlySchema,
  exitDate: ISODateOnlySchema.nullable(),
  /** Present when caller is Admin or SELF; null/absent for Manager-of-team views. */
  salaryStructure: SalaryStructureSchema.nullable(),
  mustResetPassword: z.boolean(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  version: VersionSchema,
});
export type EmployeeDetail = z.infer<typeof EmployeeDetailSchema>;

/** Summary shape — used in directory lists and team rosters. */
export const EmployeeListItemSchema = z.object({
  id: z.string(),
  code: EmployeeCodeSchema,
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  status: EmployeeStatusSchema,
  department: z.string().nullable(),
  designation: z.string().nullable(),
  employmentType: EmploymentTypeSchema,
  reportingManagerName: z.string().nullable(),
  joinDate: ISODateOnlySchema,
});
export type EmployeeListItem = z.infer<typeof EmployeeListItemSchema>;

// ── POST /employees ─────────────────────────────────────────────────────────

/**
 * Employee names must not contain control characters or newlines (SEC-002-P1).
 * Allows letters, marks, digits, spaces, dots, hyphens, apostrophes, and
 * common punctuation that legitimate names use.
 */
const employeeNameSchema = z
  .string()
  .min(2)
  .max(200)
  .regex(/^[^\x00-\x08\x0A-\x1F\x7F]*$/u, 'Name must not contain control characters');

export const CreateEmployeeRequestSchema = z.object({
  name: employeeNameSchema,
  email: z.string().email(),
  role: RoleSchema,
  department: z.string().min(1).max(100),
  designation: z.string().min(1).max(150),
  employmentType: EmploymentTypeSchema,
  /** May be null — Admin or top-of-tree employees report to no-one (BL-017). */
  reportingManagerId: z.string().nullable(),
  joinDate: ISODateOnlySchema,
  salaryStructure: SalaryStructureSchema,
});
export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequestSchema>;

export const CreateEmployeeResponseSchema = z.object({
  data: z.object({
    employee: EmployeeDetailSchema,
    /** First-login link sent via email; never echoed in production logs. */
    invitationSent: z.boolean(),
  }),
});
export type CreateEmployeeResponse = z.infer<typeof CreateEmployeeResponseSchema>;

// ── GET /employees ──────────────────────────────────────────────────────────

export const EmployeeListQuerySchema = PaginationQuerySchema.extend({
  status: EmployeeStatusSchema.optional(),
  role: RoleSchema.optional(),
  department: z.string().optional(),
  employmentType: EmploymentTypeSchema.optional(),
  managerId: z.string().optional(),
  q: z.string().optional(),
  /** Default sort — name ascending. */
  sort: z.string().optional(),
});
export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

export const EmployeeListResponseSchema = z.object({
  data: z.array(EmployeeListItemSchema),
  nextCursor: z.string().nullable(),
});
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>;

// ── GET /employees/{id} ─────────────────────────────────────────────────────

export const EmployeeDetailResponseSchema = z.object({
  data: EmployeeDetailSchema,
});
export type EmployeeDetailResponse = z.infer<typeof EmployeeDetailResponseSchema>;

// ── PATCH /employees/{id} ───────────────────────────────────────────────────

/**
 * Partial profile + hierarchy edit. Status flips and salary changes use
 * dedicated endpoints. `email` and `code` are immutable post-creation.
 */
export const UpdateEmployeeRequestSchema = z.object({
  name: employeeNameSchema.optional(),
  role: RoleSchema.optional(),
  department: z.string().min(1).max(100).optional(),
  designation: z.string().min(1).max(150).optional(),
  employmentType: EmploymentTypeSchema.optional(),
  joinDate: ISODateOnlySchema.optional(),
  /** Optimistic concurrency token — required (HRMS_API.md § 1). */
  version: VersionSchema,
});
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequestSchema>;

export const UpdateEmployeeResponseSchema = EmployeeDetailResponseSchema;
export type UpdateEmployeeResponse = z.infer<typeof UpdateEmployeeResponseSchema>;

// ── PATCH /employees/{id}/salary ────────────────────────────────────────────

export const UpdateSalaryRequestSchema = SalaryStructureSchema.extend({
  version: VersionSchema,
});
export type UpdateSalaryRequest = z.infer<typeof UpdateSalaryRequestSchema>;

export const UpdateSalaryResponseSchema = EmployeeDetailResponseSchema;
export type UpdateSalaryResponse = z.infer<typeof UpdateSalaryResponseSchema>;

// ── POST /employees/{id}/status ─────────────────────────────────────────────

/**
 * Manual status transitions only — Admin sets On-Notice or Exited.
 * On-Leave is system-set automatically while approved leave is in progress
 * and reverts to Active when the leave ends (BL-006).
 * Active is allowed only as a revert path from On-Notice.
 */
export const ChangeStatusRequestSchema = z.object({
  status: z.enum(['On-Notice', 'Exited', 'Active'], {
    errorMap: () => ({
      message:
        'Status must be On-Notice, Exited, or Active. ' +
        'On-Leave is system-controlled and set automatically while an approved leave is in progress (BL-006).',
    }),
  }),
  effectiveDate: ISODateOnlySchema,
  /** Required when status = "Exited". */
  exitDate: ISODateOnlySchema.optional(),
  /** Optional admin note recorded on the audit entry. */
  note: z.string().max(500).optional(),
  version: VersionSchema,
});
export type ChangeStatusRequest = z.infer<typeof ChangeStatusRequestSchema>;

export const ChangeStatusResponseSchema = EmployeeDetailResponseSchema;
export type ChangeStatusResponse = z.infer<typeof ChangeStatusResponseSchema>;

// ── POST /employees/{id}/reassign-manager ───────────────────────────────────

export const ReassignManagerRequestSchema = z.object({
  /** Pass null to unset (e.g. promote to top-of-tree). */
  newManagerId: z.string().nullable(),
  effectiveDate: ISODateOnlySchema,
  note: z.string().max(500).optional(),
  version: VersionSchema,
});
export type ReassignManagerRequest = z.infer<typeof ReassignManagerRequestSchema>;

export const ReassignManagerResponseSchema = EmployeeDetailResponseSchema;
export type ReassignManagerResponse = z.infer<typeof ReassignManagerResponseSchema>;

// ── GET /employees/{id}/team ────────────────────────────────────────────────

/**
 * Returns BOTH the current direct + indirect reports AND the past members
 * (BL-022a). The `pastEndedAt` timestamp is when the employee left this
 * manager's tree (reassignment OR exit).
 */
export const TeamMemberSchema = EmployeeListItemSchema.extend({
  /** True for direct reports; false for indirect (deeper subordinates). */
  isDirect: z.boolean(),
  /** Set on past members; null on current ones. */
  pastEndedAt: ISODateSchema.nullable(),
  pastReason: z.enum(['Reassigned', 'Exited']).nullable(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamResponseSchema = z.object({
  data: z.object({
    current: z.array(TeamMemberSchema),
    past: z.array(TeamMemberSchema),
  }),
});
export type TeamResponse = z.infer<typeof TeamResponseSchema>;

// ── GET /employees/{id}/profile ─────────────────────────────────────────────

export const ProfileResponseSchema = z.object({
  data: EmployeeDetailSchema,
});
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
