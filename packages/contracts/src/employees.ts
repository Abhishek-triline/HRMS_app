/**
 * Employees & Hierarchy contract.
 *
 * v2: IDs are INT, status/role/employment-type are INT codes. Department and
 * designation are master-table FKs (departmentId / designationId) accompanied
 * by their resolved name string for UI display.
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
 *   BL-006  Status transitions (Active / OnNotice / Exited manual; OnLeave system-set)
 *   BL-007  Historical records never deleted
 *   BL-008  EMP code never reused (re-joiner gets a new code)
 *   BL-022  Pending approvals stay with previous manager; Admin if exited
 *   BL-022a Past team members surface separately for the previous manager
 *   BL-030  Salary edits apply from next payroll run only
 */

import { z } from 'zod';
import {
  EmployeeCodeSchema,
  EmployeeStatusIdSchema,
  EmploymentTypeIdSchema,
  GenderIdSchema,
  IdSchema,
  ISODateOnlySchema,
  ISODateSchema,
  PaginationQuerySchema,
  RoleIdSchema,
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
  /**
   * Optional component breakdown. When any of these three fields is present,
   * ALL three must be present and hra_paise + transport_paise + other_paise
   * MUST equal allowances_paise (enforced server-side).
   */
  hra_paise:        PaiseSchema.nullable().optional(),
  transport_paise:  PaiseSchema.nullable().optional(),
  other_paise:      PaiseSchema.nullable().optional(),
});
export type SalaryStructure = z.infer<typeof SalaryStructureSchema>;

// ── Employee — full + summary forms ─────────────────────────────────────────

/**
 * Detail shape — returned by GET /employees/{id}, PATCH /employees/{id},
 * and the profile endpoint. Includes salary only for Admin / SELF.
 *
 * Master FKs carry both `*Id` (canonical, INT) and the resolved name string
 * for UI display so the frontend doesn't need a second round-trip.
 */
