'use client';

/**
 * Admin — Single Review Detail (read-only when cycle is Closed).
 * Also used for Admin own review (Option B — peer Admin reviewer).
 *
 * Shows:
 * - ManagerChangeAuditCard if previousManagerId is set (BL-042).
 * - MidCycleJoinerNotice if isMidCycleJoiner (BL-037).
 * - Self rating + manager rating (display mode).
 * - Goals list.
 * - Admin peer reviewer banner if this is the admin's own review (Option B).
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useReview } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { RatingScale } from '@/components/performance/RatingScale';
import { GoalList } from '@/components/performance/GoalList';
import { ManagerChangeAuditCard } from '@/components/performance/ManagerChangeAuditCard';
import { MidCycleJoinerNotice } from '@/components/performance/MidCycleJoinerNotice';
import { OverrideTag } from '@/components/performance/OverrideTag';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();

  const { data, isLoading, isError } = useReview(reviewId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Review not found or you do not have access to view it.
        </div>
      </div>
    );
  }

  const review = data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/admin/performance-cycles" className="hover:text-forest transition-colors">
          Performance Cycles
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/admin/performance-cycles/${review.cycleId}`} className="hover:text-forest transition-colors">
          {review.cycleCode}
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
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-charcoal">{review.employeeName}</h1>
            <p className="text-sm text-slate mt-0.5">
              {review.employeeCode}
              {review.department ? ` · ${review.department}` : ''}
              {review.designation ? ` · ${review.designation}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <CycleStatusBadge status={review.cycleStatus} />
              <ReviewStatusBadge review={review} />
            </div>
          </div>
          {review.managerId && (
            <div className="text-right text-sm text-slate">
              <div className="text-xs text-sage/80 mb-0.5">Reviewer</div>
              <div className="font-medium text-charcoal">{review.managerName}</div>
            </div>
          )}
        </div>
      </div>

      {/* Self rating */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <h2 className="font-heading text-base font-bold text-charcoal mb-4">Self Rating</h2>
        {review.selfRating !== null ? (
          <div className="space-y-3">
            <RatingScale value={review.selfRating} readonly label="Self rating" />
            {review.selfNote && (
              <p className="text-sm text-slate leading-relaxed border-l-2 border-sage/40 pl-3">
                {review.selfNote}
              </p>
            )}
            {review.selfSubmittedAt && (
              <p className="text-xs text-sage/70">
                Submitted {new Date(review.selfSubmittedAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate">{review.isMidCycleJoiner ? 'Skipped (mid-cycle joiner)' : 'Not yet submitted'}</p>
        )}
      </div>

      {/* Manager rating */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-heading text-base font-bold text-charcoal">Manager Rating</h2>
          {review.managerOverrodeSelf && <OverrideTag show />}
        </div>
        {review.managerRating !== null ? (
          <div className="space-y-3">
            <RatingScale value={review.managerRating} readonly label="Manager rating" />
            {review.managerNote && (
              <p className="text-sm text-slate leading-relaxed border-l-2 border-sage/40 pl-3">
                {review.managerNote}
              </p>
            )}
            {review.managerSubmittedAt && (
              <p className="text-xs text-sage/70">
                Submitted {new Date(review.managerSubmittedAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate">{review.isMidCycleJoiner ? 'Skipped (mid-cycle joiner)' : 'Not yet submitted'}</p>
        )}
      </div>

      {/* Final rating (if closed) */}
      {review.finalRating !== null && (
        <div className="bg-forest text-white rounded-xl p-6">
          <h2 className="font-heading text-base font-bold mb-3">Final Rating</h2>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-mint">{review.finalRating}</span>
            <div className="text-sm text-white/80">
              <div>Locked on {review.lockedAt ? new Date(review.lockedAt).toLocaleDateString('en-IN') : '—'}</div>
              <div className="text-xs text-white/60 mt-0.5">BL-041: Final rating locked at cycle close</div>
            </div>
          </div>
        </div>
      )}

      {/* Goals */}
      <div className="bg-white rounded-xl border border-sage/30 p-6">
        <h2 className="font-heading text-base font-bold text-charcoal mb-4">Goals</h2>
        <GoalList goals={review.goals} />
      </div>
    </div>
  );
}
