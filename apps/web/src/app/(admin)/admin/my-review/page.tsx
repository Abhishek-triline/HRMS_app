'use client';

/**
 * Admin — My Review (BL-004, Option B).
 *
 * Admins get their own review row where the reviewer is a peer Admin
 * (not their reporting manager, which is null for Admins).
 * Shows a banner explaining the peer review structure.
 *
 * The review itself is read-only here — the actual self-rating is
 * submitted at /admin/performance/[reviewId].
 */

import Link from 'next/link';
import { useReviews } from '@/lib/hooks/usePerformance';
import { useMe } from '@/lib/hooks/useAuth';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminMyReviewPage() {
  const { data: auth } = useMe();
  const userId = auth?.data?.user?.id ?? '';

  const { data, isLoading, isError } = useReviews({
    employeeId: userId || undefined,
  });

  const reviews = data?.data ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">My Review</h1>
        <p className="text-sm text-slate mt-1">Your performance reviews across all cycles.</p>
      </div>

      {/* Option B banner */}
      <div className="bg-softmint border border-mint/50 rounded-xl px-5 py-4 mb-5 flex items-start gap-2.5">
        <svg className="w-5 h-5 text-forest flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm">
          <div className="font-semibold text-forest mb-0.5">Admin peer review (Option B)</div>
          <p className="text-xs text-charcoal/80 leading-relaxed">
            As an Admin, your performance is reviewed by a designated peer Admin rather than a
            reporting manager (since Admins have no reporting manager in the hierarchy).
            Your peer reviewer is shown in each cycle&apos;s review card below.
          </p>
        </div>
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
                    <p className="text-sm text-charcoal">
                      Peer reviewer:{' '}
                      <span className="font-semibold">{review.managerName}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-crimson font-semibold">No peer reviewer assigned</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate">
                    <span>Self: {review.selfRating ?? '—'}</span>
                    <span>Peer: {review.managerRating ?? '—'}</span>
                    {review.finalRating !== null && (
                      <span className="font-semibold text-charcoal">Final: {review.finalRating}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ReviewStatusBadge review={review} />
                  <Link
                    href={`/admin/performance/${review.id}`}
                    className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                  >
                    View review →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
