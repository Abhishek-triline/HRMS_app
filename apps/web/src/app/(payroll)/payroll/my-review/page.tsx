'use client';

/**
 * PayrollOfficer — My Review (BL-004).
 *
 * Payroll officers participate in the standard employee review cycle.
 * They submit their own self-rating and view manager ratings here.
 */

import Link from 'next/link';
import { useReviews } from '@/lib/hooks/usePerformance';
import { useMe } from '@/lib/hooks/useAuth';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { Spinner } from '@/components/ui/Spinner';

export default function PayrollMyReviewPage() {
  const { data: auth } = useMe();
  const userId = auth?.data?.user?.id ?? '';

  const { data, isLoading, isError } = useReviews({
    employeeId: userId || undefined,
  });

  const reviews = data?.data ?? [];
  const activeReview = reviews.find((r) => r.finalRating === null && !r.isMidCycleJoiner);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">My Review</h1>
        <p className="text-sm text-slate mt-1">Your performance review history.</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load your reviews. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {activeReview && (
            <div className="bg-forest text-white rounded-xl px-6 py-5 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-mint text-forest text-xs font-bold px-2 py-0.5 rounded">Active</span>
                    <span className="text-mint/80 text-xs">{activeReview.cycleCode}</span>
                  </div>
                  <h2 className="font-heading text-xl font-bold mb-1">Active Review</h2>
                  {activeReview.managerName && (
                    <p className="text-xs text-mint/70 mt-1">Reviewer: {activeReview.managerName}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
                    <span>Self: {activeReview.selfRating ?? 'Pending'}</span>
                    <span>Manager: {activeReview.managerRating ?? 'Pending'}</span>
                  </div>
                </div>
                <Link
                  href={`/payroll/my-review/${activeReview.id}`}
                  className="bg-mint text-forest hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                >
                  {activeReview.selfRating === null ? 'Submit Self Rating' : 'View'}
                </Link>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 border border-sage/30 rounded-xl text-sm text-slate">
              No performance reviews found.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border border-sage/30 p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate">{review.cycleCode}</span>
                    </div>
                    <div className="text-xs text-slate mt-1">
                      Self: {review.selfRating ?? '—'} · Manager: {review.managerRating ?? '—'}
                      {review.finalRating !== null && (
                        <span className="font-semibold text-charcoal ml-2">Final: {review.finalRating}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ReviewStatusBadge review={review} />
                    <Link
                      href={`/payroll/my-review/${review.id}`}
                      className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
