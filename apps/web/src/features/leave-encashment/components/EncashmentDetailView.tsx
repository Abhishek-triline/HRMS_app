'use client';

/**
 * EncashmentDetailView — audit-style timeline for a single encashment request.
 *
 * Shows full lifecycle: submission → manager decision → admin decision → payslip-paid.
 * OQ-7: for reversal payslips, does NOT promise days back.
 */

import Link from 'next/link';
import { useEncashment } from '@/lib/hooks/useLeaveEncashment';
import { Spinner } from '@/components/ui/Spinner';
import { EncashmentStatusBadge } from './EncashmentStatusBadge';
import type { LeaveEncashmentDetail } from '@nexora/contracts/leave-encashment';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRupees(paise: number | null): string {
  if (paise == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Math.floor(paise / 100),
  );
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading encashment details…">
      <div className="bg-white rounded-xl border border-sage/30 p-6 space-y-4">
        <div className="h-5 bg-sage/20 rounded w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-2.5 bg-sage/30 rounded w-20 mb-2" />
              <div className="h-4 bg-sage/20 rounded w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-sage/30 p-6 space-y-3">
        <div className="h-5 bg-sage/20 rounded w-24" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-sage/20 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-sage/20 rounded w-32" />
              <div className="h-2.5 bg-sage/10 rounded w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timeline event ────────────────────────────────────────────────────────────

interface TimelineEventProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  timestamp: string | null;
  note?: string | null;
  iconBg?: string;
  completed: boolean;
}