export const EmployeeDetailSchema = z.object({
  id: IdSchema,
  code: EmployeeCodeSchema,
  name: z.string(),
  email: z.string().email(),
  /** Optional personal contact information. */
  phone: z.string().max(20).nullable().optional(),
  dateOfBirth: ISODateOnlySchema.nullable().optional(),
  genderId: GenderIdSchema.nullable().optional(),
  roleId: RoleIdSchema,
  statusId: EmployeeStatusIdSchema,
  departmentId: IdSchema.nullable(),
  department: z.string().nullable(),
  designationId: IdSchema.nullable(),
  designation: z.string().nullable(),
  employmentTypeId: EmploymentTypeIdSchema,
  reportingManagerId: IdSchema.nullable(),
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
  id: IdSchema,
  code: EmployeeCodeSchema,
  name: z.string(),
  email: z.string().email(),
  roleId: RoleIdSchema,
  statusId: EmployeeStatusIdSchema,
  departmentId: IdSchema.nullable(),
  department: z.string().nullable(),
  designationId: IdSchema.nullable(),
  designation: z.string().nullable(),
  employmentTypeId: EmploymentTypeIdSchema,
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
  /** Optional personal information fields. */
  phone: z.string().max(20).nullable().optional(),
  dateOfBirth: ISODateOnlySchema.nullable().optional(),
  genderId: GenderIdSchema.nullable().optional(),
  roleId: RoleIdSchema,
  /** FK to master `departments.id`. Pre-populated dropdown. */
  departmentId: IdSchema,
  /** FK to master `designations.id`. Pre-populated dropdown. */
  designationId: IdSchema,
  employmentTypeId: EmploymentTypeIdSchema,
  /** May be null — Admin or top-of-tree employees report to no-one (BL-017). */
  reportingManagerId: IdSchema.nullable(),
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
  statusId: z.coerce.number().int().min(1).max(5).optional(),
  /**
   * Filter by role id. Single value or comma-separated list (e.g. "2,4").
   */
  roleId: z.union([
    z.coerce.number().int().positive(),
    z.string().regex(/^\d+(,\d+)*$/),
  ]).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employmentTypeId: z.coerce.number().int().positive().optional(),
  managerId: z.coerce.number().int().positive().optional(),
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
  /** Optional personal information — editable on self-edit and Admin edit. */
  phone: z.string().max(20).nullable().optional(),
  dateOfBirth: ISODateOnlySchema.nullable().optional(),
  genderId: GenderIdSchema.nullable().optional(),
  roleId: RoleIdSchema.optional(),
  departmentId: IdSchema.optional(),
  designationId: IdSchema.optional(),
  employmentTypeId: EmploymentTypeIdSchema.optional(),
  joinDate: ISODateOnlySchema.optional(),
  /**
   * Reassign reporting manager inline with a profile update (Admin only).
   * Must point to an employee whose role is Manager (id=2) or Admin (id=4)
   * and whose status_id is Active (1) or OnNotice (2) (BL-015/017/022).
   * Pass null to unset (top-of-tree). Omit to leave unchanged.
   */
  reportingManagerId: IdSchema.nullable().optional(),
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
// Note: SalaryStructureSchema already includes the optional hra_paise /
// transport_paise / other_paise breakdown fields; UpdateSalaryRequestSchema
// inherits them via .extend().
export type UpdateSalaryRequest = z.infer<typeof UpdateSalaryRequestSchema>;

export const UpdateSalaryResponseSchema = EmployeeDetailResponseSchema;
export type UpdateSalaryResponse = z.infer<typeof UpdateSalaryResponseSchema>;

// ── POST /employees/{id}/status ─────────────────────────────────────────────

/**
 * Manual status transitions only — Admin sets OnNotice (2) or Exited (5).
 * Active (1) is allowed only as a revert path from OnNotice. OnLeave (3) is
 * system-set automatically while approved leave is in progress and reverts
 * to Active when the leave ends (BL-006). Inactive (4) is pre-first-login
 * only and never set manually.
 */
export const ChangeStatusRequestSchema = z.object({
  /** New status_id — must be one of {1=Active, 2=OnNotice, 5=Exited}. */
  statusId: z.number().int().refine((v) => v === 1 || v === 2 || v === 5, {
    message:
      'statusId must be 1 (Active), 2 (OnNotice), or 5 (Exited). ' +
      'OnLeave (3) is system-controlled and set automatically while an approved leave is in progress (BL-006). ' +
      'Inactive (4) is the pre-first-login state and cannot be set manually.',
  }),
  effectiveDate: ISODateOnlySchema,
  /** Required when statusId = 5 (Exited). */
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
  newManagerId: IdSchema.nullable(),
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
 *
 * §3.8 reporting_manager_history.reason_id: 1=Initial, 2=Reassigned, 3=Exited.
 * `pastReasonId` here is 2=Reassigned or 3=Exited; null for current members.
 */
export const TeamMemberSchema = EmployeeListItemSchema.extend({
  /** True for direct reports; false for indirect (deeper subordinates). */
  isDirect: z.boolean(),
  /** Set on past members; null on current ones. */
  pastEndedAt: ISODateSchema.nullable(),
  pastReasonId: z.number().int().min(2).max(3).nullable(),
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

// ── Master directory endpoints (used for dropdowns) ─────────────────────────

/**
 * Generic master row shape. Used by GET /masters/roles, /masters/departments,
 * /masters/designations, /masters/employment-types, /masters/genders.
 */
export const MasterItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
});
export type MasterItem = z.infer<typeof MasterItemSchema>;

export const MasterListResponseSchema = z.object({
  data: z.array(MasterItemSchema),
});
export type MasterListResponse = z.infer<typeof MasterListResponseSchema>;

/** POST /masters/departments — Admin only. Creates a new department. */
export const CreateDepartmentRequestSchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateDepartmentRequest = z.infer<typeof CreateDepartmentRequestSchema>;

/** POST /masters/designations — Admin only. Creates a new designation. */
export const CreateDesignationRequestSchema = z.object({
  name: z.string().min(1).max(150),
});
export type CreateDesignationRequest = z.infer<typeof CreateDesignationRequestSchema>;
