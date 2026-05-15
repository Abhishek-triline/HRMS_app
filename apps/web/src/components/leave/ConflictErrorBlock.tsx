'use client';

/**
 * ConflictErrorBlock — leave-form inline conflict surface.
 *
 * Must be rendered instead of a generic error whenever the API returns:
 *   - LEAVE_OVERLAP                       (BL-009)
 *   - LEAVE_REG_CONFLICT                  (BL-010)
 *   - INSUFFICIENT_BALANCE                (BL-014)
 *   - LEAVE_FROM_DATE_IN_PAST             — past-date self-apply
 *   - LEAVE_SAME_DAY_ALREADY_CHECKED_IN   — same-day after check-in
 *   - LEAVE_CROSSES_YEAR_BOUNDARY         — toDate outside current year
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
    code === ErrorCode.INSUFFICIENT_BALANCE ||
    code === ErrorCode.LEAVE_FROM_DATE_IN_PAST ||
    code === ErrorCode.LEAVE_SAME_DAY_ALREADY_CHECKED_IN ||
    code === ErrorCode.LEAVE_CROSSES_YEAR_BOUNDARY;

  if (!isLeaveConflict) return null;

  const details = error.details as Partial<LeaveConflictDetails> & {
    requestedDays?: number;
    availableDays?: number;
    currentYear?: number;
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
  } else if (code === ErrorCode.LEAVE_FROM_DATE_IN_PAST) {
    heading = "Past dates can't be applied as leave";
    body = (
      <p className="text-xs text-slate leading-relaxed">
        Leave can only be applied for today or a future date. To correct
        a <span className="font-semibold text-charcoal">past attendance record</span>,
        use the <span className="font-semibold text-charcoal">Regularisation form</span>{' '}
        instead — your manager (or Admin, if the record is older than 7
        days) will review it.
      </p>
    );
  } else if (code === ErrorCode.LEAVE_SAME_DAY_ALREADY_CHECKED_IN) {
    heading = 'Already checked in today';
    body = (
      <p className="text-xs text-slate leading-relaxed">
        You've already checked in today, so today can't be converted to a
        leave day through this form. Either continue treating today as a
        working day, or submit a{' '}
        <span className="font-semibold text-charcoal">Regularisation request</span>{' '}
        <span className="font-semibold text-charcoal">tomorrow</span> for
        today's date — regularisation only accepts past-dated records, so
        the form will let you correct today's attendance once it's no
        longer the current day.
      </p>
    );
  } else if (code === ErrorCode.LEAVE_CROSSES_YEAR_BOUNDARY) {
    const year = details?.currentYear;
    heading = 'Leave dates must stay within this year';
    body = (
      <p className="text-xs text-slate leading-relaxed">
        Leave can only be applied for dates within the current calendar
        year{year ? ` (${year})` : ''}, because leave balances reset on
        January 1st. For a break that spans year-end, please submit two
        separate requests: one ending{' '}
        <span className="font-semibold text-charcoal">31 Dec</span> and
        one starting from{' '}
        <span className="font-semibold text-charcoal">1 Jan</span>{' '}
        next year. Maternity and Paternity leave are exempt from this rule.
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
      </div>
    </div>
  );
}
