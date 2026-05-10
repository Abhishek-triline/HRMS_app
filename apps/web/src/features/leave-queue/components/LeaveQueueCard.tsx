'use client';

/**
 * LeaveQueueCard — prototype-faithful card for leave approval queues.
 *
 * Visual reference: prototype/admin/leave-queue.html (card list, not table)
 *
 * Renders:
 *   - Coloured left-border severity stripe
 *   - Avatar (initials circle)
 *   - Employee name + EMP code + leave type + date range + reason quote
 *   - Meta strip: submitted N days ago
 *   - Approve / Reject buttons (when showActions=true and status is actionable)
 *   - "View details" link
 */

import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { LeaveApprovalActions } from '@/components/leave/LeaveApprovalActions';
import { useLeave } from '@/lib/hooks/useLeave';
import type { LeaveRequestSummary } from '@nexora/contracts/leave';

// ── Stripe colour derivation ──────────────────────────────────────────────────

function stripeClass(req: LeaveRequestSummary): string {
  if (req.status === 'Escalated') return 'bg-rose-500';
  if (req.type === 'Maternity' || req.type === 'Paternity') return 'bg-amber-500';
  if (req.status === 'Approved') return 'bg-mint';
  return 'bg-stone-300';
}

// ── Initials from employee name ───────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Date range formatting ─────────────────────────────────────────────────────

function formatDateRange(from: string, to: string, days: number): string {
  try {
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');

    const fmtShort = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const fmtFull = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const range =
      from === to
        ? fmtFull(fromDate)
        : fromDate.getFullYear() === toDate.getFullYear()
        ? `${fmtShort(fromDate)} – ${fmtFull(toDate)}`
        : `${fmtFull(fromDate)} – ${fmtFull(toDate)}`;

    return `${range} · ${days} day${days !== 1 ? 's' : ''}`;
  } catch {
    return `${from} – ${to} · ${days} days`;
  }
}

// ── Relative time since submission ────────────────────────────────────────────

function daysAgo(isoCreatedAt: string): string {
  try {
    const created = new Date(isoCreatedAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  } catch {
    return '';
  }
}

// ── Inner action component (loads full request for approve/reject) ─────────────

function CardActions({
  summary,
  onDecision,
}: {
  summary: LeaveRequestSummary;
  onDecision: () => void;
}) {
  const { data: request, isLoading } = useLeave(summary.id);
  if (isLoading) return <Spinner size="sm" />;
  if (!request) return null;
  return (
    <LeaveApprovalActions
      request={request}
      onDecision={onDecision}
    />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LeaveQueueCardProps {
  request: LeaveRequestSummary;
  /** href prefix for "View details" link — e.g. "/admin/leave-queue" */
  detailHrefBase: string;
  /** Whether to show Approve/Reject action buttons */
  showActions: boolean;
  /** Called after a successful approve/reject to trigger list refresh */
  onDecision: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeaveQueueCard({
  request,
  detailHrefBase,
  showActions,
  onDecision,
}: LeaveQueueCardProps) {
  const isActionable =
    showActions &&
    (request.status === 'Pending' || request.status === 'Escalated');

  const avatarInitials = initials(request.employeeName);
  const stripe = stripeClass(request);
  const dateRange = formatDateRange(request.fromDate, request.toDate, request.days);
  const submittedAgo = daysAgo(request.createdAt);

  return (
    <article
      className="relative rounded-xl border border-stone-200 bg-white p-4 pl-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label={`Leave request from ${request.employeeName}`}
    >
      {/* Left severity stripe */}
      <div
        className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${stripe}`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        {/* Left: avatar + content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full bg-softmint flex items-center justify-center text-forest text-sm font-bold shrink-0"
            aria-hidden="true"
          >
            {avatarInitials}
          </div>

          {/* Middle column */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-charcoal">{request.employeeName}</span>
              <span className="text-xs text-slate">{request.employeeCode}</span>
              <LeaveStatusBadge status={request.status} />
              {(request.type === 'Maternity' || request.type === 'Paternity') && (
                <span className="text-xs bg-softmint text-forest font-bold px-1.5 py-0.5 rounded">
                  Event-based
                </span>
              )}
            </div>

            {/* Leave type + date range */}
            <div className="text-sm text-slate mb-1.5">
              <span className="text-charcoal font-medium">{request.type} Leave</span>
              {' · '}
              {dateRange}
            </div>

            {/* Meta strip */}
            <div className="text-xs text-slate">
              Submitted {submittedAgo}
              {request.routedTo && ` · awaiting ${request.routedTo}`}
              {request.escalatedAt && (
                <span className="text-rose-600 font-medium"> · Escalated</span>
              )}
            </div>
          </div>
        </div>

        {/* Right column: actions + view link */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isActionable && (
            <CardActions summary={request} onDecision={onDecision} />
          )}
          <Link
            href={`${detailHrefBase}/${request.id}`}
            className="text-xs font-semibold text-forest hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded"
          >
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── Skeleton (loading state) ──────────────────────────────────────────────────

export function LeaveQueueCardSkeleton() {
  return (
    <div className="relative rounded-xl border border-stone-200 bg-white p-4 pl-5 shadow-sm animate-pulse">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-stone-200" />
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 rounded w-48" />
          <div className="h-3 bg-stone-200 rounded w-64" />
          <div className="h-3 bg-stone-200 rounded w-32" />
        </div>
      </div>
    </div>
  );
}
