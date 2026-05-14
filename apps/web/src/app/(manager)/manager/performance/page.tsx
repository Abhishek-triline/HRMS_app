'use client';

/**
 * Manager — Performance Queue.
 *
 * Lists subordinates' reviews that the manager needs to action:
 * - Goal setting (M-09): Open / Self-Review phase.
 * - Manager rating (M-10): Manager-Review phase.
 *
 * Shows review status and links to individual review pages.
 */

import Link from 'next/link';
import { useReviews } from '@/lib/hooks/usePerformance';
import { useMe } from '@/lib/hooks/useAuth';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { Spinner } from '@/components/ui/Spinner';

export default function ManagerPerformanceQueuePage() {
  const { data: auth } = useMe();
  const userId = auth?.data?.user?.id ?? '';

  // The page splits results into "Pending action" and "Completed" sections
  // client-side, which needs the full list. Bumped to the API max so up to
  // ~100 historical reviews fit. Beyond that (long-tenure manager with high
  // team turnover) we'd need server-side filter by finalRating presence
  // (not yet in ReviewListQuerySchema — v1.1 backlog).
  const { data, isLoading, isError } = useReviews({
    managerId: userId || undefined,
    limit: 100,
  });

  const reviews = data?.data ?? [];
  const pending = reviews.filter(
    (r) => !r.isMidCycleJoiner && r.finalRating === null,
  );
  const completed = reviews.filter(
    (r) => r.finalRating !== null || r.isMidCycleJoiner,
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Performance Queue</h1>
        <p className="text-sm text-slate mt-0.5">
          {pending.length} pending · {completed.length} completed
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load your review queue. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="font-heading text-sm font-bold text-charcoal uppercase tracking-wider mb-3">
                Action Required ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white rounded-xl border border-sage/30 px-5 py-4 flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center text-forest text-xs font-bold flex-shrink-0">
                      {review.employeeName
                        .trim()
                        .split(/\s+/)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-charcoal">{review.employeeName}</div>
                      <div className="text-xs text-slate">
                        {review.employeeCode}
                        {review.department ? ` · ${review.department}` : ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-slate">{review.cycleCode}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ReviewStatusBadge review={review} />
                      <Link
                        href={`/manager/performance/${review.id}`}
                        className="text-xs font-semibold text-emerald hover:text-forest transition-colors whitespace-nowrap"
                      >
                        Review →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="font-heading text-sm font-bold text-charcoal uppercase tracking-wider mb-3">
                Completed ({completed.length})
              </h2>
              <div className="overflow-x-auto rounded-xl border border-sage/30">
                <table className="w-full text-sm" aria-label="Completed reviews">
                  <thead className="bg-offwhite border-b border-sage/30">
                    <tr>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-charcoal">Employee</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-charcoal">Cycle</th>
                      <th scope="col" className="text-center py-3 px-4 font-semibold text-charcoal">Self</th>
                      <th scope="col" className="text-center py-3 px-4 font-semibold text-charcoal">Manager</th>
                      <th scope="col" className="text-center py-3 px-4 font-semibold text-charcoal">Final</th>
                      <th scope="col" className="text-right py-3 px-4"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/20">
                    {completed.map((review) => (
                      <tr key={review.id} className="hover:bg-offwhite/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-charcoal">{review.employeeName}</div>
                          <div className="text-xs text-slate">{review.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4 text-slate text-xs">{review.cycleCode}</td>
                        <td className="py-3 px-4 text-center font-semibold text-charcoal">
                          {review.selfRating ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-charcoal">
                          {review.managerRating ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-charcoal">
                          {review.finalRating ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/manager/performance/${review.id}`}
                            className="text-xs font-semibold text-slate hover:text-forest transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reviews.length === 0 && (
            <div className="text-center py-12 border border-sage/30 rounded-xl text-sm text-slate">
              No reviews assigned to you yet.
            </div>
          )}
        </>
      )}
    </>
  );
}
