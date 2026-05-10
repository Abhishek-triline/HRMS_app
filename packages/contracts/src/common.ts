/**
 * Cross-cutting schemas: roles, statuses, success envelopes, pagination, version.
 * These power every domain module — keep stable.
 */

import { z } from 'zod';

// ── Roles & statuses ────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['Employee', 'Manager', 'PayrollOfficer', 'Admin']);
export type Role = z.infer<typeof RoleSchema>;

/**
 * Employee status (BL-006). On-Leave is system-set automatically while an
 * approved leave is in progress and reverts to Active when the leave ends.
 * Active / On-Notice / Exited are Admin-controlled.
 * Inactive is the pre-first-login state.
 */
export const EmployeeStatusSchema = z.enum([
  'Active',
  'On-Notice',
  'Exited',
  'On-Leave',
  'Inactive',
]);
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;

export const EmploymentTypeSchema = z.enum(['Permanent', 'Contract', 'Intern', 'Probation']);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

// ── Success envelopes ───────────────────────────────────────────────────────

export const SuccessSchema = <T extends z.ZodTypeAny>(data: T) => z.object({ data });

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
  });

export type Paginated<T> = { data: T[]; nextCursor: string | null };

// ── Pagination input ────────────────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ── Concurrency ─────────────────────────────────────────────────────────────

export const VersionSchema = z.number().int().nonnegative();

// ── ID conventions ──────────────────────────────────────────────────────────

export const EmployeeCodeSchema = z
  .string()
  .regex(/^EMP-\d{4}-\d{4}$/, 'Must match EMP-YYYY-NNNN');

export const ULIDSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid ULID');

// ── ISO date helpers ────────────────────────────────────────────────────────

export const ISODateSchema = z.string().datetime({ offset: true });
export const ISODateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
