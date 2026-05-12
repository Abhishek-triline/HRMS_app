/**
 * Nexora HRMS — Payroll API client (Phase 4).
 *
 * All wrappers use apiClient from the shared fetch layer.
 * Paths match /api/v1/payroll/* and /api/v1/payslips/* and /api/v1/config/tax
 * as documented in HRMS_API.md § 8.
 *
 * Idempotency-Key: auto-generated per call via crypto.randomUUID() unless
 * the caller supplies one explicitly. The backend deduplicates within 24 h
 * (BL per HRMS_Implementation_Plan.md § 8).
 */

import { apiClient } from './client';
import type {
  CreatePayrollRunRequest,
  CreatePayrollRunResponse,
  PayrollRunListQuery,
  PayrollRunListResponse,
  PayrollRunDetailResponse,
  FinaliseRunRequest,
  FinaliseRunResponse,
  ReverseRunRequest,
  ReverseRunResponse,
  PayslipListQuery,
  PayslipListResponse,
  PayslipDetailResponse,
  UpdatePayslipTaxRequest,
  UpdatePayslipTaxResponse,
  ReversalHistoryResponse,
  TaxSettingsResponse,
  UpdateTaxSettingsRequest,
  UpdateTaxSettingsResponse,
} from '@nexora/contracts/payroll';

const PAYROLL_BASE = '/api/v1/payroll';
const PAYSLIPS_BASE = '/api/v1/payslips';
const TAX_CONFIG_BASE = '/api/v1/config/tax';

// ── Idempotency helpers ───────────────────────────────────────────────────────

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function idempotencyHeaders(key?: string): Record<string, string> {
  return { 'Idempotency-Key': key ?? generateIdempotencyKey() };
}

// ── Query string builder ──────────────────────────────────────────────────────

function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ── POST /payroll/runs ────────────────────────────────────────────────────────

/** Initiate a new payroll run (Admin / PayrollOfficer). BL-030, BL-035, BL-036. */
export async function createPayrollRun(
  input: CreatePayrollRunRequest,
  opts?: { idempotencyKey?: string },
): Promise<CreatePayrollRunResponse['data']> {
  const res = await apiClient.post<CreatePayrollRunResponse>(
    `${PAYROLL_BASE}/runs`,
    input,
    { headers: idempotencyHeaders(opts?.idempotencyKey) },
  );
  return res.data;
}

// ── GET /payroll/runs ─────────────────────────────────────────────────────────

/** List payroll runs with optional year + status filters. */
export async function listPayrollRuns(
  query: Partial<PayrollRunListQuery> = {},
): Promise<PayrollRunListResponse> {
  return apiClient.get<PayrollRunListResponse>(
    `${PAYROLL_BASE}/runs${toQueryString(query as Record<string, unknown>)}`,
  );
}

// ── GET /payroll/runs/:id ─────────────────────────────────────────────────────

/** Get a single run with its payslip list. */
export async function getPayrollRun(id: number): Promise<PayrollRunDetailResponse['data']> {
  const res = await apiClient.get<PayrollRunDetailResponse>(
    `${PAYROLL_BASE}/runs/${id}`,
  );
  return res.data;
}

// ── POST /payroll/runs/:id/finalise ──────────────────────────────────────────

/**
 * Two-step finalise. Client must send confirm: 'FINALISE' + current version.
 * BL-034: concurrent guard — 409 RUN_ALREADY_FINALISED if another caller won.
 */
export async function finaliseRun(
  id: number,
  input: FinaliseRunRequest,
  opts?: { idempotencyKey?: string },
): Promise<FinaliseRunResponse['data']> {
  const res = await apiClient.post<FinaliseRunResponse>(
    `${PAYROLL_BASE}/runs/${id}/finalise`,
    input,
    { headers: idempotencyHeaders(opts?.idempotencyKey) },
  );
  return res.data;
}

// ── POST /payroll/runs/:id/reverse (Admin only) ───────────────────────────────

