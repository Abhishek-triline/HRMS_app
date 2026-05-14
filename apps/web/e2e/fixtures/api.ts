import type { APIRequestContext, BrowserContext } from '@playwright/test';
import { request as playwrightRequest } from '@playwright/test';
import { CREDS, type Role } from '../utils/credentials';

/**
 * API helpers for arrange-phase mutations.
 *
 * Logging in via the UI for every test that needs a precondition row
 * adds 2–3 seconds of wasted wall-time per test. These helpers hit the
 * REST API directly with the seeded demo credentials so a spec can do
 * something like:
 *
 *   const empCtx = await loginViaApi('employee');
 *   const leave = await createLeaveRequest(empCtx, {
 *     leaveTypeId: 1, fromDate: '2026-08-01', toDate: '2026-08-02',
 *     reason: 'family event',
 *   });
 *   // then act on `leave.code` in the UI
 *
 * The returned APIRequestContext holds the session cookie so any
 * subsequent calls (cancel, etc.) re-use the same identity.
 */

const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://localhost:4000';

/** Log in via POST /api/v1/auth/login and return a cookie-bearing API context. */
export async function loginViaApi(role: Role): Promise<APIRequestContext> {
  const creds = CREDS[role];
  const ctx = await playwrightRequest.newContext({ baseURL: API_BASE });
  const res = await ctx.post('/api/v1/auth/login', {
    data: {
      email: creds.email,
      password: creds.password,
      rememberMe: false,
    },
  });
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`loginViaApi(${role}) failed: ${res.status()} ${text}`);
  }
  return ctx;
}

export interface CreatedLeave {
  id: number;
  code: string;
  status: number;
  fromDate: string;
  toDate: string;
  leaveTypeId: number;
}

/**
 * Create a leave request via POST /api/v1/leave/requests.
 *
 * The response envelope is { data: { leaveRequest: {...} } } — the
 * helper drills into leaveRequest so callers get the row directly.
 */
export async function createLeaveRequest(
  ctx: APIRequestContext,
  input: { leaveTypeId: number; fromDate: string; toDate: string; reason: string },
): Promise<CreatedLeave> {
  const res = await ctx.post('/api/v1/leave/requests', { data: input });
  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`createLeaveRequest failed: ${res.status()} ${text}`);
  }
  const body = await res.json();
  const row = body?.data?.leaveRequest ?? body?.data ?? body;
  return row as CreatedLeave;
}

/**
 * Cancel a leave request via POST /api/v1/leave/requests/:id/cancel.
 *
 * The server requires the current `version` for optimistic-concurrency
 * (BL-OPT). We GET the leave first to read its version, then send the
 * cancel with that value. Used as cleanup, so failures are warned-on
 * rather than thrown.
 */
export async function cancelLeaveRequest(
  ctx: APIRequestContext,
  leaveId: number,
  note = 'e2e cleanup',
): Promise<void> {
  // Fetch current version
  const getRes = await ctx.get(`/api/v1/leave/requests/${leaveId}`);
  if (!getRes.ok()) {
    console.warn(`cancelLeaveRequest: GET ${leaveId} failed ${getRes.status()}`);
    return;
  }
  const body = await getRes.json();
  const version = body?.data?.version ?? body?.version ?? 0;

  const res = await ctx.post(`/api/v1/leave/requests/${leaveId}/cancel`, {
    data: { note, version },
  });
  if (!res.ok()) {
    const text = await res.text();
    console.warn(`cancelLeaveRequest(${leaveId}) failed: ${res.status()} ${text}`);
  }
}

/** Copy API cookies into a browser context so navigations are pre-authenticated. */
export async function attachApiCookiesToBrowser(
  apiCtx: APIRequestContext,
  browserCtx: BrowserContext,
): Promise<void> {
  const storage = await apiCtx.storageState();
  await browserCtx.addCookies(storage.cookies);
}
