/**
 * Audit Log contract — Phase 7.
 *
 * Endpoints (docs/HRMS_API.md § 12):
 *   GET /audit-logs   Admin only. Read-only, cursor-paginated.
 *
 * Business rules enforced server-side:
 *   BL-047  Every state-changing action writes an append-only audit entry.
 *   BL-048  The DB enforces append-only via REVOKE UPDATE/DELETE on audit_log.
 *           There is NO POST, PUT, PATCH, or DELETE on this resource.
 *
 * Filters supported:
 *   actorId       — specific actor employee id
 *   actorRole     — one of the known role strings
 *   module        — top-level module group (auth|leave|attendance|payroll|performance|notifications|employees|system)
 *   action        — exact or partial action string (LIKE %q%)
 *   targetType    — entity type e.g. LeaveRequest, Employee
 *   targetId      — exact target id
 *   from / to     — ISO datetime boundaries (inclusive)
 *   q             — free-text search on action string (cheap LIKE)
 */

import { z } from 'zod';
import { ISODateSchema, PaginationQuerySchema } from './common.js';

// ── Audit modules enum ───────────────────────────────────────────────────────

export const AuditModuleSchema = z.enum([
  'auth',
  'leave',
  'attendance',
  'payroll',
  'performance',
  'notifications',
  'employees',
  'configuration',
  'system',
]);
export type AuditModule = z.infer<typeof AuditModuleSchema>;

// ── Audit actor roles (superset of RoleSchema to include system + legacy strings) ──

export const AuditActorRoleSchema = z.enum([
  'Employee',
  'Manager',
  'PayrollOfficer',
  'Admin',
  'system',
  'Approver',
]);
export type AuditActorRole = z.infer<typeof AuditActorRoleSchema>;

// ── AuditLogEntry — mirrors the audit_log table exactly ─────────────────────

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorRole: z.string(),
  actorIp: z.string().nullable(),
  action: z.string(),
  module: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
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
  actorId: z.string().optional(),
  /** Filter by actor role. */
  actorRole: z.string().optional(),
  /** Filter by top-level module group. */
  module: z.string().optional(),
  /** Filter by action string — substring match (LIKE %action%). */
  action: z.string().optional(),
  /** Filter by target entity type. */
  targetType: z.string().optional(),
  /** Filter by exact target entity id. */
  targetId: z.string().optional(),
  /** Lower bound for createdAt (ISO 8601 datetime). */
  from: ISODateSchema.optional(),
  /** Upper bound for createdAt (ISO 8601 datetime). */
  to: ISODateSchema.optional(),
  /**
   * Free-text search — matches as a substring on the `action` field only.
   * Identical to the `action` substring filter but exists as a separate query
   * param so the UI can expose both (exact action filter + general search box).
   */
  q: z.string().max(200).optional(),
});
export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>;

export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogEntrySchema),
  nextCursor: z.string().nullable(),
});
export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;
