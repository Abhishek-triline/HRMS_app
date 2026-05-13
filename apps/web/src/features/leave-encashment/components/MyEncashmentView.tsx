'use client';

/**
 * MyEncashmentView — shared "Apply for Encashment + history" view.
 *
 * Used by: Employee, Manager (own records), Admin (own records), PayrollOfficer.
 * Role-specific detail path is passed via the `detailBasePath` prop.
 *
 * Sections:
 *   1. Header card: balance snapshot, encashment eligibility pill
 *   2. "Apply for Encashment" button + apply modal
 *   3. History table with status pills and View link per row
 *
 * OQ-7: UI MUST NOT promise days back on reversal.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useMe } from '@/lib/hooks/useAuth';
import { useLeaveBalances } from '@/lib/hooks/useLeave';
import {
  useEncashmentList,
  useSubmitEncashment,
  useCancelEncashment,
  useEncashment,
} from '@/lib/hooks/useLeaveEncashment';
import { ApiError } from '@/lib/api/client';
import { EncashmentStatusBadge } from './EncashmentStatusBadge';
import { LEAVE_ENCASHMENT_STATUS, LEAVE_TYPE_ID } from '@/lib/status/maps';
import type { LeaveEncashmentSummary } from '@nexora/contracts/leave-encashment';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRupees(paise: number | null): string {
  if (paise == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Math.floor(paise / 100),
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Error code display ────────────────────────────────────────────────────────

function encashmentErrorMessage(code: string, message: string): string {
  switch (code) {
    case 'ENCASHMENT_OUT_OF_WINDOW':
      return 'Encashment requests can only be submitted during the Dec 1 – Jan 15 window.';
    case 'ENCASHMENT_ALREADY_USED':
      return 'You already have an approved or finalised encashment for this year. Only one encashment is allowed per year.';
    case 'ENCASHMENT_INSUFFICIENT_BALANCE':
      return 'Requested days exceed 50% of your current Annual leave balance.';
    case 'ENCASHMENT_INVALID_LEAVE_TYPE':
      return 'Encashment applies to Annual leave only.';
    default:
      return message;
  }
}

// ── Apply modal ───────────────────────────────────────────────────────────────

interface ApplyModalProps {
  maxDays: number;
  year: number;
  onClose: () => void;
}

function ApplyModal({ maxDays, year, onClose }: ApplyModalProps) {
  const [days, setDays] = useState(Math.max(1, Math.min(1, maxDays)));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitMutation = useSubmitEncashment();

  // Live amount preview — estimate only, actual rate locked at admin finalisation
  // Formula per BL-LE-07: (basic + DA) / workingDays — we cannot know those here,
  // so we show "Rate locked at Admin-Finalise".
  const cappedDays = Math.max(1, Math.min(days, maxDays));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync({ year, daysRequested: cappedDays });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(encashmentErrorMessage(err.code, err.message));
      } else {
        setSubmitError('Submission failed. Please try again.');
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-enc-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-sage/20">
          <h2 id="apply-enc-title" className="font-heading text-lg font-bold text-charcoal">
            Apply for Leave Encashment
          </h2>
          <p className="text-xs text-slate mt-0.5">
            Year {year} — Annual leave only. Balance deducted immediately on Admin finalisation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Days input */}
          <div>
            <label htmlFor="enc-days" className="block text-sm font-semibold text-charcoal mb-1">
              Days to encash <span className="text-crimson" aria-hidden="true">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="enc-days"
                type="number"
                min={1}
                max={maxDays}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
                className="w-24 border border-sage/50 rounded-lg px-3 py-2 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />
              <input
                type="range"
                min={1}
                max={maxDays}
                value={cappedDays}
                onChange={(e) => setDays(Number(e.target.value))}
                aria-label="Days slider"
                className="flex-1 accent-forest"
              />
              <span className="text-xs text-slate shrink-0">max {maxDays}</span>
            </div>
            <p className="text-xs text-slate mt-1">
              Maximum encashable = floor(Annual balance × 50%) = {maxDays} day{maxDays !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Rate note */}
          <div className="bg-softmint rounded-xl px-4 py-3 text-xs text-slate space-y-0.5">
            <p className="font-semibold text-forest">Rate preview</p>
            <p>
              Rate per day = (Basic + DA) ÷ working days in the pay month.
            </p>
            <p>
              Exact amount is computed and locked at Admin-Finalise time using your active salary structure.
            </p>
          </div>

          {/* Warning — OQ-7 */}
          <div className="bg-umberbg border border-umber/30 rounded-xl px-4 py-3 flex gap-2">
            <svg className="w-4 h-4 text-umber shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-umber font-medium">
              <strong>You cannot un-encash leave days.</strong> If the payslip is later reversed, the money is returned but the days remain encashed for the year (BL-LE-11).
            </p>
          </div>

          {/* Submission error */}
          {submitError && (
            <div
              role="alert"
              className="bg-crimsonbg border border-crimson/30 rounded-lg px-4 py-3 text-xs text-crimson"
            >
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              loading={submitMutation.isPending}
              disabled={cappedDays < 1 || cappedDays > maxDays}
              className="flex-1"
            >
              Submit Request
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel confirm modal ──────────────────────────────────────────────────────

function CancelEncashmentWrapper({
  encashmentId,
  onClose,
}: {
  encashmentId: number;
  onClose: () => void;
}) {
  const { data: enc, isLoading } = useEncashment(encashmentId);
  const cancelMutation = useCancelEncashment(encashmentId);
  const [note, setNote] = useState('');

  async function handleConfirm() {
    if (!enc) return;
    try {
      await cancelMutation.mutateAsync({ version: enc.version });
      onClose();
    } catch {
      // hook handles toast
    }
  }

  if (isLoading || !enc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-enc-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 id="cancel-enc-title" className="font-heading text-base font-bold text-charcoal">
          Cancel Encashment Request
        </h2>
        <p className="text-sm text-slate">
          Cancel request <span className="font-mono text-forest">{enc.code}</span> for {enc.daysRequested} day{enc.daysRequested !== 1 ? 's' : ''}?
        </p>
        <div>
          <label htmlFor="cancel-note" className="block text-xs font-semibold text-slate mb-1">
            Note (optional)
          </label>
          <textarea
            id="cancel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Reason for cancellation…"
            className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            loading={cancelMutation.isPending}
            className="flex-1"
          >
            Cancel Request
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={cancelMutation.isPending}>
            Keep
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── History table skeleton ────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading encashment history…">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-sage/10">
          <div className="h-3 bg-sage/20 rounded w-28" />
          <div className="h-3 bg-sage/20 rounded w-10" />
          <div className="h-3 bg-sage/20 rounded w-8" />
          <div className="h-3 bg-sage/20 rounded w-8" />
          <div className="h-3 bg-sage/20 rounded w-20" />
          <div className="h-5 bg-sage/20 rounded-full w-24" />
          <div className="h-3 bg-sage/20 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export interface MyEncashmentViewProps {
  /** Role-prefixed base for detail links, e.g. "/employee/leave-encashment" */
  detailBasePath: string;
}

export function MyEncashmentView({ detailBasePath }: MyEncashmentViewProps) {
  const { data: me, isLoading: meLoading } = useMe();
  const employeeId: number = me?.data?.user?.id ?? 0;
  const currentYear = new Date().getFullYear();

  const balancesQuery = useLeaveBalances(employeeId);
  // Scope to self even when caller is Admin/PayrollOfficer (server treats those
  // roles as "see all" without an employeeId filter, which would mix other
  // employees' encashment requests into the "My Encashment" view).
  const encashmentsQuery = useEncashmentList(
    employeeId > 0 ? { employeeId, year: currentYear } : { year: currentYear },
  );

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  // Annual balance — using contract field names: leaveTypeId + remaining
  // getLeaveBalances returns { year, balances } — we read .balances
  const annualBalance = balancesQuery.data?.balances.find((b) => b.leaveTypeId === LEAVE_TYPE_ID.Annual);
  const daysRemaining = annualBalance?.remaining ?? 0;
  // daysEncashed is a new field on LeaveBalance (BL-LE-06); may be absent on older API responses
  const daysEncashed = (annualBalance as (typeof annualBalance & { daysEncashed?: number }) | undefined)?.daysEncashed ?? 0;
  const maxEncashable = Math.floor((daysRemaining ?? 0) * 0.5);

  // Window check — simple client-side heuristic (Dec or Jan 1-15)
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();
  const inWindow = month === 12 || (month === 1 && day <= 15);

  // Disable apply if already has open/approved
  const hasOpenRequest = useMemo(() => {
    if (!encashmentsQuery.data) return false;
    return encashmentsQuery.data.data.some(
      (e) =>
        e.status === LEAVE_ENCASHMENT_STATUS.Pending ||
        e.status === LEAVE_ENCASHMENT_STATUS.ManagerApproved ||
        e.status === LEAVE_ENCASHMENT_STATUS.AdminFinalised,
    );
  }, [encashmentsQuery.data]);

  const canApply = inWindow && !hasOpenRequest && maxEncashable >= 1;

  function isCancellable(enc: LeaveEncashmentSummary): boolean {
    return enc.status === LEAVE_ENCASHMENT_STATUS.Pending;
  }

  return (
    <>
      {/* ── Balance header card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-6">
        {meLoading || balancesQuery.isLoading ? (
          <div className="animate-pulse flex items-center gap-8">
            <div className="h-10 bg-sage/20 rounded w-32" />
            <div className="h-10 bg-sage/20 rounded w-32" />
            <div className="h-8 bg-sage/20 rounded-full w-40" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap gap-8">
              {/* Annual balance */}
              <div>
                <p className="text-xs font-semibold text-slate uppercase tracking-wider">Annual Balance {currentYear}</p>
                <p className="text-2xl font-bold text-charcoal mt-1">
                  {daysRemaining} <span className="text-sm font-normal text-slate">days remaining</span>
                </p>
              </div>
              {/* Already encashed */}
              <div>
                <p className="text-xs font-semibold text-slate uppercase tracking-wider">Encashed this year</p>
                <p className="text-2xl font-bold text-charcoal mt-1">
                  {daysEncashed} <span className="text-sm font-normal text-slate">days</span>
                </p>
              </div>
              {/* Eligibility pill */}
              <div className="flex items-end">
                {inWindow ? (
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
                    maxEncashable >= 1
                      ? 'bg-greenbg text-richgreen'
                      : 'bg-sage/20 text-slate',
                  )}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Eligible to encash: {maxEncashable} day{maxEncashable !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-sage/20 text-slate px-3 py-1.5 rounded-full text-sm font-semibold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {month > 1 && month < 12
                      ? 'Window opens Dec 1'
                      : 'Window closed Jan 15'}
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <Button
              variant="primary"
              onClick={() => setShowApplyModal(true)}
              disabled={!canApply}
              title={
                !inWindow
                  ? 'Encashment window is closed'
                  : hasOpenRequest
                  ? 'You already have an open encashment request for this year'
                  : maxEncashable < 1
                  ? 'Insufficient balance'
                  : undefined
              }
              leadingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            >
              Apply for Encashment
            </Button>
          </div>
        )}
      </div>

      {/* ── History table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-6 pt-5 pb-4 border-b border-sage/20">
          <h2 className="font-heading text-base font-semibold text-charcoal">Encashment History</h2>
          <p className="text-xs text-slate mt-0.5">Year {currentYear}</p>
        </div>

        {encashmentsQuery.isLoading ? (
          <HistorySkeleton />
        ) : encashmentsQuery.isError ? (
          <div className="px-6 py-8 text-sm text-crimson" role="alert">
            Could not load encashment history. Please refresh.
          </div>
        ) : !encashmentsQuery.data || encashmentsQuery.data.data.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg className="w-10 h-10 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate text-sm font-medium">No encashment requests found for {currentYear}.</p>
            {inWindow && maxEncashable >= 1 && (
              <p className="text-xs text-slate mt-1">
                The encashment window is open. You can encash up to {maxEncashable} day{maxEncashable !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm" aria-label="Encashment history">
                <thead>
                  <tr className="bg-offwhite border-b border-sage/20">
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Code</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Year</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Requested</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Approved</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Amount</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Submitted</th>
                    <th scope="col" className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10">
                  {encashmentsQuery.data.data.map((enc) => (
                    <tr key={enc.id} className="hover:bg-offwhite/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-forest font-semibold">{enc.code}</td>
                      <td className="px-4 py-3 text-charcoal">{enc.year}</td>
                      <td className="px-4 py-3 text-right text-charcoal">{enc.daysRequested} d</td>
                      <td className="px-4 py-3 text-right text-charcoal">{enc.daysApproved ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-charcoal">{fmtRupees(enc.amountPaise)}</td>
                      <td className="px-4 py-3">
                        <EncashmentStatusBadge status={enc.status} />
                      </td>
                      <td className="px-4 py-3 text-slate text-xs">{fmtDate(enc.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${detailBasePath}/${enc.id}`}
                            className="text-xs font-semibold text-forest hover:text-emerald underline-offset-2 hover:underline transition-colors"
                          >
                            View
                          </Link>
                          {isCancellable(enc) && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(enc.id)}
                              className="text-xs font-semibold text-crimson hover:underline underline-offset-2 transition-colors min-h-[44px]"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden px-4 py-4 space-y-3">
              {encashmentsQuery.data.data.map((enc) => (
                <div key={enc.id} className="bg-offwhite/60 rounded-xl border border-sage/20 p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-mono text-xs text-forest font-semibold">{enc.code}</p>
                      <p className="text-xs text-slate mt-0.5">Year {enc.year}</p>
                    </div>
                    <EncashmentStatusBadge status={enc.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-slate">Requested</p>
                      <p className="font-semibold text-charcoal">{enc.daysRequested} days</p>
                    </div>
                    <div>
                      <p className="text-slate">Approved</p>
                      <p className="font-semibold text-charcoal">{enc.daysApproved ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate">Amount</p>
                      <p className="font-semibold text-charcoal">{fmtRupees(enc.amountPaise)}</p>
                    </div>
                    <div>
                      <p className="text-slate">Submitted</p>
                      <p className="font-semibold text-charcoal">{fmtDate(enc.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`${detailBasePath}/${enc.id}`}
                      className="text-xs font-semibold text-forest hover:text-emerald underline-offset-2 hover:underline transition-colors min-h-[44px] flex items-center"
                    >
                      View details
                    </Link>
                    {isCancellable(enc) && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(enc.id)}
                        className="text-xs font-semibold text-crimson hover:underline underline-offset-2 transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showApplyModal && (
        <ApplyModal
          maxDays={maxEncashable}
          year={currentYear}
          onClose={() => setShowApplyModal(false)}
        />
      )}
      {cancelTarget && (
        <CancelEncashmentWrapper
          encashmentId={cancelTarget}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  );
}
