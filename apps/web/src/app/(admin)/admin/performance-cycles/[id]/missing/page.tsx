'use client';

/**
 * A-23 — Missing Reviews Report (Admin).
 * Visual reference: prototype/admin/missing-reviews.html
 *
 * Lists employees with no submitted manager rating in the current cycle.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMissingReviews, useCycle } from '@/lib/hooks/usePerformance';
import { MissingReviewsTable } from '@/components/performance/MissingReviewsTable';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { Spinner } from '@/components/ui/Spinner';

export default function MissingReviewsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: cycleData, isLoading: cycleLoading } = useCycle(id);
  const { data, isLoading, isError } = useMissingReviews(id);

  const isLoadingAny = isLoading || cycleLoading;
  const cycle = cycleData?.cycle;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate mb-5" aria-label="Breadcrumb">
        <Link href="/admin/performance-cycles" className="hover:text-forest transition-colors">
          Performance
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/admin/performance-cycles/${id}`} className="hover:text-forest transition-colors">
          {cycle?.code ?? 'Cycle'}
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">Missing Reviews</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">Missing Reviews</h1>
          {cycle && (
            <div className="flex items-center gap-2 mt-1">
              <CycleStatusBadge status={cycle.status} />
              <span className="text-sm text-slate">{cycle.code} · {cycle.fyStart} – {cycle.fyEnd}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/performance-cycles/${id}/distribution`}
            className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
          >
            Rating Report →
          </Link>
        </div>
      </div>

      {isLoadingAny && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load missing reviews data. Please try again.
        </div>
      )}

      {!isLoadingAny && !isError && data && (
        <>
          {data.items.length > 0 && (
            <div className="bg-umberbg border border-umber/30 rounded-xl px-5 py-3 mb-5 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-umber flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19.07a10 10 0 1114.14 0H4.93z" />
              </svg>
              <p className="text-sm text-umber">
                <strong>{data.items.length} review{data.items.length !== 1 ? 's' : ''}</strong> pending completion.
                Manager ratings are required before closing the cycle.
              </p>
            </div>
          )}
          <MissingReviewsTable
            items={data.items}
            reviewBasePath="/admin/performance"
          />
        </>
      )}
    </>
  );
}