function TimelineEvent({ icon, title, subtitle, timestamp, note, iconBg = 'bg-forest', completed }: TimelineEventProps) {
  return (
    <div className={`flex gap-4 ${completed ? '' : 'opacity-40'}`}>
      <div className={`w-9 h-9 rounded-full ${completed ? iconBg : 'bg-sage/20'} flex items-center justify-center shrink-0 text-white`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 pb-4 border-b border-sage/10 last:border-0">
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
        {timestamp && (
          <p className="text-xs text-slate mt-0.5">{fmtDateTime(timestamp)}</p>
        )}
        {note && (
          <p className="text-xs text-slate italic mt-1 bg-offwhite/60 rounded px-2 py-1 border-l-2 border-forest/30">
            &ldquo;{note}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

interface EncashmentDocumentProps {
  enc: LeaveEncashmentDetail;
  backHref: string;
}

function EncashmentDocument({ enc, backHref }: EncashmentDocumentProps) {
  const ratePerDay = enc.ratePerDayPaise != null
    ? `₹${(enc.ratePerDayPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}/day`
    : '—';

  return (
    <div className="space-y-5">
      {/* ── Summary card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="font-mono text-sm text-forest font-semibold">{enc.code}</p>
            <p className="text-xs text-slate mt-0.5">Year {enc.year}</p>
          </div>
          <EncashmentStatusBadge status={enc.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Employee</p>
            <p className="font-semibold text-charcoal mt-0.5">{enc.employeeName}</p>
            <p className="text-xs text-slate font-mono">{enc.employeeCode}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Days Requested</p>
            <p className="font-semibold text-charcoal mt-0.5">{enc.daysRequested}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Days Approved</p>
            <p className="font-semibold text-charcoal mt-0.5">{enc.daysApproved ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Rate per Day</p>
            <p className="font-semibold text-charcoal mt-0.5">{ratePerDay}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Amount</p>
            <p className="font-semibold text-richgreen mt-0.5 text-base">{fmtRupees(enc.amountPaise)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Routed To</p>
            <p className="font-semibold text-charcoal mt-0.5">{enc.routedTo}</p>
          </div>
          {enc.approverName && (
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Approver</p>
              <p className="font-semibold text-charcoal mt-0.5">{enc.approverName}</p>
            </div>
          )}
          {enc.paidAt && (
            <div>
              <p className="text-xs font-semibold text-slate uppercase tracking-wider">Paid On</p>
              <p className="font-semibold text-charcoal mt-0.5">{fmtDateTime(enc.paidAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-sm font-semibold text-charcoal uppercase tracking-wider mb-5">
          Approval Timeline
        </h3>
        <div className="space-y-0">
          {/* Submitted */}
          <TimelineEvent
            completed
            iconBg="bg-forest"
            title="Request submitted"
            subtitle={`${enc.daysRequested} day${enc.daysRequested !== 1 ? 's' : ''} requested`}
            timestamp={enc.createdAt}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          />

          {/* Manager decision */}
          {enc.routedTo === 'Manager' ? (
            <TimelineEvent
              completed={
                enc.status !== 'Pending' &&
                enc.status !== 'Cancelled'
              }
              iconBg={enc.status === 'Rejected' && !enc.decidedBy?.includes('Admin') ? 'bg-crimson' : 'bg-forest'}
              title={
                enc.status === 'ManagerApproved' ||
                enc.status === 'AdminFinalised' ||
                enc.status === 'Paid'
                  ? 'Manager approved'
                  : enc.status === 'Rejected'
                  ? 'Rejected by manager'
                  : 'Awaiting manager approval'
              }
              subtitle={enc.approverName ? `Approver: ${enc.approverName}` : undefined}
              timestamp={
                enc.status !== 'Pending' && enc.status !== 'Cancelled' ? enc.decidedAt : null
              }
              note={enc.decisionNote}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
          ) : (
            <TimelineEvent
              completed={
                enc.status !== 'Pending' &&
                enc.status !== 'Cancelled'
              }
              iconBg="bg-umber"
              title="Escalated to Admin (no reporting manager)"
              timestamp={enc.escalatedAt}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          )}

          {/* Admin decision */}
          <TimelineEvent
            completed={
              enc.status === 'AdminFinalised' ||
              enc.status === 'Paid' ||
              (enc.status === 'Rejected' && Boolean(enc.decidedBy))
            }
            iconBg={enc.status === 'Rejected' ? 'bg-crimson' : 'bg-richgreen'}
            title={
              enc.status === 'AdminFinalised' || enc.status === 'Paid'
                ? `Admin finalised — ${enc.daysApproved} day${(enc.daysApproved ?? 0) !== 1 ? 's' : ''} at ${ratePerDay}`
                : enc.status === 'Rejected'
                ? 'Rejected'
                : 'Awaiting Admin finalisation'
            }
            timestamp={
              enc.status === 'AdminFinalised' || enc.status === 'Paid' ? enc.decidedAt : null
            }
            note={
              (enc.status === 'AdminFinalised' || enc.status === 'Paid' || enc.status === 'Rejected')
                ? enc.decisionNote
                : null
            }
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />

          {/* Payslip paid */}
          <TimelineEvent
            completed={enc.status === 'Paid'}
            iconBg="bg-richgreen"
            title={enc.status === 'Paid' ? `Paid via payslip ${enc.paidInPayslipId ?? ''}` : 'Payment pending next payroll run'}
            timestamp={enc.paidAt}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          {/* Cancellation */}
          {enc.status === 'Cancelled' && (
            <TimelineEvent
              completed
              iconBg="bg-slate"
              title="Cancelled"
              subtitle={enc.cancelledBy ? `By: ${enc.cancelledBy}` : undefined}
              timestamp={enc.cancelledAt}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {/* ── Back link ─────────────────────────────────────────────────── */}
      <div className="pt-2">
        <Link
          href={backHref}
          className="text-sm text-slate hover:text-forest transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Encashment
        </Link>
      </div>
    </div>
  );
}

// ── Exported view ─────────────────────────────────────────────────────────────

interface EncashmentDetailViewProps {
  encashmentId: string;
  backHref: string;
}

export function EncashmentDetailView({ encashmentId, backHref }: EncashmentDetailViewProps) {
  const { data: enc, isLoading, isError } = useEncashment(encashmentId);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !enc) {
    return (
      <div role="alert" className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-8 text-center">
        <p className="text-crimson font-semibold text-sm mb-2">Failed to load encashment request.</p>
        <Link href={backHref} className="text-forest underline text-sm hover:text-emerald transition-colors">
          Back to Encashment
        </Link>
      </div>
    );
  }

  return <EncashmentDocument enc={enc} backHref={backHref} />;
}
