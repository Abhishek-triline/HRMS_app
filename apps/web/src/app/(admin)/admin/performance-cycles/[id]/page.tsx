'use client';

/**
 * A-21 — Performance Cycle Detail (Admin).
 *
 * Visual reference: prototype/admin/performance-detail.html
 *
 * Layout:
 *   1. Horizontal info bar: Active pill | Period | Self-review due |
 *      Manager-review due | pending count link.
 *   2. Two tabs: Employee Reviews (default) | Reports.
 *   3. Tab 1 — filter bar (Department + Status + Apply + result count)
 *      then reviews table with Goals column + differentiated status badges.
 *   4. Tab 2 — report card links (distribution + missing).
 *
 * CTAs: Close Cycle (crimson, existing mutation).
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCycle, useCloseCycle } from '@/lib/hooks/usePerformance';
import { CycleStatusBadge } from '@/components/performance/CycleStatusBadge';
import { CloseCycleModal } from '@/components/performance/CloseCycleModal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import { clsx } from 'clsx';
import type { PerformanceReviewSummary } from '@nexora/contracts/performance';

// ── Inline review status badge matching prototype exactly ───────────────────

function ReviewStatusInline({ review }: { review: PerformanceReviewSummary }) {
  if (review.isMidCycleJoiner) {
    return (
      <span className="bg-gray-100 text-slate text-xs font-bold px-2 py-1 rounded">
        Mid-cycle joiner — Skipped
      </span>
    );
  }
  if (review.finalRating !== null) {
    return (
      <span className="bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded">
        Complete
      </span>
    );
  }
  if (review.selfRating !== null && review.managerRating === null) {
    return (
      <span className="bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded">
        Self done, Mgr pending
      </span>
    );
  }
  if (review.selfRating === null && review.managerRating === null) {
    return (
      <span className="bg-crimsonbg text-crimson text-xs font-bold px-2 py-1 rounded">
        Not started
      </span>
    );
  }
  // Both ratings but no final (cycle still open)
  return (
    <span className="bg-softmint text-forest text-xs font-bold px-2 py-1 rounded">
      Mgr rated
    </span>
  );
}

// ── Inline "Mgr changed" pill for employee name cell ──────────────────────

function MgrChangedPill() {
  return (
    <span
      title="Reporting manager changed mid-cycle. Both are kept on the review record for audit."
      className="bg-umberbg text-umber text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide cursor-help"
    >
      Mgr changed
    </span>
  );
}

// ── Pending count (not started + self done mgr pending) ──────────────────

function pendingCount(reviews: PerformanceReviewSummary[]): number {
  return reviews.filter(
    (r) =>
      !r.isMidCycleJoiner &&
      r.finalRating === null &&
      (r.selfRating === null || r.managerRating === null),
  ).length;
}

// ── Main page ───────────────────────────────────────────────────────────────

type Tab = 'reviews' | 'reports';

export default function CycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [closeOpen, setCloseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('reviews');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applied, setApplied] = useState({ dept: '', status: '' });

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

  // Derive unique departments from reviews for the filter select
  const departments = useMemo(() => {
    if (!data) return [];
    const depts = new Set(data.reviews.map((r) => r.department).filter(Boolean) as string[]);
    return Array.from(depts).sort();
  }, [data]);

  // Apply filters
  const filteredReviews = useMemo(() => {
    if (!data) return [];
    return data.reviews.filter((r) => {
      if (applied.dept && r.department !== applied.dept) return false;
      if (applied.status === 'skipped') return r.isMidCycleJoiner;
      if (applied.status === 'complete') return r.finalRating !== null;
      if (applied.status === 'self-pending') return !r.isMidCycleJoiner && r.selfRating === null && r.finalRating === null;
      if (applied.status === 'mgr-pending') return !r.isMidCycleJoiner && r.selfRating !== null && r.managerRating === null;
      return true;
    });
  }, [data, applied]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson">
        Failed to load cycle. It may not exist or you may not have access.
      </div>
    );
  }

  const { cycle, reviews } = data;
  const isClosed = cycle.status === 'Closed';
  const pending = pendingCount(reviews);

  return (
    <>
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

      {/* Page title row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">
            {cycle.code} — FY {cycle.fyStart.slice(0, 4)}-{cycle.fyEnd.slice(2, 4)}
          </h1>
          <p className="text-xs text-slate mt-0.5">
            {cycle.participants} participants · Created by {cycle.createdByName}
            {cycle.closedByName ? ` · Closed by ${cycle.closedByName}` : ''}
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

      {/* Horizontal info bar — prototype: prototype/admin/performance-detail.html */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-4 mb-6 flex items-center gap-6 flex-wrap">
        {/* Status pill */}
        <div className="flex items-center gap-2">
          <CycleStatusBadge status={cycle.status} />
        </div>
        <div className="h-4 w-px bg-sage/40" aria-hidden="true" />
        {/* Period */}
        <div className="text-sm text-slate">
          <span className="font-semibold text-charcoal">Period:</span>{' '}
          {new Date(cycle.fyStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' – '}
          {new Date(cycle.fyEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div className="h-4 w-px bg-sage/40" aria-hidden="true" />
        {/* Self-review due */}
        <div className="text-sm text-slate">
          <span className="font-semibold text-charcoal">Self-review:</span>{' '}
          due{' '}
          <span className="text-umber font-semibold">
            {new Date(cycle.selfReviewDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="h-4 w-px bg-sage/40" aria-hidden="true" />
        {/* Manager-review due */}
        <div className="text-sm text-slate">
          <span className="font-semibold text-charcoal">Manager-review:</span>{' '}
          due{' '}
          <span className="font-semibold text-slate">
            {new Date(cycle.managerReviewDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        {/* Pending count link — ml-auto pushes to right */}
        <div className="ml-auto">
          {pending > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className="text-xs text-crimson font-semibold hover:underline flex items-center gap-1"
              aria-label={`${pending} pending reviews — switch to reviews tab`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {pending} pending reviews
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-sage/30 mb-6">
        <div className="flex gap-0">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={clsx(
              'px-6 py-3 text-sm border-b-2 transition-colors',
              activeTab === 'reviews'
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-slate hover:text-charcoal',
            )}
            aria-selected={activeTab === 'reviews'}
            role="tab"
          >
            Employee Reviews
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={clsx(
              'px-6 py-3 text-sm border-b-2 transition-colors',
              activeTab === 'reports'
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-slate hover:text-charcoal',
            )}
            aria-selected={activeTab === 'reports'}
            role="tab"
          >
            Reports
          </button>
        </div>
      </div>

      {/* Tab 1: Employee Reviews */}
      {activeTab === 'reviews' && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-5">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-sage/60 rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-forest transition-colors bg-white"
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-sage/60 rounded-lg px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-forest transition-colors bg-white"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="self-pending">Self-review pending</option>
              <option value="mgr-pending">Manager review pending</option>
              <option value="complete">Complete</option>
              <option value="skipped">Skipped</option>
            </select>
            <button
              type="button"
              onClick={() => setApplied({ dept: deptFilter, status: statusFilter })}
              className="border border-sage text-slate hover:border-forest hover:text-forest px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Apply
            </button>
            <span className="text-xs text-slate ml-auto">
              Showing {filteredReviews.length} of {reviews.length} employees
            </span>
          </div>

          {/* Reviews table */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Cycle reviews">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/30">
                    <th scope="col" className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Employee</th>
                    <th scope="col" className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">EMP Code</th>
                    <th scope="col" className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Department</th>
                    <th scope="col" className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Self Rating</th>
                    <th scope="col" className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Mgr Rating</th>
                    <th scope="col" className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Status</th>
                    <th scope="col" className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Goals</th>
                    <th scope="col" className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate text-sm">
                        No reviews match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map((review) => (
                      <tr
                        key={review.id}
                        className={clsx(
                          'hover:bg-offwhite/60 transition-colors',
                          review.isMidCycleJoiner && 'bg-offwhite/30',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={clsx('font-medium', review.isMidCycleJoiner ? 'text-slate' : 'text-charcoal')}>
                              {review.employeeName}
                            </span>
                            {/* previousManagerId only on full review; PerformanceReviewSummary doesn't include it */}
                            {(review as { previousManagerId?: string | null }).previousManagerId && <MgrChangedPill />}
                          </div>
                        </td>
                        <td className={clsx('px-5 py-3.5 font-mono text-xs', review.isMidCycleJoiner ? 'text-slate/60' : 'text-forest')}>
                          {review.employeeCode}
                        </td>
                        <td className="px-5 py-3.5 text-slate">
                          {review.department ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {review.selfRating !== null ? (
                            <>
                              <span className="font-semibold text-charcoal">{review.selfRating}</span>
                              <span className="text-slate text-xs"> / 5</span>
                            </>
                          ) : (
                            <span className="text-slate text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {review.managerRating !== null ? (
                            <>
                              <span className="font-semibold text-charcoal">{review.managerRating}</span>
                              <span className="text-slate text-xs"> / 5</span>
                            </>
                          ) : (
                            <span className="text-slate text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <ReviewStatusInline review={review} />
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate">
                          {/* Goals count not in PerformanceReviewSummary — show dash */}
                          —
                        </td>
                        <td className="px-5 py-3.5">
                          {review.isMidCycleJoiner ? (
                            <span className="text-xs text-slate/50 italic">Skipped</span>
                          ) : (
                            <Link
                              href={`/admin/performance/${review.id}`}
                              className="border border-sage text-slate hover:border-forest hover:text-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-block"
                            >
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reports */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link
            href={`/admin/performance-cycles/${id}/distribution`}
            className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 hover:border-forest hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-softmint flex items-center justify-center shrink-0 group-hover:bg-mint transition-colors">
                <svg className="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-charcoal group-hover:text-forest transition-colors">
                  Rating Distribution Report
                </h3>
                <p className="text-sm text-slate mt-1">
                  View how ratings are distributed across employees and departments.
                </p>
                <span className="inline-flex items-center gap-1 text-forest text-sm font-semibold mt-3">
                  View Report
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          <Link
            href={`/admin/performance-cycles/${id}/missing`}
            className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 hover:border-crimson hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-crimsonbg flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-charcoal group-hover:text-crimson transition-colors">
                  Missing Reviews Report
                </h3>
                <p className="text-sm text-slate mt-1">
                  See which employees and managers have not submitted their reviews.
                </p>
                {pending > 0 && (
                  <span className="inline-flex items-center gap-1 text-crimson text-sm font-semibold mt-3">
                    {pending} pending
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </Link>
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
    </>
  );
}
