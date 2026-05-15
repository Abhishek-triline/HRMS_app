/**
 * Audit Log contract.
 *
 * v2: All IDs are INT. Module is an FK to the `audit_modules` master table
 * (frozen IDs per HRMS_Schema_v2_Plan §2). Actor role and target type are
 * INT codes per §3.9:
 *
 *   actor_role_id (§3.9):
 *     1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin, 99=unknown, 100=system.
 *
 *   target_type_id (§3.9):
 *     1=Employee, 2=LeaveRequest, 3=LeaveEncashment, 4=AttendanceRecord,
 *     5=RegularisationRequest, 6=PayrollRun, 7=Payslip, 8=PerformanceCycle,
 *     9=PerformanceReview, 10=Goal, 11=Configuration, 12=SalaryStructure,
 *     13=Holiday, 14=Notification.
 *
 *   module_id (master `audit_modules`):
 *     1=auth, 2=employees, 3=leave, 4=payroll, 5=attendance, 6=performance,
 *     7=notifications, 8=audit, 9=configuration.
 *
 * Endpoints (docs/HRMS_API.md § 12):
 *   GET /audit-logs   Admin only. Read-only, cursor-paginated.
 *
 * Business rules enforced server-side:
 *   BL-047  Every state-changing action writes an append-only audit entry.
 *   BL-048  The DB enforces append-only via REVOKE UPDATE/DELETE on audit_log.
 *           There is NO POST, PUT, PATCH, or DELETE on this resource.
 */

import { z } from 'zod';
import { IdParamSchema, IdSchema, ISODateSchema, PaginationQuerySchema } from './common.js';

// ── Module / actor / target code schemas ────────────────────────────────────

export const AuditModuleIdSchema = z.number().int().min(1);
export const AuditActorRoleIdSchema = z.number().int().min(1);
export const AuditTargetTypeIdSchema = z.number().int().min(1);

// ── AuditLogEntry — mirrors the audit_log table exactly ─────────────────────

export const AuditLogEntrySchema = z.object({
  id: IdSchema,
  actorId: IdSchema.nullable(),
  actorRoleId: AuditActorRoleIdSchema,
  actorIp: z.string().nullable(),
  action: z.string(),
  moduleId: AuditModuleIdSchema,
  moduleName: z.string(),
  targetTypeId: AuditTargetTypeIdSchema.nullable(),
  targetId: IdSchema.nullable(),
  /** JSON snapshot before the mutation — null for creates. */
  before: z.unknown().nullable(),
  /** JSON snapshot after the mutation — null for deletes. */
  after: z.unknown().nullable(),
  createdAt: ISODateSchema,
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

// ── GET /audit-logs ──────────────────────────────────────────────────────────

export const AuditLogListQuerySchema = PaginationQuerySchema.extend({
  /** Filter to a specific actor by employee id. */
  actorId: IdParamSchema.optional(),
  /** Filter by actor role id (§3.9). */
  actorRoleId: z.coerce.number().int().min(1).optional(),
  /** Filter by audit_modules.id (1..9). */
  moduleId: z.coerce.number().int().min(1).optional(),
  /** Filter by action string — substring match (LIKE %action%). */
  action: z.string().max(200).optional(),
  /** Filter by target type id (§3.9). */
  targetTypeId: z.coerce.number().int().min(1).optional(),
  /** Filter by exact target entity id. */
  targetId: IdParamSchema.optional(),
  /** Lower bound for createdAt (ISO 8601 datetime). */
  from: ISODateSchema.optional(),
  /** Upper bound for createdAt (ISO 8601 datetime). */
  to: ISODateSchema.optional(),
  /** Free-text search — matches as a substring on the `action` field only. */
  q: z.string().max(200).optional(),
});
export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>;

export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogEntrySchema),
  nextCursor: z.string().nullable(),
});
export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;

/**
 * GET /audit-logs/export — single-shot export (no cursor). Server hard-caps
 * at 20,000 rows; `truncated` flags when the cap was hit so the UI can hint
 * the admin to narrow their filter.
 */
export const AuditLogExportResponseSchema = z.object({
  data: z.array(AuditLogEntrySchema),
  total: z.number().int().nonnegative(),
  truncated: z.boolean(),
});
export type AuditLogExportResponse = z.infer<typeof AuditLogExportResponseSchema>;
