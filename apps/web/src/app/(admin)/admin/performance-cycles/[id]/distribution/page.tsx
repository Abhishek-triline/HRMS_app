'use client';

/**
 * A-22 — Rating Distribution Report (Admin).
 * Visual reference: prototype/admin/rating-report.html
 *
 * Layout (matches prototype):
 *   1. Cycle selector strip (current cycle + period + employees rated)
 *   2. 5 summary stat tiles (one per rating 1-5) with mini progress bar
 *   3. Overall rating distribution — 5 horizontal bars with count + %, legend
 *   4. Department breakdown table — Department/Employees/R5/R4/R3/R2/R1/Avg
 *
 * All numbers are derived client-side from the GET /performance/cycles/{id}/reports/distribution
 * response (DistributionBucketSchema). No backend change required.
 */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDistribution, useCycle, useCycles } from '@/lib/hooks/usePerformance';
import { Spinner } from '@/components/ui/Spinner';
import type { DistributionBucket } from '@nexora/contracts/performance';

// ── Rating colour map ─────────────────────────────────────────────────────────

const RATING_COLOURS: Record<1 | 2 | 3 | 4 | 5, { dot: string; bar: string; text: string; label: string }> = {
  5: { dot: 'bg-forest',   bar: 'bg-forest',   text: 'text-forest',   label: 'Rating 5 — Exceptional' },
  4: { dot: 'bg-emerald',  bar: 'bg-emerald',  text: 'text-emerald',  label: 'Rating 4 — Exceeds Expectations' },
  3: { dot: 'bg-mint border border-sage/40', bar: 'bg-mint', text: 'text-slate', label: 'Rating 3 — Meets Expectations' },
  2: { dot: 'bg-umber',    bar: 'bg-umber',    text: 'text-umber',    label: 'Rating 2 — Below Expectations' },
  1: { dot: 'bg-crimson',  bar: 'bg-crimson',  text: 'text-crimson',  label: 'Rating 1 — Unsatisfactory' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function totalForBucket(b: DistributionBucket): number {
  return b.rating1 + b.rating2 + b.rating3 + b.rating4 + b.rating5;
}

function avgForBucket(b: DistributionBucket): number | null {
  const total = totalForBucket(b);
  if (total === 0) return null;
  const sum = b.rating1 * 1 + b.rating2 * 2 + b.rating3 * 3 + b.rating4 * 4 + b.rating5 * 5;
  return Math.round((sum / total) * 10) / 10;
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

// CSV-safe cell — prefix formula-trigger chars to neutralise spreadsheet injection.
function csvCell(v: string | number): string {
  const s = String(v ?? '');
  const escaped = s.replace(/"/g, '""');
  const quoted = `"${/^[=+\-@\t\r]/.test(s) ? `'${escaped}` : escaped}"`;
  return quoted;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  // BOM so Excel detects UTF-8.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DistributionReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const idNum = Number(id);

  const { data: cycleData, isLoading: cycleLoading } = useCycle(idNum);
  const { data, isLoading, isError } = useDistribution(idNum);
  const { data: allCycles } = useCycles({});

  const isLoadingAny = isLoading || cycleLoading;
  const cycle = cycleData?.cycle;

  // Aggregate totals across all departments
  const buckets = data?.buckets ?? [];
  const totals = buckets.reduce(
    (acc, b) => ({
      rating1: acc.rating1 + b.rating1,
      rating2: acc.rating2 + b.rating2,
      rating3: acc.rating3 + b.rating3,
      rating4: acc.rating4 + b.rating4,
      rating5: acc.rating5 + b.rating5,
    }),
    { rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 },
  );
  const ratedTotal = totals.rating1 + totals.rating2 + totals.rating3 + totals.rating4 + totals.rating5;
  const overallAvg = ratedTotal > 0
    ? Math.round(
        ((totals.rating1 * 1 + totals.rating2 * 2 + totals.rating3 * 3 + totals.rating4 * 4 + totals.rating5 * 5) / ratedTotal) * 10,
      ) / 10
    : null;

  // Period text — "Apr 1, 2026 – Sep 30, 2026"
  const periodText = cycle
    ? `${new Date(cycle.fyStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(cycle.fyEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

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
        <span className="text-charcoal font-medium">Rating Distribution</span>
      </nav>

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
        <>
          {/* Cycle selector strip — dropdown + period + Export Report */}
          <div className="flex items-center gap-3 mb-7 flex-wrap">
            <label htmlFor="cycle-select" className="text-sm font-semibold text-slate">Cycle:</label>
            <select
              id="cycle-select"
              value={id}
              onChange={(e) => {
                const next = e.target.value;
                if (next && next !== id) {
                  router.push(`/admin/performance-cycles/${next}/distribution`);
                }
              }}
              className="border border-sage/60 rounded-lg px-4 py-2 text-sm text-charcoal focus:outline-none focus:border-forest transition-colors bg-white font-medium"
            >
              {(allCycles?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
              {/* Fallback option if the cycle list hasn't loaded but we know the current code */}
              {(!allCycles?.data?.length) && (
                <option value={id}>{data.cycleCode ?? cycle?.code ?? 'Current cycle'}</option>
              )}
            </select>
            <span className="text-xs text-slate">
              {periodText}
              {periodText && <>&nbsp;|&nbsp;</>}
              {ratedTotal} employee{ratedTotal !== 1 ? 's' : ''} rated
            </span>

            <div className="ml-auto flex items-center gap-3">
              <Link
                href={`/admin/performance-cycles/${id}/missing`}
                className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
              >
                Missing Reviews →
              </Link>
              <button
                type="button"
                onClick={() => {
                  const cycleCode = data.cycleCode ?? cycle?.code ?? 'cycle';
                  const rows: Array<Array<string | number>> = [
                    [`Rating Distribution Report — ${cycleCode}`],
                    [periodText || ''],
                    [`Employees rated: ${ratedTotal}`],
                    [],
                    ['Summary'],
                    ['Rating', 'Count', 'Percent'],
                    ['Rating 5', totals.rating5, `${pct(totals.rating5, ratedTotal)}%`],
                    ['Rating 4', totals.rating4, `${pct(totals.rating4, ratedTotal)}%`],
                    ['Rating 3', totals.rating3, `${pct(totals.rating3, ratedTotal)}%`],
                    ['Rating 2', totals.rating2, `${pct(totals.rating2, ratedTotal)}%`],
                    ['Rating 1', totals.rating1, `${pct(totals.rating1, ratedTotal)}%`],
                    ['Total', ratedTotal, '100%'],
                    [],
                    ['Department Breakdown'],
                    ['Department', 'Employees', 'Rating 5', 'Rating 4', 'Rating 3', 'Rating 2', 'Rating 1', 'Avg Rating'],
                    ...buckets.map((b) => [
                      b.department,
                      totalForBucket(b),
                      b.rating5,
                      b.rating4,
                      b.rating3,
                      b.rating2,
                      b.rating1,
                      avgForBucket(b) ?? '—',
                    ]),
                    ['All Departments', ratedTotal, totals.rating5, totals.rating4, totals.rating3, totals.rating2, totals.rating1, overallAvg ?? '—'],
                  ];
                  const safeName = String(cycleCode).replace(/[^a-zA-Z0-9._-]+/g, '-');
                  downloadCsv(`rating-distribution_${safeName}.csv`, rows);
                }}
                className="inline-flex items-center gap-2 border border-sage/60 text-charcoal bg-white hover:bg-offwhite px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                aria-label="Export rating distribution report as CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export Report
              </button>
            </div>
          </div>

          {/* Summary stat tiles — 5, one per rating */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {([5, 4, 3, 2, 1] as const).map((r) => {
              const count = totals[`rating${r}` as keyof typeof totals];
              const percent = pct(count, ratedTotal);
              const c = RATING_COLOURS[r];
              return (
                <div key={r} className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${c.dot}`} aria-hidden="true" />
                      <span className="font-heading font-bold text-sm text-charcoal">Rating {r}</span>
                    </div>
                    <span className="text-xs text-slate font-medium">{percent}%</span>
                  </div>
                  <p className="font-heading font-bold text-3xl text-charcoal">{count}</p>
                  <p className="text-xs text-slate mt-1">employee{count !== 1 ? 's' : ''}</p>
                  <div className="mt-3 h-1.5 bg-sage/20 rounded-full overflow-hidden">
                    <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Distribution bars */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-6">
            <h3 className="font-heading font-semibold text-base text-charcoal mb-5">
              Overall Rating Distribution
            </h3>
            <div className="space-y-4">
              {([5, 4, 3, 2, 1] as const).map((r) => {
                const count = totals[`rating${r}` as keyof typeof totals];
                const percent = pct(count, ratedTotal);
                const c = RATING_COLOURS[r];
                // Below 8% the count label won't fit inside the bar — render outside.
                const labelInside = percent >= 8;
                return (
                  <div key={r} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-semibold text-charcoal shrink-0">
                      Rating {r}
                    </div>
                    <div className="flex-1 h-8 bg-sage/10 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${c.bar} rounded-lg flex items-center justify-end pr-3`}
                        style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
                      >
                        {labelInside && (
                          <span className="text-white text-xs font-bold whitespace-nowrap">{count}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm text-slate shrink-0">
                      {!labelInside && count > 0 ? `${count}  ` : ''}({percent}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-sage/20 flex items-center gap-6 flex-wrap">
              {([5, 4, 3, 2, 1] as const).map((r) => {
                const c = RATING_COLOURS[r];
                return (
                  <div key={r} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${c.dot}`} aria-hidden="true" />
                    <span className="text-xs text-slate">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department breakdown table */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between">
              <h3 className="font-heading font-semibold text-base text-charcoal">
                Department Breakdown
              </h3>
              <span className="text-xs text-slate">
                {buckets.length} department{buckets.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/30">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Department</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Employees</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-forest text-xs uppercase tracking-wider">Rating 5</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-emerald text-xs uppercase tracking-wider">Rating 4</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Rating 3</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-umber text-xs uppercase tracking-wider">Rating 2</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-crimson text-xs uppercase tracking-wider">Rating 1</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Avg Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {buckets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate">
                        No ratings recorded yet for this cycle.
                      </td>
                    </tr>
                  ) : (
                    buckets.map((b) => {
                      const total = totalForBucket(b);
                      const avg = avgForBucket(b);
                      return (
                        <tr key={b.department} className="hover:bg-offwhite/60 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-charcoal">{b.department}</td>
                          <td className="px-5 py-3.5 text-center text-slate">{total}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-forest">{b.rating5}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-emerald">{b.rating4}</td>
                          <td className="px-5 py-3.5 text-center text-slate">{b.rating3}</td>
                          <td className="px-5 py-3.5 text-center text-umber font-medium">{b.rating2}</td>
                          <td className="px-5 py-3.5 text-center text-crimson font-medium">{b.rating1}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={avg !== null && avg >= 3.5 ? 'font-semibold text-richgreen' : 'font-semibold text-charcoal'}>
                              {avg !== null ? avg.toFixed(1) : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {buckets.length > 0 && (
                  <tfoot>
                    <tr className="bg-offwhite border-t-2 border-sage/30">
                      <td className="px-5 py-3.5 font-heading font-bold text-charcoal text-sm">All Departments</td>
                      <td className="px-5 py-3.5 text-center font-bold text-charcoal">{ratedTotal}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-forest">{totals.rating5}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-emerald">{totals.rating4}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate">{totals.rating3}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-umber">{totals.rating2}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-crimson">{totals.rating1}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-charcoal">
                        {overallAvg !== null ? overallAvg.toFixed(1) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
