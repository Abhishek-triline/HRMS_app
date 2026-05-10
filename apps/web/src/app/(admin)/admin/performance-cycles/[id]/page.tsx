'use client';

/**
 * A-21 — Performance Cycle Detail (Admin).
 *
 * Shows cycle metadata, all reviews with status, Close Cycle CTA,
 * and links to distribution report and missing reviews report.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCycle, useCloseCycle } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { ReviewStatusBadge } from '@/components/performance/ReviewStatusBadge';
import { CloseCycleModal } from '@/components/performance/CloseCycleModal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';

export default function CycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [closeOpen, setCloseOpen] = useState(false);

  const { data, isLoading, isError } = useCycle(id);
  const { mutateAsync: closeCycle, isPending: isClosing } = useCloseCycle(id);

  async function handleClose(cycleId: string, version: number) {
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
          Failed to load cycle. It may not exist or you may not have access.
        </div>
      </div>
    );
  }

  const { cycle, reviews } = data;
  const isClosed = cycle.status === 'Closed';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate mb-5" aria-label="Breadcrumb">
        <Link href="/admin/performance-cycles" className="hover:text-forest transition-colors">
          Performance Cycles
        </Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{cycle.code}</span>
      </nav>

      {/* Cycle header */}
      <div className="bg-white rounded-xl border border-sage/30 p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CycleStatusBadge status={cycle.status} />
              <span className="text-slate text-xs">{cycle.code}</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-charcoal">
              {cycle.fyStart} — {cycle.fyEnd}
            </h1>
            <p className="text-sm text-slate mt-1">
              {cycle.participants} participants · Created by {cycle.createdByName}
              {cycle.closedByName && ` · Closed by ${cycle.closedByName}`}
            </p>
          </div>
          {!isClosed && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCloseOpen(true)}
              leadingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            >
              Close Cycle
            </Button>
          )}
        </div>

        {/* Deadline pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Self-Review Deadline', value: cycle.selfReviewDeadline },
            { label: 'Manager-Review Deadline', value: cycle.managerReviewDeadline },
            { label: 'Participants', value: String(cycle.participants) },
            { label: 'Phase', value: cycle.status },
          ].map(({ label, value }) => (
            <div key={label} className="bg-offwhite rounded-lg px-3 py-2.5">
              <div className="text-xs text-slate mb-0.5">{label}</div>
              <div className="text-sm font-bold text-charcoal">{value}</div>
            </div>
          ))}
        </div>

        {/* Report links */}
        <div className="flex gap-3 mt-4">
          <Link
            href={`/admin/performance-cycles/${id}/distribution`}
            className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
          >
            Rating Distribution Report →
          </Link>
          <Link
            href={`/admin/performance-cycles/${id}/missing`}
            className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
          >
            Missing Reviews →
          </Link>
        </div>
      </div>

      {/* Reviews table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg font-bold text-charcoal">
          Reviews <span className="text-slate font-normal text-sm">({reviews.length})</span>
        </h2>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-10 border border-sage/30 rounded-xl text-sm text-slate">
          No reviews in this cycle.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sage/30">
          <table className="w-full text-sm" aria-label="Cycle reviews">
            <thead className="bg-offwhite border-b border-sage/30">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Employee</th>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-charcoal">Manager</th>
                <th className="text-center py-3 px-4 font-semibold text-charcoal">Self</th>
                <th className="text-center py-3 px-4 font-semibold text-charcoal">Manager</th>
                <th className="text-center py-3 px-4 font-semibold text-charcoal">Final</th>
                <th className="text-center py-3 px-4 font-semibold text-charcoal">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-charcoal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/20">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-offwhite/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-charcoal">{review.employeeName}</div>
                    <div className="text-xs text-slate">{review.employeeCode}</div>
                  </td>
                  <td className="py-3 px-4 text-slate">{review.department ?? '—'}</td>
                  <td className="py-3 px-4 text-slate">
                    {review.managerName ?? <span className="text-crimson text-xs font-semibold">Unassigned</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {review.selfRating !== null ? (
                      <span className="font-semibold text-charcoal">{review.selfRating}</span>
                    ) : (
                      <span className="text-sage text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {review.managerRating !== null ? (
                      <span className="font-semibold text-charcoal">{review.managerRating}</span>
                    ) : (
                      <span className="text-sage text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {review.finalRating !== null ? (
                      <span className="font-bold text-charcoal">{review.finalRating}</span>
                    ) : (
                      <span className="text-sage text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ReviewStatusBadge review={review} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/performance/${review.id}`}
                      className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Close cycle modal */}
      <CloseCycleModal
        isOpen={closeOpen}
        onClose={() => setCloseOpen(false)}
        cycle={cycle}
        onConfirm={handleClose}
        isSubmitting={isClosing}
      />
    </div>
  );
}
