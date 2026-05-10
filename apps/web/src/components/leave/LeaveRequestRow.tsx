'use client';

/**
 * LeaveRequestRow — table row for leave queues and history.
 *
 * Used by both the employee My Leave page and manager/admin queue pages.
 * Renders: employee, type, dates, days, status badge, action buttons.
 * On mobile: collapses to a card via CSS.
 */

import Link from 'next/link';
import { clsx } from 'clsx';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import type { LeaveRequestSummary } from '@nexora/contracts/leave';

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDuration(from: string, to: string): string {
  if (from === to) return formatDate(from);
  return `${formatDate(from)} – ${formatDate(to)}`;
}

interface LeaveRequestRowProps {
  request: LeaveRequestSummary;
  /** Path to the detail page, e.g. /employee/leave/:id */
  detailPath: string;
  /** Show the employee name column (for manager/admin queues) */
  showEmployee?: boolean;
  /** Show cancel button (employee — cancellable rows only) */
  onCancel?: (req: LeaveRequestSummary) => void;
  /** Show approve/reject buttons (manager/admin) */
  onApprove?: (req: LeaveRequestSummary) => void;
  onReject?: (req: LeaveRequestSummary) => void;
}

export function LeaveRequestRow({
  request,
  detailPath,
  showEmployee = false,
  onCancel,
  onApprove,
  onReject,
}: LeaveRequestRowProps) {
  // BUG-LEAVE-002 fix — Pending leaves are always cancellable by the owner;
  // Approved leaves are only cancellable by the owner before fromDate
  // (BL-019). Backend will still reject after-start cancellations from the
  // owner, but we hide the affordance here so the UI matches the rule.
  // Manager/Admin actions are gated on the queue page, not this row.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fromDate = new Date(request.fromDate);
  fromDate.setHours(0, 0, 0, 0);
  const beforeStart = today < fromDate;

  const isCancellable =
    request.status === 'Pending' || (request.status === 'Approved' && beforeStart);
  const isPending = request.status === 'Pending' || request.status === 'Escalated';

  return (
    <tr className="hover:bg-offwhite transition-colors group">
      {showEmployee && (
        <td className="px-6 py-4">
          <div className="font-medium text-charcoal text-sm">{request.employeeName}</div>
          <div className="text-xs text-slate">{request.employeeCode}</div>
        </td>
      )}
      <td className="px-6 py-4 font-medium text-charcoal text-sm">{request.type}</td>
      <td className="px-4 py-4 text-slate text-sm">
        {formatDuration(request.fromDate, request.toDate)}
      </td>
      <td className="px-4 py-4 text-slate text-sm">{request.days}</td>
      <td className="px-4 py-4">
        <LeaveStatusBadge status={request.status} />
      </td>
      {showEmployee && (
        <td className="px-4 py-4 text-slate text-sm">
          {request.approverName ?? '—'}
        </td>
      )}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Link
            href={`${detailPath}/${request.id}`}
            className={clsx(
              'text-xs font-semibold text-forest hover:underline',
            )}
            aria-label={`View leave request ${request.code}`}
          >
            View
          </Link>

          {onCancel && isCancellable && (
            <button
              type="button"
              onClick={() => onCancel(request)}
              className={clsx(
                'text-xs bg-crimsonbg text-crimson font-semibold px-2.5 py-1 rounded',
                'hover:bg-crimson hover:text-white transition-colors',
                'min-h-[32px]',
              )}
              aria-label={`Cancel leave request ${request.code}`}
            >
              Cancel
            </button>
          )}

          {onApprove && isPending && (
            <button
              type="button"
              onClick={() => onApprove(request)}
              className={clsx(
                'text-xs bg-greenbg text-richgreen font-semibold px-2.5 py-1 rounded',
                'hover:bg-richgreen hover:text-white transition-colors',
                'min-h-[32px]',
              )}
              aria-label={`Approve leave request ${request.code}`}
            >
              Approve
            </button>
          )}

          {onReject && isPending && (
            <button
              type="button"
              onClick={() => onReject(request)}
              className={clsx(
                'text-xs bg-crimsonbg text-crimson font-semibold px-2.5 py-1 rounded',
                'hover:bg-crimson hover:text-white transition-colors',
                'min-h-[32px]',
              )}
              aria-label={`Reject leave request ${request.code}`}
            >
              Reject
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Mobile card variant (used when table stacks) ──────────────────────────────

export function LeaveRequestCard({
  request,
  detailPath,
  onCancel,
  onApprove,
  onReject,
}: Omit<LeaveRequestRowProps, 'showEmployee'>) {
  const isCancellable = request.status === 'Pending' || request.status === 'Approved';
  const isPending = request.status === 'Pending' || request.status === 'Escalated';

  return (
    <div className="bg-white rounded-xl border border-sage/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-charcoal text-sm">{request.type} Leave</div>
          <div className="text-xs text-slate mt-0.5">{request.code}</div>
        </div>
        <LeaveStatusBadge status={request.status} />
      </div>
      <div className="text-xs text-slate">
        {request.fromDate === request.toDate
          ? formatDate(request.fromDate)
          : `${formatDate(request.fromDate)} – ${formatDate(request.toDate)}`}{' '}
        · {request.days} day{request.days !== 1 ? 's' : ''}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`${detailPath}/${request.id}`}
          className="text-xs font-semibold text-forest hover:underline"
          aria-label={`View leave request ${request.code}`}
        >
          View details
        </Link>
        {onCancel && isCancellable && (
          <button
            type="button"
            onClick={() => onCancel(request)}
            className="text-xs bg-crimsonbg text-crimson font-semibold px-2.5 py-1.5 rounded hover:bg-crimson hover:text-white transition-colors min-h-[32px]"
          >
            Cancel
          </button>
        )}
        {onApprove && isPending && (
          <button
            type="button"
            onClick={() => onApprove(request)}
            className="text-xs bg-greenbg text-richgreen font-semibold px-2.5 py-1.5 rounded hover:bg-richgreen hover:text-white transition-colors min-h-[32px]"
          >
            Approve
          </button>
        )}
        {onReject && isPending && (
          <button
            type="button"
            onClick={() => onReject(request)}
            className="text-xs bg-crimsonbg text-crimson font-semibold px-2.5 py-1.5 rounded hover:bg-crimson hover:text-white transition-colors min-h-[32px]"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
