/**
 * Auth contract — canonical for Phase 0.
 *
 * Endpoints (docs/HRMS_API.md § 4):
 *   POST /auth/login                       UC-AUTH-01
 *   POST /auth/logout                      —
 *   POST /auth/forgot-password             UC-FL-02
 *   POST /auth/reset-password              UC-FL-02
 *   POST /auth/first-login/set-password    UC-FL-01
 *   GET  /auth/me                          —
 *
 * Rules:
 *  - 5-strikes lockout → 423 LOCKED with Retry-After (15 min default)
 *  - Forgot-password ALWAYS returns 200 (no enumeration leak)
 *  - Reset-password invalidates ALL active sessions for that user
 *  - Session cookie: HttpOnly + Secure + SameSite=Lax
 *  - Audit every auth event (BL-047)
 */

import { z } from 'zod';
import { EmployeeStatusSchema, RoleSchema, EmployeeCodeSchema } from './common.js';

// ── Password policy ─────────────────────────────────────────────────────────

const passwordPolicy = z
  .string()
  .min(8, 'Minimum 8 characters')
  .max(128, 'Maximum 128 characters');

// ── Public user payload (returned by /auth/me and /auth/login) ──────────────

export const AuthUserSchema = z.object({
  id: z.string(),
  code: EmployeeCodeSchema,
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  status: EmployeeStatusSchema,
  department: z.string().nullable(),
  designation: z.string().nullable(),
  reportingManagerId: z.string().nullable(),
  mustResetPassword: z.boolean(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

// ── POST /auth/login ────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: passwordPolicy,
  rememberMe: z.boolean().optional().default(false),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  data: z.object({
    user: AuthUserSchema,
    role: RoleSchema,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ── POST /auth/logout ───────────────────────────────────────────────────────

export const LogoutResponseSchema = z.object({
  data: z.object({ success: z.literal(true) }),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// ── POST /auth/forgot-password ──────────────────────────────────────────────

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

/** Always returns 200. NEVER reveals account existence. */
export const ForgotPasswordResponseSchema = z.object({
  data: z.object({
    message: z.string(),
  }),
});
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

// ── POST /auth/reset-password ───────────────────────────────────────────────

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordPolicy,
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const ResetPasswordResponseSchema = z.object({
  data: z.object({ success: z.literal(true) }),
});
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

// ── POST /auth/first-login/set-password ─────────────────────────────────────

export const FirstLoginSetPasswordRequestSchema = z.object({
  tempCredentialsToken: z.string().min(1),
  newPassword: passwordPolicy,
});
export type FirstLoginSetPasswordRequest = z.infer<typeof FirstLoginSetPasswordRequestSchema>;

export const FirstLoginSetPasswordResponseSchema = z.object({
  data: z.object({
    user: AuthUserSchema,
    role: RoleSchema,
  }),
});
export type FirstLoginSetPasswordResponse = z.infer<typeof FirstLoginSetPasswordResponseSchema>;

// ── GET /auth/me ────────────────────────────────────────────────────────────

export const AuthMeResponseSchema = z.object({
  data: z.object({
    user: AuthUserSchema,
    role: RoleSchema,
    permissions: z.array(z.string()),
  }),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

/** Permission tags the API may emit. Frontend uses these for fine-grained gating. */
export const AuthPermission = {
  // module-level
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_WRITE: 'employees:write',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_APPROVE_ADMIN: 'leave:approve:admin',
  ATTENDANCE_REGULARISE_APPROVE: 'attendance:regularise:approve',
  PAYROLL_RUN: 'payroll:run',
  PAYROLL_FINALISE: 'payroll:finalise',
  PAYROLL_REVERSE: 'payroll:reverse',
  PERFORMANCE_CYCLE_MANAGE: 'performance:cycle:manage',
  CONFIG_WRITE: 'config:write',
  AUDIT_READ: 'audit:read',
} as const;

export type AuthPermissionValue = (typeof AuthPermission)[keyof typeof AuthPermission];
