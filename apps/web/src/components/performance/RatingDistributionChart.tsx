/**
 * RatingDistributionChart — A-22 bar chart.
 *
 * Department x rating (1–5) + notRated breakdown.
 * Pure Tailwind bars — no chart library dependency.
 */

import { clsx } from 'clsx';
import type { DistributionBucket } from '@nexora/contracts/performance';

const RATING_COLORS: Record<string, string> = {
  rating1: 'bg-crimson',
  rating2: 'bg-umber',
  rating3: 'bg-forest',
  rating4: 'bg-emerald',
  rating5: 'bg-richgreen',
  notRated: 'bg-sage/40',
};

const RATING_LABELS: Record<string, string> = {
  rating1: '1 — Below',
  rating2: '2 — Needs Work',
  rating3: '3 — Meets',
  rating4: '4 — Exceeds',
  rating5: '5 — Outstanding',
  notRated: 'Not Rated',
};

const KEYS = ['rating1', 'rating2', 'rating3', 'rating4', 'rating5', 'notRated'] as const;

interface RatingDistributionChartProps {
  buckets: DistributionBucket[];
  className?: string;
}

function getBucketTotal(bucket: DistributionBucket): number {
  return (
    bucket.rating1 +
    bucket.rating2 +
    bucket.rating3 +
    bucket.rating4 +
    bucket.rating5 +
    bucket.notRated
  );
}

export function RatingDistributionChart({ buckets, className }: RatingDistributionChartProps) {
  if (buckets.length === 0) {
    return (
      <div className={clsx('text-sm text-slate text-center py-8', className)}>
        No distribution data available for this cycle.
      </div>
    );
  }

  // Find max total for scaling bars.
  const maxTotal = Math.max(...buckets.map(getBucketTotal), 1);

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Legend */}
      <div className="flex flex-wrap gap-3" aria-label="Legend">
        {KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate">
            <span className={clsx('w-3 h-3 rounded-sm flex-shrink-0', RATING_COLORS[key])} aria-hidden="true" />
            {RATING_LABELS[key]}
          </div>
        ))}
      </div>

      {/* Bars per department */}
      <div className="space-y-5">
        {buckets.map((bucket) => {
          const total = getBucketTotal(bucket);
          return (
            <div key={bucket.department}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-charcoal">{bucket.department}</span>
                <span className="text-xs text-slate">{total} employees</span>
              </div>
              {/* Stacked bar */}
              <div
                className="flex h-8 rounded-lg overflow-hidden bg-offwhite border border-sage/30"
                role="img"
                aria-label={`${bucket.department} distribution: ${KEYS.map((k) => `${RATING_LABELS[k]}: ${bucket[k as keyof DistributionBucket]}`).join(', ')}`}
              >
                {KEYS.map((key) => {
                  const count = bucket[key as keyof DistributionBucket] as number;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={key}
                      title={`${RATING_LABELS[key]}: ${count}`}
                      style={{ width: `${pct}%` }}
                      className={clsx('h-full transition-all', RATING_COLORS[key])}
                    />
                  );
                })}
              </div>
              {/* Count labels */}
              <div className="flex gap-3 mt-1 flex-wrap">
                {KEYS.map((key) => {
                  const count = bucket[key as keyof DistributionBucket] as number;
                  if (count === 0) return null;
                  return (
                    <span key={key} className="text-[10px] text-slate">
                      <span className={clsx('inline-block w-2 h-2 rounded-sm mr-0.5', RATING_COLORS[key])} aria-hidden="true" />
                      {count}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label="Rating distribution table">
          <thead>
            <tr className="border-b border-sage/30">
              <th className="text-left py-2 pr-4 font-semibold text-charcoal">Department</th>
              {KEYS.map((key) => (
                <th key={key} className="text-center py-2 px-2 font-semibold text-charcoal whitespace-nowrap">
                  {RATING_LABELS[key]}
                </th>
              ))}
              <th className="text-center py-2 px-2 font-semibold text-charcoal">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/20">
            {buckets.map((bucket) => (
              <tr key={bucket.department} className="hover:bg-offwhite">
                <td className="py-2 pr-4 font-medium text-charcoal">{bucket.department}</td>
                {KEYS.map((key) => (
                  <td key={key} className="text-center py-2 px-2 text-slate">
                    {bucket[key as keyof DistributionBucket] as number}
                  </td>
                ))}
                <td className="text-center py-2 px-2 font-semibold text-charcoal">
                  {getBucketTotal(bucket)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
