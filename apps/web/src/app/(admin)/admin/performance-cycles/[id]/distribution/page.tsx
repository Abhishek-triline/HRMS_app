'use client';

/**
 * A-22 — Rating Distribution Report (Admin).
 * Visual reference: prototype/admin/rating-report.html
 *
 * Bar chart per department × rating 1–5 + notRated.
 * Pure Tailwind bars — no chart library.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDistribution, useCycle } from '@/lib/hooks/usePerformance';
import { RatingDistributionChart } from '@/components/performance/RatingDistributionChart';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { Spinner } from '@/components/ui/Spinner';

export default function DistributionReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data: cycleData, isLoading: cycleLoading } = useCycle(id);
  const { data, isLoading, isError } = useDistribution(id);

  const isLoadingAny = isLoading || cycleLoading;
  const cycle = cycleData?.cycle;

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        <span className="text-charcoal font-medium">Rating Distribution</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">Rating Distribution Report</h1>
          {cycle && (
            <div className="flex items-center gap-2 mt-1">
              <CycleStatusBadge status={cycle.status} />
              <span className="text-sm text-slate">{cycle.code} · {cycle.fyStart} – {cycle.fyEnd}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/performance-cycles/${id}/missing`}
            className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
          >
            Missing Reviews →
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
          Failed to load distribution data. Please try again.
        </div>
      )}

      {!isLoadingAny && !isError && data && (
        <div className="bg-white rounded-xl border border-sage/30 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-charcoal">Department Breakdown</h2>
            <span className="text-xs text-slate">
              {data.buckets.length} department{data.buckets.length !== 1 ? 's' : ''}
            </span>
          </div>
          <RatingDistributionChart buckets={data.buckets} />
        </div>
      )}
    </div>
  );
}
