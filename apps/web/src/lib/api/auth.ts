/**
 * Auth API wrappers — typed against @nexora/contracts/auth.
 * Endpoints per docs/HRMS_API.md § 4.
 *
 * Never call apiClient directly from pages — use these typed wrappers.
 */

import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  FirstLoginSetPasswordRequest,
  FirstLoginSetPasswordResponse,
  AuthMeResponse,
} from '@nexora/contracts/auth';

import { apiClient } from './client';

/**
 * POST /auth/login
 * UC-AUTH-01 — main login flow.
 * On success the API sets an HttpOnly session cookie (nx_session).
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', data);
}

/**
 * POST /auth/logout
 * Destroys the server-side session. Always resolves (best-effort).
 */
export async function logout(): Promise<LogoutResponse> {
  return apiClient.post<LogoutResponse>('/auth/logout');
}

/**
 * POST /auth/forgot-password
 * UC-FL-02 — ALWAYS returns 200; never reveals whether email exists.
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  return apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
}

/**
 * POST /auth/reset-password
 * UC-FL-02 — invalidates all active sessions for that user on success.
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  return apiClient.post<ResetPasswordResponse>('/auth/reset-password', data);
}

/**
 * POST /auth/first-login/set-password
 * UC-FL-01 — sets the initial password on first login.
 * On success the API sets the session cookie and the user is logged in.
 */
export async function firstLoginSetPassword(
  data: FirstLoginSetPasswordRequest,
): Promise<FirstLoginSetPasswordResponse> {
  return apiClient.post<FirstLoginSetPasswordResponse>(
    '/auth/first-login/set-password',
    data,
  );
}

/**
 * GET /auth/me
 * Returns the currently authenticated user + role + permissions.
 * Used for server-side role guards in each layout.tsx.
 */
export async function getMe(cookieHeader?: string): Promise<AuthMeResponse> {
  const options: RequestInit = cookieHeader
    ? { headers: { Cookie: cookieHeader } }
    : {};
  return apiClient.get<AuthMeResponse>('/auth/me', options);
}