/**
 * Admin-only reversal. BL-032: creates a new reversal run; original untouched.
 * BL-033: only Admin may call this.
 */
export async function reverseRun(
  id: number,
  input: ReverseRunRequest,
  opts?: { idempotencyKey?: string },
): Promise<ReverseRunResponse['data']> {
  const res = await apiClient.post<ReverseRunResponse>(
    `${PAYROLL_BASE}/runs/${id}/reverse`,
    input,
    { headers: idempotencyHeaders(opts?.idempotencyKey) },
  );
  return res.data;
}

// ── GET /payroll/reversals ────────────────────────────────────────────────────

/** List reversal history (Admin / PO). A-24 / P-07. */
export async function listReversals(
  query: Record<string, unknown> = {},
): Promise<ReversalHistoryResponse> {
  return apiClient.get<ReversalHistoryResponse>(
    `/api/v1/payroll/reversals${toQueryString(query)}`,
  );
}

// ── GET /payslips ─────────────────────────────────────────────────────────────

/** List payslips — scoped by role server-side (employee sees own; PO/Admin see all). */
export async function listPayslips(
  query: Partial<PayslipListQuery> = {},
): Promise<PayslipListResponse> {
  return apiClient.get<PayslipListResponse>(
    `${PAYSLIPS_BASE}${toQueryString(query as Record<string, unknown>)}`,
  );
}

// ── GET /payslips/:id ─────────────────────────────────────────────────────────

/** Get a single payslip detail. */
export async function getPayslip(id: number): Promise<PayslipDetailResponse['data']> {
  const res = await apiClient.get<PayslipDetailResponse>(
    `${PAYSLIPS_BASE}/${id}`,
  );
  return res.data;
}

// ── PATCH /payslips/:id/tax ───────────────────────────────────────────────────

/**
 * PO/Admin: edit finalTaxPaise while the parent run is in Review.
 * BL-036a: manual tax entry, v1. Returns 409 PAYSLIP_IMMUTABLE (BL-031)
 * if the run is already finalised.
 */
export async function updatePayslipTax(
  id: number,
  input: UpdatePayslipTaxRequest,
  opts?: { idempotencyKey?: string },
): Promise<UpdatePayslipTaxResponse['data']> {
  const res = await apiClient.patch<UpdatePayslipTaxResponse>(
    `${PAYSLIPS_BASE}/${id}/tax`,
    input,
    { headers: idempotencyHeaders(opts?.idempotencyKey) },
  );
  return res.data;
}

// ── GET /payslips/:id/pdf ─────────────────────────────────────────────────────

/**
 * Download payslip as PDF blob. Caller is responsible for creating a temporary
 * object URL and triggering the browser download.
 */
export async function downloadPayslipPdf(id: number): Promise<Blob> {
  const API_BASE_URL =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : 'http://localhost:4000';

  const response = await fetch(
    `${API_BASE_URL}${PAYSLIPS_BASE}/${id}/pdf`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/pdf' },
    },
  );

  if (!response.ok) {
    throw new Error(`PDF download failed: HTTP ${response.status}`);
  }

  return response.blob();
}

// ── GET /config/tax ───────────────────────────────────────────────────────────

/** Get the current tax reference rate (Admin only). A-17. */
export async function getTaxSettings(): Promise<TaxSettingsResponse['data']> {
  const res = await apiClient.get<TaxSettingsResponse>(TAX_CONFIG_BASE);
  return res.data;
}

// ── PATCH /config/tax ─────────────────────────────────────────────────────────

/** Update the tax reference rate (Admin only). */
export async function updateTaxSettings(
  input: UpdateTaxSettingsRequest,
  opts?: { idempotencyKey?: string },
): Promise<UpdateTaxSettingsResponse['data']> {
  const res = await apiClient.patch<UpdateTaxSettingsResponse>(
    TAX_CONFIG_BASE,
    input,
    { headers: idempotencyHeaders(opts?.idempotencyKey) },
  );
  return res.data;
}
