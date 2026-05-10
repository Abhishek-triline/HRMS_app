'use client';

/**
 * A-20 — Performance Cycles List (Admin).
 * Visual reference: prototype/admin/performance-cycles.html
 *
 * Features:
 * - Active cycle highlight card at the top.
 * - Paginated cycle list with status filter.
 * - "Create Cycle" CTA links to /admin/performance-cycles/new.
 * - Links to Rating Report and Missing Reviews.
 */

import Link from 'next/link';
import { useState } from 'react';
import { useCycles } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { CycleStatus } from '@nexora/contracts/performance';

const STATUS_OPTIONS: Array<{ label: string; value: CycleStatus | '' }> = [
  { label: 'All Status', value: '' },
  { label: 'Open', value: 'Open' },
  { label: 'Self-Review', value: 'Self-Review' },
  { label: 'Manager-Review', value: 'Manager-Review' },
  { label: 'Closed', value: 'Closed' },
];

export default function PerformanceCyclesPage() {
  const [status, setStatus] = useState<CycleStatus | ''>('');

  const { data, isLoading, isError } = useCycles({
    status: status || undefined,
  });

  const cycles = data?.data ?? [];
  const activeCycle = cycles.find((c) => c.status !== 'Closed');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">Performance Cycles</h1>
          <p className="text-sm text-slate mt-0.5">Half-yearly review cycles · April–September &amp; October–March</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="#"
            className="text-xs text-emerald font-semibold hover:underline"
          >
            Rating Report
          </Link>
          <Link
            href="#"
            className="text-xs text-emerald font-semibold hover:underline"
          >
            Missing Reviews
          </Link>
          <Link href="/admin/performance-cycles/new">
            <Button
              variant="primary"
              leadingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Create Cycle
            </Button>
          </Link>
        </div>
      </div>

      {/* Active cycle highlight */}
      {activeCycle && (
        <div className="bg-forest text-white rounded-xl px-6 py-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CycleStatusBadge status={activeCycle.status} />
                <span className="text-mint/80 text-xs">{activeCycle.code}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1">
                {new Date(activeCycle.fyStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                {' – '}
                {new Date(activeCycle.fyEnd).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-mint/80 text-sm mb-4">
                Started {activeCycle.fyStart} · {activeCycle.participants} employees enrolled
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-mint/70 mb-0.5">Self-Review Deadline</div>
                  <div className="text-sm font-bold">{activeCycle.selfReviewDeadline}</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-mint/70 mb-0.5">Manager-Review Deadline</div>
                  <div className="text-sm font-bold">{activeCycle.managerReviewDeadline}</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-mint/70 mb-0.5">Participants</div>
                  <div className="text-sm font-bold">{activeCycle.participants}</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-mint/70 mb-0.5">Phase</div>
                  <div className="text-sm font-bold">{activeCycle.status}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link
                href={`/admin/performance-cycles/${activeCycle.id}`}
                className="bg-mint text-forest hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-center"
              >
                View Cycle
              </Link>
              <Link
                href={`/admin/performance-cycles/${activeCycle.id}/distribution`}
                className="border border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-semibold text-center transition-colors"
              >
                Rating Report
              </Link>
              <Link
                href={`/admin/performance-cycles/${activeCycle.id}/missing`}
                className="border border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-semibold text-center transition-colors"
              >
                Missing Reviews
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CycleStatus | '')}
          aria-label="Filter by cycle status"
          className="border border-sage/60 rounded-lg px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate">
          {cycles.length} cycle{cycles.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Cycle table */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load performance cycles. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {cycles.length === 0 ? (
            <div className="text-center py-16 border border-sage/30 rounded-xl">
              <svg className="w-12 h-12 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-slate text-sm">No performance cycles found.</p>
              <Link href="/admin/performance-cycles/new" className="mt-3 inline-block text-sm font-semibold text-emerald hover:underline">
                Create the first cycle
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-sage/30">
              <table className="w-full text-sm" aria-label="Performance cycles">
                <thead className="bg-offwhite border-b border-sage/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-charcoal">Cycle</th>
                    <th className="text-left py-3 px-4 font-semibold text-charcoal">Period</th>
                    <th className="text-left py-3 px-4 font-semibold text-charcoal">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-charcoal">Participants</th>
                    <th className="text-left py-3 px-4 font-semibold text-charcoal">Deadlines</th>
                    <th className="text-right py-3 px-4 font-semibold text-charcoal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {cycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-offwhite/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-charcoal">{cycle.code}</div>
                        {cycle.closedAt && (
                          <div className="text-xs text-slate mt-0.5">
                            Closed {new Date(cycle.closedAt).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate">
                        <div>{cycle.fyStart}</div>
                        <div className="text-xs">to {cycle.fyEnd}</div>
                      </td>
                      <td className="py-3 px-4">
                        <CycleStatusBadge status={cycle.status} />
                      </td>
                      <td className="py-3 px-4 text-slate">{cycle.participants}</td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-slate">Self: {cycle.selfReviewDeadline}</div>
                        <div className="text-xs text-slate">Mgr: {cycle.managerReviewDeadline}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/performance-cycles/${cycle.id}`}
                            className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                          >
                            View
                          </Link>
                          {cycle.status !== 'Closed' && (
                            <>
                              <span className="text-sage/40">·</span>
                              <Link
                                href={`/admin/performance-cycles/${cycle.id}/distribution`}
                                className="text-xs font-semibold text-slate hover:text-charcoal transition-colors"
                              >
                                Report
                              </Link>
                              <span className="text-sage/40">·</span>
                              <Link
                                href={`/admin/performance-cycles/${cycle.id}/missing`}
                                className="text-xs font-semibold text-slate hover:text-charcoal transition-colors"
                              >
                                Missing
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
