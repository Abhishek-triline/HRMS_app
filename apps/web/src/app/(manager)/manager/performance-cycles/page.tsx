'use client';

/**
 * M-08 — Manager Performance Cycles.
 * Visual reference: prototype/manager/performance-cycles.html
 *
 * Shows active + past cycles relevant to manager's team.
 * Links to the review queue for each cycle.
 */

import Link from 'next/link';
import { useCycles } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { CYCLE_STATUS } from '@/lib/status/maps';

export default function ManagerPerformanceCyclesPage() {
  const { data, isLoading, isError } = useCycles();
  const cycles = data?.data ?? [];
  const activeCycle = cycles.find((c) => c.status !== CYCLE_STATUS.Closed);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Performance Cycles</h1>
        <p className="text-sm text-slate mt-0.5">Your team&apos;s review cycles</p>
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
              <h2 className="font-heading text-xl font-bold mb-1">
                {activeCycle.fyStart} — {activeCycle.fyEnd}
              </h2>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-mint/70 mb-0.5">Self-Review Deadline</div>
                  <div className="text-sm font-bold">{activeCycle.selfReviewDeadline}</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-xs text-mint/70 mb-0.5">Manager-Review Deadline</div>
                  <div className="text-sm font-bold">{activeCycle.managerReviewDeadline}</div>
                </div>
              </div>
            </div>
            <div>
              <Link
                href="/manager/performance"
                className="bg-mint text-forest hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors block text-center"
              >
                Review Queue
              </Link>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load cycles. Please try again.
        </div>
      )}

      {!isLoading && !isError && cycles.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-sage/30">
          <table className="w-full text-sm" aria-label="Performance cycles">
            <thead className="bg-offwhite border-b border-sage/30">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Cycle</th>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Period</th>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Deadlines</th>
                <th className="text-right py-3 px-4 font-semibold text-charcoal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/20">
              {cycles.map((cycle) => (
                <tr key={cycle.id} className="hover:bg-offwhite/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-charcoal">{cycle.code}</td>
                  <td className="py-3 px-4 text-slate">
                    {cycle.fyStart} – {cycle.fyEnd}
                  </td>
                  <td className="py-3 px-4">
                    <CycleStatusBadge status={cycle.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate">
                    <div>Self: {cycle.selfReviewDeadline}</div>
                    <div>Mgr: {cycle.managerReviewDeadline}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href="/manager/performance"
                      className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                    >
                      Reviews →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && cycles.length === 0 && (
        <div className="text-center py-12 border border-sage/30 rounded-xl text-sm text-slate">
          No performance cycles found.
        </div>
      )}
    </>
  );
}
