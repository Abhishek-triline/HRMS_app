'use client';

/**
 * A-20 — Performance Cycles List (Admin).
 * Visual reference: prototype/admin/performance-cycles.html
 *
 * Features:
 * - Active cycle highlight card with Self-Reviews + Manager Ratings progress stats.
 * - Edit Dates modal (outlined CTA) and Close Cycle (crimson CTA).
 * - Past Cycles table with Reviewed and Avg Rating columns.
 * - "Create Cycle" CTA links to /admin/performance-cycles/new.
 */

import Link from 'next/link';
import { useState } from 'react';
import { useCycles, useCloseCycle } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { CloseCycleModal } from '@/components/performance/CloseCycleModal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import type { PerformanceCycleSummary } from '@nexora/contracts/performance';
import { CYCLE_STATUS } from '@/lib/status/maps';

// ── Edit Dates modal (simple inline modal) ───────────────────────────────────

function EditDatesModal({
  cycle,
  isOpen,
  onClose,
}: {
  cycle: PerformanceCycleSummary;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selfDeadline, setSelfDeadline] = useState(cycle.selfReviewDeadline);
  const [mgrDeadline, setMgrDeadline] = useState(cycle.managerReviewDeadline);

  if (!isOpen) return null;

  // Cap both deadline pickers to the cycle's own fiscal-year window. The
  // server already enforces that deadlines fall inside [fyStart, fyEnd] on
  // cycle creation; mirror that here so a careless edit can't drift out.
  // Manager deadline additionally can't be earlier than the self deadline.
  const fyStart = cycle.fyStart;
  const fyEnd = cycle.fyEnd;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-sage/20">
          <h2 className="font-heading font-bold text-lg text-charcoal">Edit Cycle Dates</h2>
          <p className="text-xs text-slate mt-0.5">
            {cycle.code} · FY window {fyStart} → {fyEnd}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">Self-Review Deadline</label>
            <input
              type="date"
              value={selfDeadline}
              min={fyStart}
              max={fyEnd}
              onChange={(e) => setSelfDeadline(e.target.value)}
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
            <p className="text-xs text-slate mt-1">Must fall within {fyStart} – {fyEnd}.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">Manager-Review Deadline</label>
            <input
              type="date"
              value={mgrDeadline}
              min={selfDeadline || fyStart}
              max={fyEnd}
              onChange={(e) => setMgrDeadline(e.target.value)}
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
            <p className="text-xs text-slate mt-1">
              On or after the self-review deadline, up to {fyEnd}.
            </p>
          </div>
          <p className="text-xs text-slate">
            Note: Editing cycle dates requires confirmation from Admin. Changes take effect immediately.
          </p>
        </div>
        <div className="p-6 border-t border-sage/20 flex gap-3">
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Save Changes
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Active cycle highlight sub-component ─────────────────────────────────────

function ActiveCycleCard({ cycle }: { cycle: PerformanceCycleSummary }) {
  const [closeOpen, setCloseOpen] = useState(false);
  const [editDatesOpen, setEditDatesOpen] = useState(false);
  const { mutateAsync: closeCycle, isPending: isClosing } = useCloseCycle(cycle.id);

  // Stats come from the list endpoint as part of PerformanceCycleSummary.
  const selfSubmitted = cycle.selfSubmitted;
  const mgrSubmitted = cycle.managerSubmitted;
  const total = cycle.participants;
  const selfPct = total > 0 ? Math.round((selfSubmitted / total) * 100) : 0;
  const mgrPct = total > 0 ? Math.round((mgrSubmitted / total) * 100) : 0;

  async function handleClose(cycleId: number, version: number) {
    try {
      await closeCycle({ confirm: 'CLOSE', version });
      showToast({ type: 'success', title: 'Cycle closed', message: 'All final ratings are now locked.' });
      setCloseOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ErrorCode.CYCLE_CLOSED) {
          showToast({ type: 'info', title: 'Already closed', message: 'This cycle has already been closed.' });
          setCloseOpen(false);
        } else {
          showToast({ type: 'error', title: 'Failed to close cycle', message: err.message });
        }
      }
    }
  }

  // Format date for subtitle
  const startFormatted = new Date(cycle.fyStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // We don't have midCycleJoiners count directly from the summary — show participants only
  return (
    <div className="bg-forest text-white rounded-xl px-6 py-5 mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-mint text-forest text-xs font-bold px-2 py-1 rounded">Active</span>
            <span className="text-mint/80 text-xs">{cycle.code}</span>
          </div>
          <h2 className="font-heading text-2xl font-bold mb-1">
            {new Date(cycle.fyStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            {' – '}
            {new Date(cycle.fyEnd).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-mint/80 text-sm mb-4">
            Started {startFormatted} · {total} employees enrolled
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg px-3 py-2.5">
              <div className="text-xs text-mint/70 mb-0.5">Self-Review Deadline</div>
              <div className="text-sm font-bold">{cycle.selfReviewDeadline}</div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2.5">
              <div className="text-xs text-mint/70 mb-0.5">Manager-Review Deadline</div>
              <div className="text-sm font-bold">{cycle.managerReviewDeadline}</div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2.5">
              <div className="text-xs text-mint/70 mb-0.5">Self-Reviews Submitted</div>
              <div className="text-sm font-bold">
                {selfSubmitted} / {total} <span className="text-mint/70 font-normal">({selfPct}%)</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2.5">
              <div className="text-xs text-mint/70 mb-0.5">Manager Ratings</div>
              <div className="text-sm font-bold">
                {mgrSubmitted} / {total} <span className="text-mint/70 font-normal">({mgrPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link
            href={`/admin/performance-cycles/${cycle.id}`}
            className="bg-mint text-forest hover:bg-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-center"
          >
            View Cycle
          </Link>
          <button
            type="button"
            onClick={() => setEditDatesOpen(true)}
            className="border border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Edit Dates
          </button>
          <button
            type="button"
            onClick={() => setCloseOpen(true)}
            className="border border-crimson/60 text-crimson bg-white hover:bg-crimsonbg px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            disabled={isClosing}
          >
            Close Cycle
          </button>
        </div>
      </div>

      <EditDatesModal
        cycle={cycle}
        isOpen={editDatesOpen}
        onClose={() => setEditDatesOpen(false)}
      />

      <CloseCycleModal
        isOpen={closeOpen}
        onClose={() => setCloseOpen(false)}
        cycle={{ id: cycle.id, code: cycle.code, version: 0 }}
        onConfirm={handleClose}
        isSubmitting={isClosing}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PerformanceCyclesPage() {
  const { data, isLoading, isError } = useCycles({});

  const cycles = data?.data ?? [];
  const activeCycle = cycles.find((c) => c.status !== CYCLE_STATUS.Closed);
  const pastCycles = cycles.filter((c) => c.status === CYCLE_STATUS.Closed);

  return (
    <>
      {/* Page section header — matches prototype */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-xl font-bold text-charcoal">Review Cycles</h2>
          <p className="text-xs text-slate mt-0.5">Two cycles per year · created and closed by Admin</p>
        </div>
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
          {/* Active cycle highlight */}
          {activeCycle && <ActiveCycleCard cycle={activeCycle} />}

          {!activeCycle && cycles.length === 0 && (
            <div className="text-center py-16 border border-sage/30 rounded-xl">
              <svg className="w-12 h-12 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-slate text-sm">No performance cycles found.</p>
              <Link href="/admin/performance-cycles/new" className="mt-3 inline-block text-sm font-semibold text-emerald hover:underline">
                Create the first cycle
              </Link>
            </div>
          )}

          {/* Past Cycles table */}
          {pastCycles.length > 0 && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
                <div className="px-5 py-4 border-b border-sage/20 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-charcoal">Past Cycles</h3>
                  <select className="border border-sage/50 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-forest/20">
                    <option>All Years</option>
                  </select>
                </div>
                <table className="w-full text-sm" aria-label="Past performance cycles">
                  <thead>
                    <tr className="bg-offwhite border-b border-sage/20">
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3 uppercase">Cycle</th>
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Dates</th>
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Employees</th>
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Reviewed</th>
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Avg Rating</th>
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Status</th>
                      <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/10">
                    {pastCycles.map((cycle) => (
                      <PastCycleRow key={cycle.id} cycle={cycle} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

// ── Past cycle row — fetches its reviews to compute Reviewed + Avg Rating ────

function PastCycleRow({ cycle }: { cycle: PerformanceCycleSummary }) {
  const finalised = cycle.finalised;
  const avgRating = cycle.avgFinalRating !== null ? cycle.avgFinalRating.toFixed(1) : '—';

  const startFmt = new Date(cycle.fyStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const endFmt = new Date(cycle.fyEnd).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  return (
    <tr className="hover:bg-offwhite/50">
      <td className="px-5 py-3 font-semibold text-charcoal">{cycle.code}</td>
      <td className="px-4 py-3 text-slate">{startFmt} – {endFmt}</td>
      <td className="px-4 py-3 text-slate">{cycle.participants}</td>
      <td className="px-4 py-3 text-slate">{finalised} / {cycle.participants}</td>
      <td className="px-4 py-3 font-semibold text-charcoal">{avgRating !== '—' ? `${avgRating} / 5` : '—'}</td>
      <td className="px-4 py-3">
        <CycleStatusBadge status={cycle.status} />
      </td>
      <td className="px-4 py-3">
        <Link href={`/admin/performance-cycles/${cycle.id}`} className="text-xs text-emerald font-semibold hover:underline">
          View →
        </Link>
      </td>
    </tr>
  );
}
