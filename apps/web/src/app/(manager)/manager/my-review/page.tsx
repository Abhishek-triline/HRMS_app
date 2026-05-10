'use client';

/**
 * Manager — My Review (BL-004).
 *
 * Managers are employees too — they have their own review record.
 * This page shows their self-rating form and current review state.
 */

import Link from 'next/link';
import { useReviews } from '@/lib/hooks/usePerformance';
import { useMe } from '@/lib/hooks/useAuth';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { Spinner } from '@/components/ui/Spinner';

export default function ManagerMyReviewPage() {
  const { data: auth } = useMe();
  const userId = auth?.data?.user?.id ?? '';

  const { data, isLoading, isError } = useReviews({
    employeeId: userId || undefined,
  });

  const reviews = data?.data ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">My Review</h1>
        <p className="text-sm text-slate mt-1">Your personal performance reviews.</p>
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

      {!isLoading && !isError && reviews.length === 0 && (
        <div className="text-center py-12 border border-sage/30 rounded-xl">
          <p className="text-sm text-slate">No performance reviews found for your account.</p>
        </div>
      )}

      {!isLoading && !isError && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-sage/30 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate">{review.cycleCode}</span>
                  </div>
                  {review.managerName ? (
                    <p className="text-sm text-slate mt-1">
                      Reviewer: <span className="font-medium text-charcoal">{review.managerName}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate mt-1">No reviewer assigned</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate">
                    <span>Self: {review.selfRating ?? '—'}</span>
                    <span>Manager: {review.managerRating ?? '—'}</span>
                    {review.finalRating !== null && (
                      <span className="font-semibold text-charcoal">Final: {review.finalRating}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ReviewStatusBadge review={review} />
                  <Link
                    href={`/manager/my-review/${review.id}`}
                    className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
