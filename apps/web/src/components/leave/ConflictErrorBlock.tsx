'use client';

/**
 * ConflictErrorBlock — BL-010 / DN-19 hook.
 *
 * Must be rendered instead of a generic error whenever the API returns:
 *   - LEAVE_OVERLAP      (BL-009) — conflicting leave dates
 *   - LEAVE_REG_CONFLICT (BL-010) — conflicting regularisation
 *   - INSUFFICIENT_BALANCE (BL-014) — not enough days
 *
 * Never render a generic error string for these codes. If the error code
 * is not a leave conflict, this component renders nothing (returns null).
 */

import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import type { LeaveConflictDetails } from '@nexora/contracts/leave';
import { clsx } from 'clsx';

interface ConflictErrorBlockProps {
  error: ApiError | null | undefined;
  className?: string;
}

function formatDateRange(from: string, to: string | null): string {
  if (!to || to === from) return from;
  return `${from} – ${to}`;
}

export function ConflictErrorBlock({ error, className }: ConflictErrorBlockProps) {
  if (!error) return null;

  const code = error.code;
  const isLeaveConflict =
    code === ErrorCode.LEAVE_OVERLAP ||
    code === ErrorCode.LEAVE_REG_CONFLICT ||
    code === ErrorCode.INSUFFICIENT_BALANCE;

  if (!isLeaveConflict) return null;

  const details = error.details as Partial<LeaveConflictDetails> & {
    requestedDays?: number;
    availableDays?: number;
  } | undefined;

  let heading = '';
  let body: React.ReactNode = null;

  if (code === ErrorCode.LEAVE_OVERLAP) {
    heading = 'Leave date conflict — request blocked';
    const conflictId = details?.conflictCode ?? details?.conflictId ?? 'unknown';
    const dates = details?.conflictFrom
      ? formatDateRange(details.conflictFrom, details.conflictTo ?? null)
      : 'overlapping period';
    const status = details?.conflictStatus ? ` (${details.conflictStatus})` : '';
    body = (
      <p className="text-xs text-slate leading-relaxed">
        An existing leave request{' '}
        <span className="font-semibold text-charcoal">{conflictId}</span> already covers{' '}
        <span className="font-semibold text-charcoal">{dates}</span>
        {status}. Two leave requests cannot overlap in dates. Cancel or adjust the existing
        request before submitting a new one.
      </p>
    );
  } else if (code === ErrorCode.LEAVE_REG_CONFLICT) {
    heading = 'Leave / Attendance conflict — request blocked';
    const conflictId = details?.conflictCode ?? details?.conflictId ?? 'unknown';
    const dates = details?.conflictFrom
      ? formatDateRange(details.conflictFrom, details.conflictTo ?? null)
      : 'the chosen period';
    body = (
      <p className="text-xs text-slate leading-relaxed">
        A regularisation request{' '}
        <span className="font-semibold text-charcoal">{conflictId}</span> already covers{' '}
        <span className="font-semibold text-charcoal">{dates}</span>. You cannot apply for
        leave that overlaps an existing regularisation. Withdraw the regularisation first if
        leave is what you actually need.
      </p>
    );
  } else if (code === ErrorCode.INSUFFICIENT_BALANCE) {
    heading = 'Insufficient leave balance';
    const requested = details?.requestedDays;
    const available = details?.availableDays;
    body = (
      <p className="text-xs text-slate leading-relaxed">
        {requested !== undefined && available !== undefined ? (
          <>
            You requested <span className="font-semibold text-charcoal">{requested} day{requested !== 1 ? 's' : ''}</span>{' '}
            but only{' '}
            <span className="font-semibold text-charcoal">{available} day{available !== 1 ? 's' : ''}</span>{' '}
            remain in your balance for this leave type.
          </>
        ) : (
          <>
            {error.message}
          </>
        )}
        {' '}Consider using Unpaid Leave or adjusting your date range.
      </p>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'bg-crimsonbg border border-crimson/40 rounded-lg p-4 flex items-start gap-3',
        className,
      )}
    >
      <svg
        className="w-5 h-5 text-crimson shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M4.93 19.07a10 10 0 1114.14 0H4.93z"
        />
      </svg>
      <div className="text-sm text-charcoal">
        <div className="font-semibold text-crimson mb-0.5">{heading}</div>
        {body}
        {error.ruleId && (
          <div className="mt-1 text-xs text-slate/70">Rule: {error.ruleId}</div>
        )}
      </div>
    </div>
  );
}
