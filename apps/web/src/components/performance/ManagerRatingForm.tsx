'use client';

/**
 * ManagerRatingForm — BL-040.
 *
 * RHF form: 5-star rating button row + note (max 500 chars) + per-goal
 * outcome dropdowns. Disabled after managerReviewDeadline or cycle close.
 * Shows OverrideTag preview if rating differs from self rating.
 * Shows "Waiting for Self-Review" state when employee hasn't submitted yet.
 * Version-stamped for optimistic concurrency.
 *
 * Visual reference: prototype/manager/manager-rating.html
 */

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';
import { GoalRow } from './GoalRow';
import { OverrideTag } from './OverrideTag';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import type { PerformanceReview, GoalOutcome } from '@nexora/contracts/performance';

const MAX_NOTE = 500;

const managerRatingSchema = z.object({
  managerRating: z.number().int().min(1, 'Please select a rating').max(5),
  managerNote: z
    .string()
    .max(MAX_NOTE, `Note must be ${MAX_NOTE} characters or fewer`)
    .optional(),
});

type ManagerRatingFormValues = z.infer<typeof managerRatingSchema>;

interface ManagerRatingFormProps {
  review: Pick<
    PerformanceReview,
    | 'managerRating'
    | 'managerNote'
    | 'managerSubmittedAt'
    | 'selfRating'
    | 'selfNote'
    | 'selfSubmittedAt'
    | 'lockedAt'
    | 'version'
    | 'goals'
    | 'cycleStatus'
  >;
  /** ISO date-only string from the parent cycle */
  managerReviewDeadline: string;
  onSubmit: (data: {
    managerRating: number;
    managerNote?: string;
    goals?: Array<{ id: string; outcome: GoalOutcome }>;
    version: number;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

// ── Star SVG path ────────────────────────────────────────────────────────────
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('w-9 h-9', className)}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

// ── Read-only star row (for employee self-rating preview) ────────────────────
function StarRow({
  value,
  onChange,
  readonly = false,
  disabled = false,
  label,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = display >= star;
          if (readonly || disabled) {
            return (
              <StarIcon
                key={star}
                className={isActive ? 'text-forest' : 'text-sage'}
              />
            );
          }
          return (
            <button
              key={star}
              type="button"
              title={`${star} star${star !== 1 ? 's' : ''}`}
              aria-label={`Rate ${star} out of 5`}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              className={clsx(
                'transition-colors cursor-pointer',
                isActive ? 'text-forest hover:text-emerald' : 'text-sage hover:text-forest',
              )}
            >
              <StarIcon />
            </button>
          );
        })}
      </div>
      {value !== null && (
        <span className="text-lg font-heading font-bold text-forest ml-1">
          {value} / 5
        </span>
      )}
    </div>
  );
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ManagerRatingForm({
  review,
  managerReviewDeadline,
  onSubmit,
  isSubmitting = false,
}: ManagerRatingFormProps) {
  const deadlinePassed = new Date(managerReviewDeadline) < new Date();
  const isClosed = review.lockedAt !== null;
  const isDisabled = deadlinePassed || isClosed;
  const daysLeft = daysUntil(managerReviewDeadline);

  // Waiting for self-review state — show empty state block
  const waitingForSelfReview =
    review.selfSubmittedAt === null && !isClosed;

  // Track per-goal outcomes in local state (seeded from review.goals).
  const [goalOutcomes, setGoalOutcomes] = useState<Record<string, GoalOutcome>>(
    () => Object.fromEntries(review.goals.map((g) => [g.id, g.outcome])),
  );

  const {
    handleSubmit,
    control,
    register,
    watch,
    formState: { errors },
  } = useForm<ManagerRatingFormValues>({
    resolver: zodResolver(managerRatingSchema),
    defaultValues: {
      managerRating: review.managerRating ?? undefined,
      managerNote: review.managerNote ?? '',
    },
  });

  const currentRating = watch('managerRating');
  const noteValue = watch('managerNote') ?? '';
  const showOverridePreview =
    review.selfRating !== null &&
    currentRating !== undefined &&
    currentRating !== review.selfRating;

  async function onValid(data: ManagerRatingFormValues) {
    const goalsPayload = Object.entries(goalOutcomes).map(([id, outcome]) => ({ id, outcome }));
    await onSubmit({
      managerRating: data.managerRating,
      managerNote: data.managerNote || undefined,
      goals: goalsPayload.length > 0 ? goalsPayload : undefined,
      version: review.version,
    });
  }

  // ── Waiting for self-review empty state ─────────────────────────────────
  if (waitingForSelfReview) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-softmint flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-heading font-semibold text-charcoal text-lg mb-2">Waiting for Self-Review</h3>
        <p className="text-sm text-slate max-w-sm mx-auto">
          The employee has not submitted their self-review yet. Manager rating can be submitted once the employee completes their self-assessment.
        </p>
        <p className="text-xs text-slate mt-3">
          Self-review deadline:{' '}
          <span className="font-semibold text-charcoal">{review.selfSubmittedAt ?? managerReviewDeadline}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">
      {/* Deadline banner */}
      {!isClosed && (
        <div
          className={clsx(
            'rounded-lg px-4 py-3 flex items-start gap-2.5',
            deadlinePassed
              ? 'bg-crimsonbg border border-crimson/30'
              : daysLeft <= 3
                ? 'bg-umberbg border border-umber/30'
                : 'bg-softmint border border-mint/50',
          )}
          role="note"
          aria-live="polite"
        >
          <svg
            className={clsx(
              'w-4 h-4 flex-shrink-0 mt-0.5',
              deadlinePassed ? 'text-crimson' : daysLeft <= 3 ? 'text-umber' : 'text-forest',
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p
            className={clsx(
              'text-xs leading-relaxed',
              deadlinePassed ? 'text-crimson' : daysLeft <= 3 ? 'text-umber' : 'text-forest',
            )}
          >
            {deadlinePassed
              ? `Manager-review window closed on ${managerReviewDeadline}. Ratings cannot be updated.`
              : daysLeft <= 3
                ? `Deadline approaching — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining (${managerReviewDeadline}).`
                : `Manager-review deadline: ${managerReviewDeadline} (${daysLeft} days remaining).`}
          </p>
        </div>
      )}

      {/* Locked banner */}
      {isClosed && (
        <div
          className="bg-lockedbg border border-lockedfg/30 rounded-lg px-4 py-3 flex items-center gap-2.5"
          role="note"
        >
          <svg
            className="w-4 h-4 text-lockedfg flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-lockedfg">This cycle is closed. Final ratings are locked (BL-041).</p>
        </div>
      )}

      {/* Employee Self-Rating preview (read-only stars) */}
      {review.selfRating !== null && (
        <div className="bg-softmint border border-mint rounded-xl p-5">
          <h4 className="font-heading font-semibold text-sm text-forest mb-3">Employee Self-Rating</h4>
          <div className="flex items-center gap-3 mb-3">
            <StarRow value={review.selfRating} readonly label="Employee self rating" />
            {showOverridePreview && <OverrideTag show className="ml-auto" />}
          </div>
          {review.selfNote && (
            <p className="text-sm text-forest/80 italic leading-relaxed">
              &ldquo;{review.selfNote}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Manager Rating — 5-star row */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-3">
          Manager Rating <span className="text-crimson" aria-hidden="true">*</span>
        </label>
        <Controller
          name="managerRating"
          control={control}
          render={({ field }) => (
            <StarRow
              value={field.value ?? null}
              onChange={field.onChange}
              readonly={isDisabled}
              disabled={isDisabled}
              label="Manager rating"
            />
          )}
        />
        {errors.managerRating && (
          <FieldError message={errors.managerRating.message} />
        )}
      </div>

      {/* Note — 500 char limit */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-1.5">
          Manager Comments
          <span className="ml-1 text-xs font-normal text-slate">(optional)</span>
        </label>
        <div className="relative">
          <textarea
            {...register('managerNote')}
            rows={4}
            maxLength={MAX_NOTE}
            disabled={isDisabled}
            placeholder="Provide constructive feedback on the employee's performance, strengths, and areas for development…"
            className={clsx(
              'w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white resize-none',
              'placeholder:text-sage/70',
              'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
              'disabled:bg-offwhite disabled:cursor-not-allowed',
              errors.managerNote ? 'border-crimson' : 'border-sage',
            )}
          />
          <span className="absolute bottom-2 right-3 text-xs text-sage pointer-events-none">
            {noteValue.length} / {MAX_NOTE} characters
          </span>
        </div>
        {errors.managerNote && <FieldError message={errors.managerNote.message} />}
      </div>

      {/* Per-goal outcome dropdowns */}
      {review.goals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-charcoal mb-2">Goal Outcomes</h4>
          <div className="space-y-2">
            {review.goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={{ ...goal, outcome: goalOutcomes[goal.id] ?? goal.outcome }}
                onOutcomeChange={
                  isDisabled
                    ? undefined
                    : (goalId, outcome) =>
                        setGoalOutcomes((prev) => ({ ...prev, [goalId]: outcome }))
                }
                disabled={isDisabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Submit + softmint footer */}
      {!isDisabled && (
        <>
          <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
            {review.managerSubmittedAt ? 'Update Rating' : 'Submit Rating'}
          </Button>
          <div className="bg-softmint rounded-lg px-4 py-2.5 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-forest shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-forest">
              Editable until Manager-Review Deadline:{' '}
              <span className="font-bold">{managerReviewDeadline}</span>
            </p>
          </div>
        </>
      )}
    </form>
  );
}
