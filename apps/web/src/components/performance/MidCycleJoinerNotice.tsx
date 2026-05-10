/**
 * MidCycleJoinerNotice — BL-037.
 *
 * Banner shown on a review where isMidCycleJoiner=true.
 * Employees who joined after fyStart are skipped for the current cycle
 * and included from the next.
 */

import { clsx } from 'clsx';

interface MidCycleJoinerNoticeProps {
  className?: string;
}

export function MidCycleJoinerNotice({ className }: MidCycleJoinerNoticeProps) {
  return (
    <div
      role="note"
      aria-label="Mid-cycle joiner notice — BL-037"
      className={clsx(
        'bg-softmint border border-mint/50 rounded-lg px-4 py-3 flex items-start gap-3',
        className,
      )}
    >
      <svg
        className="w-5 h-5 text-forest flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-sm">
        <div className="font-semibold text-forest mb-0.5">Mid-cycle joiner — skipped this cycle (BL-037)</div>
        <p className="text-xs text-charcoal/80 leading-relaxed">
          You joined after the fiscal year start date for this review cycle. Per company policy (BL-037),
          employees who join mid-cycle are excluded from the current cycle&apos;s performance review
          and will be included from the next full cycle.
        </p>
      </div>
    </div>
  );
}
