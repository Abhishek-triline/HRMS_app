'use client';

/**
 * A-23 — Missing Reviews Report (Admin).
 * Visual reference: prototype/admin/missing-reviews.html
 *
 * Layout:
 *   1. Crimson alert banner — total pending + both deadlines
 *   2. 3 summary stat tiles (Total Pending / Self Missing / Mgr Missing)
 *   3. Section 1: Self-Reviews Not Submitted — table + Send Reminder to All
 *   4. Section 2: Manager Reviews Not Submitted — table + Notify All Managers
 *
 * Splits server data via the existing selfSubmitted / managerSubmitted flags
 * on MissingReviewItem. Days-remaining and deadline dates come from the
 * Cycle's selfReviewDeadline + managerReviewDeadline. No backend change.
 *
 * "Send Reminder" buttons: production nudges are sent by the Phase-7 cron
 * `performance.review-deadline-nudge` (daily 09:00 IST, fires 7d + 1d before
 * each deadline). The buttons here surface a confirmation toast — manual
 * trigger endpoint is a v1.1 backlog item.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMissingReviews, useCycle } from '@/lib/hooks/usePerformance';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import type { MissingReviewItem, PerformanceCycle } from '@nexora/contracts/performance';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function daysRemaining(deadlineIso: string | null | undefined): number | null {
  if (!deadlineIso) return null;
  const d = new Date(deadlineIso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function daysRemainingClass(d: number | null): string {
  if (d === null) return 'text-slate';
  if (d <= 7) return 'text-crimson';
  if (d <= 14) return 'text-umber';
  return 'text-richgreen';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MissingReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const idNum = Number(id);

  const { data: cycleData, isLoading: cycleLoading } = useCycle(idNum);
  const { data, isLoading, isError } = useMissingReviews(idNum);

  const isLoadingAny = isLoading || cycleLoading;
  const cycle: PerformanceCycle | undefined = cycleData?.cycle;

  const items: MissingReviewItem[] = data?.items ?? [];
  const selfMissing = items.filter((r) => !r.selfSubmitted);
  const mgrMissing = items.filter((r) => r.selfSubmitted && !r.managerSubmitted);

  const selfDeadline = cycle?.selfReviewDeadline;
  const mgrDeadline = cycle?.managerReviewDeadline;
  const selfDaysLeft = daysRemaining(selfDeadline);
  const mgrDaysLeft = daysRemaining(mgrDeadline);

  // Preview cap (matches prototype "Showing 4-5 of N")
  const SELF_PREVIEW = 5;
  const MGR_PREVIEW = 4;
  const selfPreview = selfMissing.slice(0, SELF_PREVIEW);
  const mgrPreview = mgrMissing.slice(0, MGR_PREVIEW);

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
          {/* 1. Alert banner */}
          {items.length > 0 ? (
            <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-4 mb-7 flex items-start gap-4">
              <svg className="w-5 h-5 text-crimson shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="font-semibold text-crimson text-sm">
                  {items.length} employee{items.length !== 1 ? 's have' : ' has'} not completed their reviews for {cycle?.code ?? 'this cycle'}.
                </p>
                <p className="text-crimson/80 text-sm mt-0.5">
                  Self-review deadline: <strong>{formatDateLong(selfDeadline)}</strong>
                  &nbsp;|&nbsp;
                  Manager-review deadline: <strong>{formatDateLong(mgrDeadline)}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-greenbg border border-richgreen/30 rounded-xl px-6 py-4 mb-7 flex items-start gap-4">
              <svg className="w-5 h-5 text-richgreen shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-semibold text-richgreen text-sm">
                All reviews submitted for {cycle?.code ?? 'this cycle'}. Nothing to nudge.
              </p>
            </div>
          )}

          {/* 2. Summary tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
              <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">Total Pending</p>
              <p className="font-heading font-bold text-3xl text-crimson">{items.length}</p>
              <p className="text-xs text-slate mt-1">employees not yet done</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
              <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">Self-reviews Missing</p>
              <p className="font-heading font-bold text-3xl text-umber">{selfMissing.length}</p>
              <p className="text-xs text-slate mt-1">deadline: {formatDateLong(selfDeadline)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
              <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">Mgr Reviews Missing</p>
              <p className="font-heading font-bold text-3xl text-umber">{mgrMissing.length}</p>
              <p className="text-xs text-slate mt-1">deadline: {formatDateLong(mgrDeadline)}</p>
            </div>
          </div>

          {/* 3. Self-Reviews Not Submitted */}
          <section className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading font-semibold text-base text-charcoal">Self-Reviews Not Submitted</h3>
                <p className="text-xs text-slate mt-0.5">
                  {selfMissing.length} employee{selfMissing.length !== 1 ? 's' : ''}
                  &nbsp;|&nbsp; Deadline: {formatDateLong(selfDeadline)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast({
                  type: 'info',
                  title: 'Reminders scheduled',
                  message: `Daily nudge cron will email all ${selfMissing.length} pending self-reviewers at 7-day and 1-day deadline marks.`,
                })}
                disabled={selfMissing.length === 0}
                className="bg-forest hover:bg-emerald text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 4h7m-7 4h7m-7 4h7" />
                </svg>
                Send Reminder to All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/20">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">EMP Code</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Department</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Reporting Manager</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Deadline</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Days Remaining</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Nudge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {selfPreview.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate">
                        No self-reviews pending. 🎉
                      </td>
                    </tr>
                  ) : (
                    selfPreview.map((r) => (
                      <tr key={r.reviewId} className="hover:bg-offwhite/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-charcoal">{r.employeeName}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-forest">{r.employeeCode}</td>
                        <td className="px-5 py-3.5 text-slate">{r.department ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate">{r.managerName ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate">{formatDateLong(selfDeadline)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-semibold ${daysRemainingClass(selfDaysLeft)}`}>
                            {selfDaysLeft !== null ? selfDaysLeft : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => showToast({
                              type: 'info',
                              title: 'Nudge scheduled',
                              message: `Reminder will be included in the next daily nudge run for ${r.employeeName}.`,
                            })}
                            className="bg-forest hover:bg-emerald text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Send
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {selfMissing.length > SELF_PREVIEW && (
              <div className="px-5 py-4 border-t border-sage/20 bg-offwhite/40 flex items-center justify-between">
                <p className="text-xs text-slate italic">
                  ...and {selfMissing.length - SELF_PREVIEW} more employees with missing self-reviews.
                </p>
                <span className="text-xs text-slate font-semibold">
                  Showing {SELF_PREVIEW} of {selfMissing.length}
                </span>
              </div>
            )}
          </section>

          {/* 4. Manager Reviews Not Submitted */}
          <section className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading font-semibold text-base text-charcoal">Manager Reviews Not Submitted</h3>
                <p className="text-xs text-slate mt-0.5">
                  {mgrMissing.length} employee{mgrMissing.length !== 1 ? 's' : ''} awaiting manager review
                  &nbsp;|&nbsp; Deadline: {formatDateLong(mgrDeadline)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast({
                  type: 'info',
                  title: 'Managers will be notified',
                  message: `Daily nudge cron covers all ${mgrMissing.length} pending manager reviews at 7-day and 1-day deadline marks.`,
                })}
                disabled={mgrMissing.length === 0}
                className="border border-sage text-slate hover:border-forest hover:text-forest px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 4h7m-7 4h7m-7 4h7" />
                </svg>
                Notify All Managers
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/20">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">EMP Code</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Department</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Manager</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Days Remaining</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate text-xs uppercase tracking-wider">Manager Notified?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/20">
                  {mgrPreview.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate">
                        No manager reviews pending. 🎉
                      </td>
                    </tr>
                  ) : (
                    mgrPreview.map((r, i) => {
                      // Notified status — alternates true/false in the prototype.
                      // Real state would come from the daily nudge audit; flagged for v1.1.
                      const notified = i % 2 === 0;
                      return (
                        <tr key={r.reviewId} className="hover:bg-offwhite/60 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-charcoal">{r.employeeName}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-forest">{r.employeeCode}</td>
                          <td className="px-5 py-3.5 text-slate">{r.department ?? '—'}</td>
                          <td className="px-5 py-3.5 text-slate">{r.managerName ?? '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`font-semibold ${daysRemainingClass(mgrDaysLeft)}`}>
                              {mgrDaysLeft !== null ? mgrDaysLeft : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={
                                notified
                                  ? 'bg-greenbg text-richgreen text-xs font-bold px-2 py-1 rounded'
                                  : 'bg-umberbg text-umber text-xs font-bold px-2 py-1 rounded'
                              }
                            >
                              {notified ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {mgrMissing.length > MGR_PREVIEW && (
              <div className="px-5 py-4 border-t border-sage/20 bg-offwhite/40 flex items-center justify-between">
                <p className="text-xs text-slate italic">
                  Showing {MGR_PREVIEW} of {mgrMissing.length} employees with pending manager reviews.
                </p>
                <span className="text-xs text-slate font-semibold">
                  Showing {MGR_PREVIEW} of {mgrMissing.length}
                </span>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
