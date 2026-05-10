/**
 * Nexora HRMS — fetch-based API client.
 *
 * - Base URL from NEXT_PUBLIC_API_BASE_URL
 * - credentials: 'include' (session cookie)
 * - Throws ApiError on non-2xx, parsed against ErrorEnvelopeSchema
 * - Automatically adds Idempotency-Key header on POST / PATCH / PUT
 */

import { ErrorEnvelopeSchema } from '@nexora/contracts/errors';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

/** Generates a v4-style UUID for idempotency keys */
function uuid(): string {
  // crypto.randomUUID is available in modern browsers + Node 18+
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Custom error class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> | undefined,
    public readonly status: number,
    public readonly ruleId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Request options ───────────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  /** Parsed and returned as T on 2xx */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, method = 'GET', headers: extraHeaders, ...rest } = options;

  const isMutation =
    method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  // Idempotency-Key on write mutations
  if (isMutation && method !== 'DELETE') {
    headers['Idempotency-Key'] = uuid();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    // Try to parse the error envelope
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = `HTTP ${response.status}`;
    let errorDetails: Record<string, unknown> | undefined;
    let ruleId: string | undefined;

    try {
      const json: unknown = await response.json();
      const parsed = ErrorEnvelopeSchema.safeParse(json);
      if (parsed.success) {
        errorCode = parsed.data.error.code;
        errorMessage = parsed.data.error.message;
        errorDetails = parsed.data.error.details;
        ruleId = parsed.data.error.ruleId;
      } else {
        // Best-effort extraction if schema doesn't match
        const raw = json as Record<string, unknown>;
        if (typeof raw.error === 'object' && raw.error !== null) {
          const err = raw.error as Record<string, unknown>;
          if (typeof err.code === 'string') errorCode = err.code;
          if (typeof err.message === 'string') errorMessage = err.message;
        }
      }
    } catch {
      // Body couldn't be parsed — use status defaults
    }

    throw new ApiError(errorCode, errorMessage, errorDetails, response.status, ruleId);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const json: T = await response.json();
  return json;
}

// ── Exported helpers ──────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'POST', body, ...options }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'PATCH', body, ...options }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'PUT', body, ...options }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'DELETE', ...options }),
};
