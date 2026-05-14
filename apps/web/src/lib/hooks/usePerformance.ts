'use client';

/**
 * TanStack Query hooks for Performance Reviews — Phase 5.
 *
 * Business rules surfaced:
 *   BL-037  Mid-cycle joiners — isMidCycleJoiner flag on the review.
 *   BL-038  Goals creation and proposal.
 *   BL-039  Self-rating editable until selfReviewDeadline.
 *   BL-040  Manager rating override (managerOverrodeSelf flag).
 *   BL-041  Cycle closure — 409 CYCLE_CLOSED on subsequent mutations.
 *   BL-042  Manager change mid-cycle — previousManagerId / previousManagerName.
 *
 * Error codes surfaced to callers:
 *   CYCLE_CLOSED   → toast "This cycle is closed. Final ratings cannot be edited."
 *   CYCLE_PHASE    → toast with relevant deadline message.
 *   VERSION_MISMATCH → toast + invalidate detail.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { qk } from '@/lib/api/query-keys';
import {
  listCycles,
  getCycle,
  createCycle,
  closeCycle,
  getDistribution,
  getMissingReviews,
  listReviews,
  getReview,
  createGoal,
  proposeGoal,
  submitSelfRating,
  submitManagerRating,
} from '@/lib/api/performance';
import type {
  CycleListQuery,
  ReviewListQuery,
  CreateCycleRequest,
  CloseCycleRequest,
  CreateGoalRequest,
  ProposeGoalRequest,
  SelfRatingRequest,
  ManagerRatingRequest,
} from '@nexora/contracts/performance';

function generateKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Cycle queries ─────────────────────────────────────────────────────────────

export function useCycles(query: Partial<CycleListQuery> = {}) {
  return useQuery({
    queryKey: qk.performance.cycles(query),
    queryFn: () => listCycles(query),
    staleTime: 30_000,
  });
}

export function useCycle(id: number) {
  return useQuery({
    queryKey: qk.performance.cycle(id),
    queryFn: () => getCycle(id),
    enabled: id > 0,
    staleTime: 20_000,
  });
}

// ── Report queries ────────────────────────────────────────────────────────────

export function useDistribution(cycleId: number) {
  return useQuery({
    queryKey: qk.performance.reports.distribution(cycleId),
    queryFn: () => getDistribution(cycleId),
    enabled: cycleId > 0,
    staleTime: 60_000,
  });
}

export function useMissingReviews(cycleId: number) {
  return useQuery({
    queryKey: qk.performance.reports.missing(cycleId),
    queryFn: () => getMissingReviews(cycleId),
    enabled: cycleId > 0,
    staleTime: 30_000,
  });
}

// ── Review queries ────────────────────────────────────────────────────────────

export function useReviews(query: Partial<ReviewListQuery> = {}) {
  return useQuery({
    queryKey: qk.performance.reviews(query),
    queryFn: () => listReviews(query),
    staleTime: 20_000,
  });
}

export function useReview(id: number) {
  return useQuery({
    queryKey: qk.performance.review(id),
    queryFn: () => getReview(id),
    enabled: id > 0,
    staleTime: 15_000,
  });
}

// ── Cycle mutations ───────────────────────────────────────────────────────────

export function useCreateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCycleRequest) => createCycle(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.performance.all() });
    },
  });
}

export function useCloseCycle(cycleId: number) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(generateKey());

  return useMutation({
    mutationFn: (input: CloseCycleRequest) => closeCycle(cycleId, input),
    onSuccess: (data) => {
      // Update cycle detail cache directly.
      queryClient.setQueryData(qk.performance.cycle(cycleId), data);
      void queryClient.invalidateQueries({ queryKey: qk.performance.cycles() });
      idempotencyKeyRef.current = generateKey();
    },
    onError: () => {
      // Refresh so UI shows the true state.
      void queryClient.invalidateQueries({ queryKey: qk.performance.cycle(cycleId) });
    },
  });
}

// ── Review mutations ──────────────────────────────────────────────────────────

export function useCreateGoal(reviewId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalRequest) => createGoal(reviewId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.performance.review(reviewId) });
    },
  });
}

export function useProposeGoal(reviewId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProposeGoalRequest) => proposeGoal(reviewId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.performance.review(reviewId) });
    },
  });
}

export function useSubmitSelfRating(reviewId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SelfRatingRequest) => submitSelfRating(reviewId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.performance.review(reviewId), data);
      void queryClient.invalidateQueries({ queryKey: qk.performance.reviews() });
    },
    onError: () => {
      // On VERSION_MISMATCH — refresh to get current version.
      void queryClient.invalidateQueries({ queryKey: qk.performance.review(reviewId) });
    },
  });
}

export function useSubmitManagerRating(reviewId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManagerRatingRequest) => submitManagerRating(reviewId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.performance.review(reviewId), data);
      void queryClient.invalidateQueries({ queryKey: qk.performance.reviews() });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: qk.performance.review(reviewId) });
    },
  });
}
