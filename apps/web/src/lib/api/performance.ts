/**
 * Nexora HRMS — Performance API client (Phase 5).
 *
 * All paths under /api/v1/performance/*.
 * Mutations auto-attach Idempotency-Key via the shared apiClient wrapper.
 *
 * Business rules enforced server-side:
 *   BL-037  Mid-cycle joiners skipped.
 *   BL-038  Goals: 3–5 at cycle start; employee proposes during self-review.
 *   BL-039  Self-rating editable until selfReviewDeadline.
 *   BL-040  Manager rating may differ from self rating (managerOverrodeSelf flag).
 *   BL-041  Cycle closure locks all ratings; 409 CYCLE_CLOSED on subsequent mutations.
 *   BL-042  Manager change mid-cycle — both managers retained for audit.
 */

import { apiClient } from './client';
import type {
  CreateCycleRequest,
  CreateCycleResponse,
  CycleListQuery,
  CycleListResponse,
  CycleDetailResponse,
  CloseCycleRequest,
  CloseCycleResponse,
  DistributionReportResponse,
  MissingReviewsResponse,
  ReviewListQuery,
  ReviewListResponse,
  ReviewDetailResponse,
  CreateGoalRequest,
  CreateGoalResponse,
  ProposeGoalRequest,
  ProposeGoalResponse,
  SelfRatingRequest,
  SelfRatingResponse,
  ManagerRatingRequest,
  ManagerRatingResponse,
} from '@nexora/contracts/performance';

const BASE = '/api/v1/performance';

// ── Query string builder ──────────────────────────────────────────────────────

function toQS(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ── Cycles ────────────────────────────────────────────────────────────────────

/** POST /performance/cycles — Admin only. BL-037 mid-cycle joiners handled server-side. */
export async function createCycle(
  input: CreateCycleRequest,
): Promise<CreateCycleResponse['data']> {
  const res = await apiClient.post<CreateCycleResponse>(`${BASE}/cycles`, input);
  return res.data;
}

/** GET /performance/cycles — all authenticated, scoped by role. */
export async function listCycles(
  query: Partial<CycleListQuery> = {},
): Promise<CycleListResponse> {
  return apiClient.get<CycleListResponse>(
    `${BASE}/cycles${toQS(query as Record<string, unknown>)}`,
  );
}

/** GET /performance/cycles/:id — role-scoped. */
export async function getCycle(id: string): Promise<CycleDetailResponse['data']> {
  const res = await apiClient.get<CycleDetailResponse>(
    `${BASE}/cycles/${encodeURIComponent(id)}`,
  );
  return res.data;
}

/**
 * POST /performance/cycles/:id/close — Admin only.
 * Two-step: client must send confirm: 'CLOSE' + current version.
 * Locks all final ratings (BL-041).
 */
export async function closeCycle(
  id: string,
  input: CloseCycleRequest,
): Promise<CloseCycleResponse['data']> {
  const res = await apiClient.post<CloseCycleResponse>(
    `${BASE}/cycles/${encodeURIComponent(id)}/close`,
    input,
  );
  return res.data;
}

/** GET /performance/cycles/:id/reports/distribution — Admin only. A-22. */
export async function getDistribution(
  cycleId: string,
): Promise<DistributionReportResponse['data']> {
  const res = await apiClient.get<DistributionReportResponse>(
    `${BASE}/cycles/${encodeURIComponent(cycleId)}/reports/distribution`,
  );
  return res.data;
}

/** GET /performance/cycles/:id/reports/missing — Admin only. A-23. */
export async function getMissingReviews(
  cycleId: string,
): Promise<MissingReviewsResponse['data']> {
  const res = await apiClient.get<MissingReviewsResponse>(
    `${BASE}/cycles/${encodeURIComponent(cycleId)}/reports/missing`,
  );
  return res.data;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

/** GET /performance/reviews — role-scoped (Admin sees all, Manager sees team, Employee sees own). */
export async function listReviews(
  query: Partial<ReviewListQuery> = {},
): Promise<ReviewListResponse> {
  return apiClient.get<ReviewListResponse>(
    `${BASE}/reviews${toQS(query as Record<string, unknown>)}`,
  );
}

/** GET /performance/reviews/:id — role-scoped. 404 if not visible. */
export async function getReview(id: string): Promise<ReviewDetailResponse['data']> {
  const res = await apiClient.get<ReviewDetailResponse>(
    `${BASE}/reviews/${encodeURIComponent(id)}`,
  );
  return res.data;
}

/** POST /performance/reviews/:id/goals — Manager or Admin. BL-038. */
export async function createGoal(
  reviewId: string,
  input: CreateGoalRequest,
): Promise<CreateGoalResponse['data']> {
  const res = await apiClient.post<CreateGoalResponse>(
    `${BASE}/reviews/${encodeURIComponent(reviewId)}/goals`,
    input,
  );
  return res.data;
}

/** POST /performance/reviews/:id/goals/propose — Employee only, window-gated. BL-038. */
export async function proposeGoal(
  reviewId: string,
  input: ProposeGoalRequest,
): Promise<ProposeGoalResponse['data']> {
  const res = await apiClient.post<ProposeGoalResponse>(
    `${BASE}/reviews/${encodeURIComponent(reviewId)}/goals/propose`,
    input,
  );
  return res.data;
}

/** PATCH /performance/reviews/:id/self-rating — Employee only, deadline-gated. BL-039. */
export async function submitSelfRating(
  reviewId: string,
  input: SelfRatingRequest,
): Promise<SelfRatingResponse['data']> {
  const res = await apiClient.patch<SelfRatingResponse>(
    `${BASE}/reviews/${encodeURIComponent(reviewId)}/self-rating`,
    input,
  );
  return res.data;
}

/** POST /performance/reviews/:id/manager-rating — Manager or Admin, deadline-gated. BL-040. */
export async function submitManagerRating(
  reviewId: string,
  input: ManagerRatingRequest,
): Promise<ManagerRatingResponse['data']> {
  const res = await apiClient.post<ManagerRatingResponse>(
    `${BASE}/reviews/${encodeURIComponent(reviewId)}/manager-rating`,
    input,
  );
  return res.data;
}
