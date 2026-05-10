/**
 * ManagerChangeAuditCard — BL-042.
 *
 * Surfaces previousManagerName + managerName on a review when
 * previousManagerId is non-null. Both managers are retained for audit.
 * Shown to Manager and Admin on the review detail page.
 */

import { clsx } from 'clsx';
import type { PerformanceReview } from '@nexora/contracts/performance';

interface ManagerChangeAuditCardProps {
  review: Pick<
    PerformanceReview,
    'managerId' | 'managerName' | 'previousManagerId' | 'previousManagerName'
  >;
  className?: string;
}

export function ManagerChangeAuditCard({ review, className }: ManagerChangeAuditCardProps) {
  if (!review.previousManagerId) return null;

  return (
    <div
      role="note"
      aria-label="Manager change audit — BL-042"
      className={clsx(
        'bg-umberbg border border-umber/30 rounded-lg px-4 py-3 flex items-start gap-3',
        className,
      )}
    >
      <svg
        className="w-4 h-4 text-umber flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19.07a10 10 0 1114.14 0H4.93z" />
      </svg>
      <div className="text-sm">
        <div className="font-semibold text-umber mb-0.5">Manager changed mid-cycle (BL-042)</div>
        <p className="text-xs text-charcoal/80 leading-relaxed">
          This review was previously managed by{' '}
          <span className="font-semibold text-charcoal">
            {review.previousManagerName ?? review.previousManagerId}
          </span>
          . The current reviewer is{' '}
          <span className="font-semibold text-charcoal">
            {review.managerName ?? review.managerId ?? 'Unassigned'}
          </span>
          . Both managers are retained in the audit trail.
        </p>
      </div>
    </div>
  );
}
