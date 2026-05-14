'use client';

/**
 * E-11 — Employee Self Rating + Goal List.
 * Visual reference: prototype/employee/self-rating.html
 *
 * Features:
 * - MidCycleJoinerNotice if isMidCycleJoiner (BL-037).
 * - SelfRatingForm with deadline countdown banner (BL-039).
 * - GoalList with "Propose goal" button (window-gated, BL-038).
 *   Proposal button is shown only during the Self-Review window.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useReview, useCycle, useSubmitSelfRating, useProposeGoal } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { SelfRatingForm } from '@/components/performance/SelfRatingForm';
import { GoalList } from '@/components/performance/GoalList';
import { MidCycleJoinerNotice } from '@/components/performance/MidCycleJoinerNotice';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import { CYCLE_STATUS } from '@/lib/status/maps';
import type { SelfRatingRequest } from '@nexora/contracts/performance';

export default function EmployeeSelfRatingPage() {
  const { reviewId } = useParams<{ reviewId: string }>();

  const reviewIdNum = Number(reviewId);
  const { data, isLoading, isError } = useReview(reviewIdNum);
  // Fetch cycle to get deadline dates (not on the review directly).
  const cycleId = data?.cycleId ?? 0;
  const { data: cycleData } = useCycle(cycleId);
  const { mutateAsync: submitSelfRating, isPending: isSubmitting } = useSubmitSelfRating(reviewIdNum);
  const { mutateAsync: proposeGoal } = useProposeGoal(reviewIdNum);

  async function handleSelfRating(ratingData: SelfRatingRequest) {
    try {
      await submitSelfRating(ratingData);
      showToast({ type: 'success', title: 'Self rating submitted successfully' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ErrorCode.CYCLE_CLOSED) {
          showToast({ type: 'error', title: 'Cycle closed', message: 'This cycle is closed. Final ratings cannot be edited.' });
        } else if (err.code === ErrorCode.CYCLE_PHASE) {
          showToast({ type: 'error', title: 'Deadline passed', message: 'Self-review window has closed — submissions are no longer accepted.' });
        } else if (err.code === ErrorCode.VERSION_MISMATCH) {
          showToast({ type: 'info', title: 'Refreshed', message: 'This review was updated. Please review and resubmit.' });
        } else {
          showToast({ type: 'error', title: 'Submission failed', message: err.message });
        }
      }
    }
  }

  async function handleProposeGoal(text: string) {
    try {
      await proposeGoal({ text });
      showToast({ type: 'success', title: 'Goal proposed', message: 'Your goal has been sent to your manager for review.' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ErrorCode.CYCLE_PHASE) {
          showToast({ type: 'error', title: 'Window closed', message: 'Goal proposals are only accepted during the self-review window.' });
        } else {
          showToast({ type: 'error', title: 'Failed to propose goal', message: err.message });
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
        Review not found or you do not have access.
      </div>
    );
  }

  const review = data;
  const selfReviewDeadline = cycleData?.cycle.selfReviewDeadline ?? '';
  // Employee can propose goals during the Self-Review window only (BL-038).
  const inSelfReviewWindow = review.cycleStatus === CYCLE_STATUS.SelfReview;
  const selfReviewDeadlinePassed = selfReviewDeadline ? new Date(selfReviewDeadline) < new Date() : false;
  const canProposeGoal = inSelfReviewWindow && !selfReviewDeadlinePassed && !review.isMidCycleJoiner && !review.lockedAt;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/employee/performance" className="hover:text-forest transition-colors">
          My Reviews
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{review.cycleCode}</span>
      </nav>

      {/* Mid-cycle joiner notice */}
      {review.isMidCycleJoiner && <MidCycleJoinerNotice />}

      {/* Review header */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CycleStatusBadge status={review.cycleStatus} />
              <span className="text-xs text-slate">{review.cycleCode}</span>
            </div>
            <h1 className="font-heading text-xl font-bold text-charcoal">Self Rating</h1>
            {review.managerName && (
              <p className="text-sm text-slate mt-1">
                Reviewer: <span className="font-medium text-charcoal">{review.managerName}</span>
              </p>
            )}
          </div>
          <ReviewStatusBadge review={review} />
        </div>
      </div>

      {/* Goals */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <h2 className="font-heading text-base font-bold text-charcoal mb-4">My Goals</h2>
        <GoalList
          goals={review.goals}
          canProposeGoal={canProposeGoal}
          onProposeGoal={handleProposeGoal}
          disabled={!!review.lockedAt}
        />
        {canProposeGoal && (
          <p className="text-xs text-slate mt-3">
            You can propose additional goals during the self-review window. Proposals are
            subject to your manager&apos;s approval.
          </p>
        )}
      </div>

      {/* Self rating form */}
      {!review.isMidCycleJoiner && (
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <h2 className="font-heading text-base font-bold text-charcoal mb-4">My Self Rating</h2>
          <SelfRatingForm
            review={review}
            selfReviewDeadline={selfReviewDeadline}
            onSubmit={handleSelfRating}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Manager rating (read-only, if submitted) */}
      {review.managerRating !== null && (
        <div className="bg-offwhite rounded-xl border border-sage/30 p-6">
          <h2 className="font-heading text-base font-bold text-charcoal mb-2">Manager Rating</h2>
          <p className="text-sm text-slate">
            Your manager rated you <span className="font-bold text-charcoal text-lg">{review.managerRating}</span>.
            {review.managerNote && (
              <span className="block mt-2 text-sm leading-relaxed border-l-2 border-sage/40 pl-3">
                {review.managerNote}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Final rating (if closed) */}
      {review.finalRating !== null && (
        <div className="bg-forest text-white rounded-xl p-6">
          <h2 className="font-heading text-base font-bold mb-3">Final Rating</h2>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-mint">{review.finalRating}</span>
            <p className="text-sm text-white/80">
              Cycle closed and final rating locked.
              {review.lockedAt && (
                <span className="block text-xs text-white/60 mt-0.5">
                  Locked on {new Date(review.lockedAt).toLocaleDateString('en-IN')}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
