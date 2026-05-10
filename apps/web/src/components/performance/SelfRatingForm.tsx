'use client';

/**
 * SelfRatingForm — BL-039.
 *
 * RHF form: rating 1–5 + textarea note.
 * Disabled after selfReviewDeadline.
 * Shows a deadline countdown banner.
 * Version-stamped submission for optimistic concurrency.
 */

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';
import { RatingScale } from './RatingScale';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import type { PerformanceReview } from '@nexora/contracts/performance';

const selfRatingSchema = z.object({
  selfRating: z.number().int().min(1, 'Please select a rating').max(5),
  selfNote: z.string().max(2000, 'Note must be 2000 characters or fewer').optional(),
});

type SelfRatingForm = z.infer<typeof selfRatingSchema>;

interface SelfRatingFormProps {
  review: Pick<
    PerformanceReview,
    | 'selfRating'
    | 'selfNote'
    | 'selfSubmittedAt'
    | 'lockedAt'
    | 'version'
    | 'cycleStatus'
    | 'isMidCycleJoiner'
  >;
  /** ISO date-only string from the parent cycle */
  selfReviewDeadline: string;
  onSubmit: (data: { selfRating: number; selfNote?: string; version: number }) => Promise<void>;
  isSubmitting?: boolean;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function SelfRatingForm({ review, selfReviewDeadline, onSubmit, isSubmitting = false }: SelfRatingFormProps) {
  const deadlinePassed = new Date(selfReviewDeadline) < new Date();
  const isClosed = review.lockedAt !== null;
  const isDisabled = deadlinePassed || isClosed || review.isMidCycleJoiner;
  const daysLeft = daysUntil(selfReviewDeadline);

  const {
    handleSubmit,
    control,
    register,
    watch,
    formState: { errors },
  } = useForm<SelfRatingForm>({
    resolver: zodResolver(selfRatingSchema),
    defaultValues: {
      selfRating: review.selfRating ?? undefined,
      selfNote: review.selfNote ?? '',
    },
  });

  const noteValue = watch('selfNote') ?? '';

  async function onValid(data: SelfRatingForm) {
    await onSubmit({
      selfRating: data.selfRating,
      selfNote: data.selfNote || undefined,
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
              ? `Self-review window closed on ${selfReviewDeadline}. Submissions are no longer accepted.`
              : daysLeft <= 3
                ? `Deadline approaching — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining (${selfReviewDeadline}).`
                : `Self-review deadline: ${selfReviewDeadline} (${daysLeft} days remaining).`}
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

      {/* Rating */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-2">
          Self Rating <span className="text-crimson" aria-hidden="true">*</span>
        </label>
        <Controller
          name="selfRating"
          control={control}
          render={({ field }) => (
            <RatingScale
              value={field.value ?? null}
              onChange={field.onChange}
              readonly={isDisabled}
              disabled={isDisabled}
              label="Self rating"
            />
          )}
        />
        {errors.selfRating && (
          <FieldError message={errors.selfRating.message} />
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-1.5">
          Self Note
          <span className="ml-1 text-xs font-normal text-slate">(optional, up to 2000 characters)</span>
        </label>
        <div className="relative">
          <textarea
            {...register('selfNote')}
            rows={4}
            maxLength={2000}
            disabled={isDisabled}
            placeholder="Describe your performance, achievements, and areas for improvement…"
            className={clsx(
              'w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white resize-none',
              'placeholder:text-sage/70',
              'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
              'disabled:bg-offwhite disabled:cursor-not-allowed',
              errors.selfNote ? 'border-crimson' : 'border-sage',
            )}
          />
          <span className="absolute bottom-2 right-3 text-xs text-sage pointer-events-none">
            {noteValue.length}/2000
          </span>
        </div>
        {errors.selfNote && <FieldError message={errors.selfNote.message} />}
      </div>

      {/* Submit */}
      {!isDisabled && (
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {review.selfSubmittedAt ? 'Update self rating' : 'Submit self rating'}
        </Button>
      )}
    </form>
  );
}
