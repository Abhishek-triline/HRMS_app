/**
 * Cross-cutting schemas: IDs, status codes, success envelopes, pagination.
 *
 * v2 changes (HRMS_Schema_v2_Plan):
 *  - IDs are positive integers (INT AUTO_INCREMENT). Use `IdSchema` everywhere.
 *  - Status/role/type fields are positive integers — frozen INT→label maps
 *    are owned by the frontend (apps/web/src/lib/statusMaps.ts).
 *  - The contracts never describe a string-enum for a status; the wire format
 *    is always an integer code. See HRMS_Schema_v2_Plan.md §3 for the canonical
 *    code↔label table per entity. Never re-number existing codes; only append.
 */

import { z } from 'zod';

// ── IDs ─────────────────────────────────────────────────────────────────────

/** Canonical primary-key shape — INT AUTO_INCREMENT. */
export const IdSchema = z.number().int().positive();
export type Id = z.infer<typeof IdSchema>;

/**
 * Permissive ID coercion for URL/query-string params (e.g. `:id`, `?employeeId=`).
 * Accepts a number or a numeric string; rejects anything else.
 */
export const IdParamSchema = z.coerce.number().int().positive();
export type IdParam = z.infer<typeof IdParamSchema>;

// ── Status codes (INT) ─────────────────────────────────────────────────────
//
// All status/role/type fields are stored as INT in the DB and on the wire.
// The labels below are documentation only — never sent over the wire.

/** §3.1 employee.status_id: 1=Active, 2=OnNotice, 3=OnLeave, 4=Inactive, 5=Exited. */
export const EmployeeStatusSchema = z.number().int().min(1).max(5);

/** Master roles.id: 1=Employee, 2=Manager, 3=PayrollOfficer, 4=Admin. */
export const RoleIdSchema = z.number().int().min(1);

/** Master employment_types.id: 1=Permanent, 2=Contract, 3=Probation, 4=Intern. */
export const EmploymentTypeIdSchema = z.number().int().min(1);

/** Master genders.id: 1=Male, 2=Female, 3=Other, 4=PreferNotToSay. */
export const GenderIdSchema = z.number().int().min(1);

/** §3.2 leave_request.routed_to_id / §3.3 / §3.4: 1=Manager, 2=Admin. */
export const RoutedToIdSchema = z.number().int().min(1).max(2);

// ── Success / list / pagination envelopes ──────────────────────────────────

export const SuccessSchema = <T extends z.ZodTypeAny>(data: T) => z.object({ data });

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
  });

export type Paginated<T> = { data: T[]; nextCursor: string | null };

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ── Concurrency ─────────────────────────────────────────────────────────────

export const VersionSchema = z.number().int().nonnegative();

// ── Public business codes ──────────────────────────────────────────────────

/** BL-008 employee code — EMP-YYYY-NNNN, never reused. */
export const EmployeeCodeSchema = z
  .string()
  .regex(/^EMP-\d{4}-\d{4}$/, 'Must match EMP-YYYY-NNNN');

// ── ISO date helpers ───────────────────────────────────────────────────────

export const ISODateSchema = z.string().datetime({ offset: true });
export const ISODateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
