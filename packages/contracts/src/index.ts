/**
 * @nexora/contracts — single source of truth for the API contract.
 * Imported by @nexora/api (Express routes + zod middleware) and
 * @nexora/web (TanStack Query types + RHF resolvers).
 *
 * Add new module schemas as files (leave.ts, attendance.ts, ...) and re-export here.
 */

export * from './common.js';
export * from './errors.js';
export * from './auth.js';
export * from './employees.js';
export * from './leave.js';
