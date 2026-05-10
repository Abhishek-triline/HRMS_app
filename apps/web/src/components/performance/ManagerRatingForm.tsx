'use client';

/**
 * ManagerRatingForm — BL-040.
 *
 * RHF form: rating 1–5 + note + per-goal outcome inputs.
 * Disabled after managerReviewDeadline.
 * Shows OverrideTag preview if rating differs from self rating.
 * Version-stamped for optimistic concurrency.
 */

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';
import { RatingScale } from './RatingScale';
import { GoalRow } from './GoalRow';
import { OverrideTag } from './OverrideTag';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import type { PerformanceReview, GoalOutcome } from '@nexora/contracts/performance';

const managerRatingSchema = z.object({
  managerRating: z.number().int().min(1, 'Please select a rating').max(5),
  managerNote: z.string().max(2000, 'Note must be 2000 characters or fewer').optional(),
});

type ManagerRatingFormValues = z.infer<typeof managerRatingSchema>;

interface ManagerRatingFormProps {
  review: Pick<
    PerformanceReview,
    | 'managerRating'
    | 'managerNote'
    | 'managerSubmittedAt'
    | 'selfRating'
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

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ManagerRatingForm({ review, managerReviewDeadline, onSubmit, isSubmitting = false }: ManagerRatingFormProps) {
  const deadlinePassed = new Date(managerReviewDeadline) < new Date();
  const isClosed = review.lockedAt !== null;
  const isDisabled = deadlinePassed || isClosed;
  const daysLeft = daysUntil(managerReviewDeadline);

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
            className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', deadlinePassed ? 'text-crimson' : daysLeft <= 3 ? 'text-umber' : 'text-forest')}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={clsx('text-xs leading-relaxed', deadlinePassed ? 'text-crimson' : daysLeft <= 3 ? 'text-umber' : 'text-forest')}>
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
        <div className="bg-lockedbg border border-lockedfg/30 rounded-lg px-4 py-3 flex items-center gap-2.5" role="note">
          <svg className="w-4 h-4 text-lockedfg flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-lockedfg">This cycle is closed. Final ratings are locked (BL-041).</p>
        </div>
      )}

      {/* Self rating reference */}
      {review.selfRating !== null && (
        <div className="flex items-center gap-3 p-3 bg-offwhite rounded-lg border border-sage/30">
          <span className="text-xs text-slate">Employee self rating:</span>
          <RatingScale value={review.selfRating} readonly label="Employee self rating" />
          {showOverridePreview && (
            <OverrideTag show className="ml-auto" />
          )}
        </div>
      )}

      {/* Manager rating */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-2">
          Manager Rating <span className="text-crimson" aria-hidden="true">*</span>
        </label>
        <Controller
          name="managerRating"
          control={control}
          render={({ field }) => (
            <RatingScale
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

      {/* Note */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-1.5">
          Manager Note
          <span className="ml-1 text-xs font-normal text-slate">(optional, up to 2000 characters)</span>
        </label>
        <div className="relative">
          <textarea
            {...register('managerNote')}
            rows={4}
            maxLength={2000}
            disabled={isDisabled}
            placeholder="Provide feedback on the employee's performance, strengths, and areas for development…"
            className={clsx(
              'w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white resize-none',
              'placeholder:text-sage/70',
              'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
              'disabled:bg-offwhite disabled:cursor-not-allowed',
              errors.managerNote ? 'border-crimson' : 'border-sage',
            )}
          />
          <span className="absolute bottom-2 right-3 text-xs text-sage pointer-events-none">
            {noteValue.length}/2000
          </span>
        </div>
        {errors.managerNote && <FieldError message={errors.managerNote.message} />}
      </div>

      {/* Per-goal outcomes */}
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

      {/* Submit */}
      {!isDisabled && (
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {review.managerSubmittedAt ? 'Update manager rating' : 'Submit manager rating'}
        </Button>
      )}
    </form>
  );
}
