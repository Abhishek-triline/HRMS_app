/**
 * ReviewStatusBadge — derives a review state from the PerformanceReview fields.
 *
 * States:
 *   locked     — finalRating is set (cycle closed, BL-041)
 *   both       — selfRating + managerRating both submitted
 *   mgr-only   — managerRating set, no selfRating
 *   self-only  — selfRating set, no managerRating
 *   no-rating  — nothing submitted yet
 *   skipped    — isMidCycleJoiner (BL-037)
 */

import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BadgeStatus } from '@/components/ui/StatusBadge';
import type { PerformanceReviewSummary } from '@nexora/contracts/performance';

type ReviewState = 'locked' | 'both' | 'mgr-only' | 'self-only' | 'no-rating' | 'skipped';

function deriveState(review: Pick<
  PerformanceReviewSummary,
  'finalRating' | 'selfRating' | 'managerRating' | 'isMidCycleJoiner'
>): ReviewState {
  if (review.isMidCycleJoiner) return 'skipped';
  if (review.finalRating !== null) return 'locked';
  if (review.selfRating !== null && review.managerRating !== null) return 'both';
  if (review.managerRating !== null) return 'mgr-only';
  if (review.selfRating !== null) return 'self-only';
  return 'no-rating';
}

const stateConfig: Record<ReviewState, { status: BadgeStatus; label: string }> = {
  locked: { status: 'locked', label: 'Locked' },
  both: { status: 'finalised', label: 'Complete' },
  'mgr-only': { status: 'processing', label: 'Mgr Rated' },
  'self-only': { status: 'review', label: 'Self Rated' },
  'no-rating': { status: 'pending', label: 'Pending' },
  skipped: { status: 'inactive', label: 'Skipped' },
};

interface ReviewStatusBadgeProps {
  review: Pick<
    PerformanceReviewSummary,
    'finalRating' | 'selfRating' | 'managerRating' | 'isMidCycleJoiner'
  >;
  className?: string;
}

export function ReviewStatusBadge({ review, className }: ReviewStatusBadgeProps) {
  const state = deriveState(review);
  const config = stateConfig[state];
  return <StatusBadge status={config.status} label={config.label} className={className} />;
}
