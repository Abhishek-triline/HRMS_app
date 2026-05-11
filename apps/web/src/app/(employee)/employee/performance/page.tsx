'use client';

/**
 * E-10 — Employee My Reviews.
 * Visual reference: prototype/employee/my-reviews.html
 *
 * Shows active cycle + own review status.
 * Links to self-rating page for the current cycle.
 */

import Link from 'next/link';
import { useReviews } from '@/lib/hooks/usePerformance';
import { useMe } from '@/lib/hooks/useAuth';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { MidCycleJoinerNotice } from '@/components/performance/MidCycleJoinerNotice';
import { Spinner } from '@/components/ui/Spinner';

export default function EmployeePerformancePage() {
  const { data: auth } = useMe();
  const userId = auth?.data?.user?.id ?? '';

  const { data: reviewData, isLoading, isError } = useReviews({
    employeeId: userId || undefined,
  });

  const reviews = reviewData?.data ?? [];
  // Active = no final rating yet and not a skipped mid-cycle joiner.
  const activeReview = reviews.find((r) => r.finalRating === null && !r.isMidCycleJoiner);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">My Reviews</h1>
        <p className="text-sm text-slate mt-1">Your performance review history</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load your performance reviews. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Active review highlight */}
          {activeReview && (
            <div className="bg-forest text-white rounded-xl px-6 py-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-mint text-forest text-xs font-bold px-2 py-0.5 rounded">Active</span>
                    <span className="text-mint/80 text-xs">{activeReview.cycleCode}</span>
                  </div>
                  <h2 className="font-heading text-xl font-bold mb-1">Active Review</h2>
                  <div className="flex items-center gap-4 mt-3 text-sm text-white/80">
                    <span>Self: {activeReview.selfRating !== null ? activeReview.selfRating : 'Pending'}</span>
                    <span>Manager: {activeReview.managerRating !== null ? activeReview.managerRating : 'Pending'}</span>
                  </div>
                  {activeReview.managerName && (
                    <p className="text-xs text-mint/70 mt-1">
                      Reviewer: {activeReview.managerName}
                    </p>
                  )}
                </div>
                <Link
                  href={`/employee/performance/${activeReview.id}`}
                  className="bg-mint text-forest hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                >
                  {activeReview.selfRating === null ? 'Submit Self Rating' : 'View Review'}
                </Link>
              </div>
            </div>
          )}

          {/* Mid-cycle joiner notice if any active cycle review is skipped */}
          {reviews.some((r) => r.isMidCycleJoiner && r.finalRating === null) && (
            <MidCycleJoinerNotice className="mb-5" />
          )}

          {/* All reviews */}
          {reviews.length === 0 ? (
            <div className="text-center py-12 border border-sage/30 rounded-xl">
              <svg className="w-10 h-10 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-sm text-slate">No performance reviews yet.</p>
              <p className="text-xs text-sage mt-1">Reviews are created at the start of each performance cycle.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-heading text-sm font-bold text-charcoal uppercase tracking-wider mb-3">
                All Reviews
              </h2>
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border border-sage/30 p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate font-semibold">{review.cycleCode}</span>
                    </div>
                    <div className="text-xs text-slate mt-1">
                      Self: {review.selfRating ?? '—'} · Manager: {review.managerRating ?? '—'}
                      {review.finalRating !== null && (
                        <span className="font-semibold text-charcoal ml-2">Final: {review.finalRating}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ReviewStatusBadge review={review} />
                    <Link
                      href={`/employee/performance/${review.id}`}
                      className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                    >
                      {review.finalRating === null && !review.isMidCycleJoiner ? 'Submit →' : 'View →'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
