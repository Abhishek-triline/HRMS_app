'use client';

/**
 * LeaveQueueCard — prototype-faithful card for leave approval queues.
 *
 * Visual reference: prototype/admin/leave-queue.html (card list, not table)
 *
 * Renders:
 *   - Coloured border-l-4 severity stripe (escalated = crimson, maternity/paternity = umber,
 *     approved = richgreen, rejected = crimson, standard pending = sage/30 border all-round)
 *   - Avatar (initials circle)
 *   - Employee name + EMP code + department + status badge
 *   - Leave type + date range (bold dates)
 *   - Reason quote (text-xs text-slate in quotes)
 *   - Meta line (submitted N days ago · awaiting …)
 *   - Approve / Reject buttons (when showActions=true and status is actionable)
 *   - "View details" link
 */

import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LeaveApprovalActions } from '@/components/leave/LeaveApprovalActions';
import { useLeave } from '@/lib/hooks/useLeave';
import { LEAVE_STATUS, LEAVE_TYPE_ID } from '@/lib/status/maps';
import type { LeaveRequestSummary } from '@nexora/contracts/leave';

// ── Avatar background for different statuses ────────────────────────────────

function avatarBg(req: LeaveRequestSummary): string {
  if (req.status === LEAVE_STATUS.Escalated) return 'bg-softmint';
  if (req.status === LEAVE_STATUS.Approved) return 'bg-greenbg';
  if (req.status === LEAVE_STATUS.Rejected) return 'bg-crimsonbg';
  if (
    req.leaveTypeId === LEAVE_TYPE_ID.Maternity ||
    req.leaveTypeId === LEAVE_TYPE_ID.Paternity
  )
    return 'bg-mint';
  return 'bg-mint';
}

function avatarText(req: LeaveRequestSummary): string {
  if (req.status === LEAVE_STATUS.Approved) return 'text-richgreen';
  if (req.status === LEAVE_STATUS.Rejected) return 'text-crimson';
  return 'text-forest';
}

// ── Card border classes based on status ─────────────────────────────────────

function cardBorderClass(req: LeaveRequestSummary): string {
  if (req.status === LEAVE_STATUS.Escalated) {
    return 'border-l-4 border-crimson border-y border-r border-sage/30';
  }
  if (
    req.leaveTypeId === LEAVE_TYPE_ID.Maternity ||
    req.leaveTypeId === LEAVE_TYPE_ID.Paternity
  ) {
    return 'border-l-4 border-umber border-y border-r border-sage/30';
  }
  if (req.status === LEAVE_STATUS.Approved) {
    return 'border-l-4 border-richgreen border-y border-r border-sage/30';
  }
  if (req.status === LEAVE_STATUS.Rejected) {
    return 'border-l-4 border-crimson border-y border-r border-sage/30';
  }
  return 'border border-sage/30';
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

// ── Context-aware meta line (mirrors prototype copy per card type) ─────────────

function renderMetaLine(req: LeaveRequestSummary, submittedAgo: string): string {
  // Maternity → routes direct to Admin
  if (
    req.leaveTypeId === LEAVE_TYPE_ID.Maternity &&
    req.status !== LEAVE_STATUS.Approved &&
    req.status !== LEAVE_STATUS.Rejected
  ) {
    return 'Maternity routes directly to Admin (manager bypass)';
  }
  if (
    req.leaveTypeId === LEAVE_TYPE_ID.Paternity &&
    req.status !== LEAVE_STATUS.Approved &&
    req.status !== LEAVE_STATUS.Rejected
  ) {
    return 'Within 6 months of birth window · Routes to Admin (event-based)';
  }
  // Escalated — show manager + how long it sat
  if (req.status === LEAVE_STATUS.Escalated) {
    const mgr = req.approverName ?? 'Manager';
    return `Submitted ${submittedAgo} · ${mgr} did not act in time`;
  }
  // Approved / Rejected — show decider + decision time
  if (req.status === LEAVE_STATUS.Approved || req.status === LEAVE_STATUS.Rejected) {
    const decider = (req as unknown as { decidedBy?: string }).decidedBy;
    const decidedAt = (req as unknown as { decidedAt?: string }).decidedAt;
    const when = decidedAt
      ? new Date(decidedAt).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : '';
    const verb = req.status === LEAVE_STATUS.Approved ? 'Approved by' : 'Rejected by';
    return decider ? `${verb} ${decider}${when ? ` · ${when}` : ''}` : verb.replace(' by', '');
  }
  // Default pending — use approverName (resolved name) or routedToId label
  const mgr = req.approverName ?? (req.routedToId === 2 ? 'Admin' : 'Manager');
  return `Awaiting ${mgr} · Submitted ${submittedAgo}`;
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
    <div className="flex gap-2">
      <LeaveApprovalActions request={request} onDecision={onDecision} />
    </div>
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
    (request.status === LEAVE_STATUS.Pending || request.status === LEAVE_STATUS.Escalated);

  const avatarInitials = initials(request.employeeName);
  const borderClass = cardBorderClass(request);
  const dateRange = formatDateRange(request.fromDate, request.toDate, request.days);
  const submittedAgo = daysAgo(request.createdAt);

  return (
    <article
      className={`bg-white rounded-xl shadow-sm px-5 py-4 ${borderClass}`}
      aria-label={`Leave request from ${request.employeeName}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: avatar + content */}
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-full ${avatarBg(request)} flex items-center justify-center ${avatarText(request)} text-sm font-bold shrink-0`}
            aria-hidden="true"
          >
            {avatarInitials}
          </div>

          {/* Middle column */}
          <div className="flex-1">
            {/* Name + code + dept + badge */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-charcoal">{request.employeeName}</span>
              <span className="text-xs text-slate">
                {request.employeeCode}
                {(request as unknown as { department?: string }).department
                  ? ` · ${(request as unknown as { department: string }).department}`
                  : ''}
              </span>
              <StatusBadge entity="leaveStatus" code={request.status} />
            </div>

            {/* Leave type + date range */}
            <div className="text-sm text-slate mb-2">
              {request.leaveTypeName} Leave ·{' '}
              <strong className="text-charcoal">{dateRange}</strong>
            </div>

            {/* Reason quote */}
            {request.reason && (
              <div className="text-xs text-slate">
                &ldquo;{request.reason}&rdquo;
              </div>
            )}

            {/* Meta — context-specific per status/type, matches prototype copy */}
            <div className="text-xs text-slate mt-2">
              {renderMetaLine(request, submittedAgo)}
            </div>
          </div>
        </div>

        {/* Right column: actions + view link */}
        <div className="flex flex-col items-end gap-2">
          {isActionable && (
            <CardActions summary={request} onDecision={onDecision} />
          )}
          <Link
            href={`${detailHrefBase}/${request.id}`}
            className="text-xs text-emerald font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 rounded"
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
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-sage/20 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-sage/20 rounded w-48" />
          <div className="h-3 bg-sage/20 rounded w-64" />
          <div className="h-3 bg-sage/20 rounded w-32" />
        </div>
      </div>
    </div>
  );
}
