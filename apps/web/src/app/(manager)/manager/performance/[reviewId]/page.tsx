'use client';

/**
 * M-09 + M-10 — Manager Review Detail.
 * Visual references:
 *   prototype/manager/goal-setting.html
 *   prototype/manager/manager-rating.html
 *
 * Combined page:
 * - Goal setting at the top (M-09): create goals, set outcomes.
 * - Manager rating below (M-10): submit manager rating + goal outcomes.
 * - ManagerChangeAuditCard if previousManagerId is set (BL-042).
 * - OverrideTag when manager rating differs from self rating (BL-040).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useReview, useCycle, useCreateGoal, useSubmitManagerRating } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { GoalList } from '@/components/performance/GoalList';
import { ManagerRatingForm } from '@/components/performance/ManagerRatingForm';
import { ManagerChangeAuditCard } from '@/components/performance/ManagerChangeAuditCard';
import { MidCycleJoinerNotice } from '@/components/performance/MidCycleJoinerNotice';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import { CYCLE_STATUS } from '@/lib/status/maps';
import type { GoalOutcomeIdValue } from '@nexora/contracts/performance';

export default function ManagerReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const [newGoalText, setNewGoalText] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  const reviewIdNum = Number(reviewId);
  const { data, isLoading, isError } = useReview(reviewIdNum);
  const cycleId = data?.cycleId ?? 0;
  const { data: cycleData } = useCycle(cycleId);
  const { mutateAsync: createGoal, isPending: isCreatingGoal } = useCreateGoal(reviewIdNum);
  const { mutateAsync: submitManagerRating, isPending: isSubmitting } = useSubmitManagerRating(reviewIdNum);

  async function handleCreateGoal(text: string) {
    try {
      await createGoal({ text });
      showToast({ type: 'success', title: 'Goal added' });
      setNewGoalText('');
      setAddingGoal(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ErrorCode.CYCLE_CLOSED) {
          showToast({ type: 'error', title: 'Cycle closed', message: 'This cycle is closed. Final ratings cannot be edited.' });
        } else if (err.code === ErrorCode.CYCLE_PHASE) {
          showToast({ type: 'error', title: 'Phase window closed', message: 'Goal-setting window has closed for this cycle.' });
        } else {
          showToast({ type: 'error', title: 'Failed to add goal', message: err.message });
        }
      }
    }
  }

  async function handleManagerRating(ratingData: {
    managerRating: number;
    managerNote?: string;
    goals?: Array<{ id: number; outcomeId: GoalOutcomeIdValue }>;
    version: number;
  }) {
    try {
      await submitManagerRating(ratingData);
      showToast({ type: 'success', title: 'Manager rating submitted' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ErrorCode.CYCLE_CLOSED) {
          showToast({ type: 'error', title: 'Cycle closed', message: 'This cycle is closed. Final ratings cannot be edited.' });
        } else if (err.code === ErrorCode.CYCLE_PHASE) {
          showToast({ type: 'error', title: 'Deadline passed', message: 'Manager-review window has closed — submissions are no longer accepted.' });
        } else if (err.code === ErrorCode.VERSION_MISMATCH) {
          showToast({ type: 'info', title: 'Refreshed', message: 'This review was updated by another session. Please review and resubmit.' });
        } else {
          showToast({ type: 'error', title: 'Submission failed', message: err.message });
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
        Review not found or you do not have permission to view it.
      </div>
    );
  }

  const review = data;
  const managerReviewDeadline = cycleData?.cycle.managerReviewDeadline ?? '';
  const isCycleOpen = review.cycleStatus === CYCLE_STATUS.Open || review.cycleStatus === CYCLE_STATUS.SelfReview;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/manager/performance" className="hover:text-forest transition-colors">
          Performance Queue
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{review.employeeName}</span>
      </nav>

      {/* Notices */}
      {review.isMidCycleJoiner && <MidCycleJoinerNotice />}
      {review.previousManagerId && <ManagerChangeAuditCard review={review} />}

      {/* Review header */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-charcoal">{review.employeeName}</h1>
            <p className="text-sm text-slate mt-0.5">
              {review.employeeCode}
              {review.department ? ` · ${review.department}` : ''}
              {review.designation ? ` · ${review.designation}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <CycleStatusBadge status={review.cycleStatus} />
              <span className="text-xs text-slate">{review.cycleCode}</span>
              <ReviewStatusBadge review={review} />
            </div>
          </div>
        </div>
      </div>

      {/* M-09: Goal setting */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-bold text-charcoal">Goals (M-09)</h2>
          {isCycleOpen && review.lockedAt === null && !review.isMidCycleJoiner && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAddingGoal(true)}
              leadingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add goal
            </Button>
          )}
        </div>

        {addingGoal && (
          <div className="mb-4 p-4 bg-offwhite rounded-lg border border-sage/30">
            <div className="relative">
              <textarea
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Describe the goal (3–500 characters)…"
                className="w-full border border-sage rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none"
                aria-label="New goal text"
              />
              <span className="absolute bottom-2 right-3 text-xs text-sage">{newGoalText.length}/500</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => handleCreateGoal(newGoalText)}
                loading={isCreatingGoal}
                disabled={newGoalText.trim().length < 3}
              >
                Save goal
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setAddingGoal(false); setNewGoalText(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <GoalList
          goals={review.goals}
          disabled={review.lockedAt !== null}
        />
      </div>

      {/* Employee self rating (reference) */}
      {review.selfRating !== null && (
        <div className="bg-offwhite rounded-xl border border-sage/30 p-5">
          <h2 className="font-heading text-sm font-bold text-charcoal mb-2">Employee Self Rating</h2>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-charcoal">{review.selfRating}</span>
            {review.selfNote && (
              <p className="text-sm text-slate leading-relaxed border-l-2 border-sage/40 pl-3">
                {review.selfNote}
              </p>
            )}
          </div>
        </div>
      )}

      {/* M-10: Manager rating */}
      {!review.isMidCycleJoiner && (
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <h2 className="font-heading text-base font-bold text-charcoal mb-4">Manager Rating (M-10)</h2>
          <ManagerRatingForm
            review={review}
            managerReviewDeadline={managerReviewDeadline}
            onSubmit={handleManagerRating}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}
