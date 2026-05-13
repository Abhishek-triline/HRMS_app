/**
 * LateMarkBanner — shown on the check-in page when lateMonthCount > 0.
 * Colours escalate per BL-028:
 *   1 of 3 → info (softmint / forest)
 *   2 of 3 → warning (umberbg / umber)
 *   3+     → deduction notice (crimsonbg / crimson)
 */

import { clsx } from 'clsx';

interface LateMarkBannerProps {
  lateMonthCount: number;
  lateThreshold: string;
  className?: string;
}

export function LateMarkBanner({ lateMonthCount, lateThreshold, className }: LateMarkBannerProps) {
  if (lateMonthCount <= 0) return null;

  const isDeduction = lateMonthCount >= 3;
  const isWarning = lateMonthCount === 2;

  const containerCls = isDeduction
    ? 'bg-crimsonbg border-crimson/40 text-crimson'
    : isWarning
      ? 'bg-umberbg border-umber/30 text-umber'
      : 'bg-softmint border-mint text-forest';

  const iconCls = isDeduction ? 'text-crimson' : isWarning ? 'text-umber' : 'text-forest';

  let title = '';
  let body = '';

  if (isDeduction) {
    const deductions = Math.floor(lateMonthCount / 3);
    title = `Late deduction applied — ${deductions} day${deductions > 1 ? 's' : ''} deducted`;
    body = `You have accumulated ${lateMonthCount} late mark${lateMonthCount > 1 ? 's' : ''} this month. Every 3 late marks = 1 day deducted from Annual leave.`;
  } else if (isWarning) {
    title = 'Late mark warning — 2 of 3';
    body = `You have ${lateMonthCount} late mark${lateMonthCount > 1 ? 's' : ''} this month. One more late check-in after ${lateThreshold} will trigger a leave deduction.`;
  } else {
    title = 'Late mark recorded — 1 of 3';
    body = `You checked in after ${lateThreshold}. You have ${lateMonthCount} late mark this month. 2 more will deduct 1 day from Annual leave.`;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'flex items-start gap-3 border rounded-xl p-5',
        containerCls,
        className,
      )}
    >
      <svg
        className={clsx('w-5 h-5 mt-0.5 flex-shrink-0', iconCls)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <div className="text-sm font-semibold mb-1">{title}</div>
        <div className="text-xs leading-relaxed opacity-90">{body}</div>
      </div>
    </div>
  );
}
