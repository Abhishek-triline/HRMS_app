'use client';

/**
 * MyReviewView — prototype-faithful personal performance review page.
 *
 * Visual reference:
 *   prototype/employee/my-reviews.html   (primary — richest, has Past Cycles table)
 *   prototype/admin/my-reviews.html
 *   prototype/manager/my-review.html
 *   prototype/payroll-officer/my-reviews.html
 *
 * Sections (rendered in order):
 *   1. Forest-gradient hero banner (active cycle)
 *   2. 3-column status cards (Self, Manager, Final)
 *   3. Goals card (read-only badges, no editable dropdowns on this page)
 *   4. Self-Rating card (editable form / submitted state / locked state)
 *   5. Manager Rating placeholder (shown while manager has not submitted)
 *   6. Past Cycles table (all finalised reviews)
 *
 * Data:
 *   - useReviews({ employeeId })   → list of PerformanceReviewSummary (past cycles table)
 *   - useReview(activeId)          → PerformanceReview (goals + notes)
 *   - useCycle(cycleId)            → PerformanceCycleSummary (deadlines for active cycle)
 *   - useSubmitSelfRating()        → mutation to save self-rating
 *
 * Business rules:
 *   BL-037  isMidCycleJoiner — skip current cycle, show notice.
 *   BL-039  Self-rating editable until selfReviewDeadline.
 *   BL-041  Locked when finalRating !== null / cycleStatus === 'Closed'.
 */

import Link from 'next/link';
import { useMe } from '@/lib/hooks/useAuth';
import { useReviews, useReview, useCycle, useCycles, useSubmitSelfRating } from '@/lib/hooks/usePerformance';
import { MidCycleJoinerNotice } from '@/components/performance/MidCycleJoinerNotice';
import { RatingScale } from '@/components/performance/RatingScale';
import { showToast } from '@/components/ui/Toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clsx } from 'clsx';
import type { PerformanceReviewSummary } from '@nexora/contracts/performance';
import { CYCLE_STATUS, CYCLE_STATUS_MAP, GOAL_OUTCOME, GOAL_OUTCOME_MAP } from '@/lib/status/maps';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function cyclePeriod(fyStart: string, fyEnd: string): string {
  const s = new Date(fyStart);
  const e = new Date(fyEnd);
  const sMon = s.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const eMon = e.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  return `${sMon} – ${eMon}`;
}

function fyLabel(fyStart: string): string {
  const y = new Date(fyStart).getFullYear();
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

// ── No-reviews empty state (forest hero + contextual subline) ────────────────

interface NoReviewsEmptyStateProps {
  /** The currently in-flight cycle, if any (Self-Review or Manager-Review). */
  inFlight?: { code: string; fyStart: string; fyEnd: string; status: number } | null;
  /** The next cycle (Open, not yet started). */
  upcoming?: { code: string; fyStart: string; fyEnd: string; selfReviewStart?: string } | null;
}

function NoReviewsEmptyState({ inFlight, upcoming }: NoReviewsEmptyStateProps) {
  let subline: string;
  if (inFlight) {
    subline = `Cycle ${inFlight.code} (${cyclePeriod(inFlight.fyStart, inFlight.fyEnd)}) is currently in ${(CYCLE_STATUS_MAP[inFlight.status]?.label ?? String(inFlight.status)).toLowerCase()}. You joined after this cycle started, so your first review will begin with the next cycle (BL-037).`;
  } else if (upcoming) {
    subline = `The next performance cycle — ${upcoming.code} (${cyclePeriod(upcoming.fyStart, upcoming.fyEnd)}) — has not started yet. Your review will be created when Self-Review opens.`;
  } else {
    subline = 'No performance cycle is active yet. Reviews are created at the start of each cycle. You’ll be notified here when yours opens.';
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white p-8 mb-6 shadow-2xl shadow-forest/40"
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #1C3D2E 25%, #2D7A5F 60%, #4DA37A 90%, #6FBE9E 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(200,230,218,0.20) 48%, rgba(255,255,255,0.06) 52%, transparent 72%)' }} />
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,153,0.30) 0%, transparent 60%)', filter: 'blur(24px)' }} />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(111,190,158,0.45) 0%, transparent 65%)', filter: 'blur(36px)' }} />

      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3 py-1 mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-widest">No active review</span>
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Nothing to review yet</h2>
        <p className="text-mint/90 text-sm leading-relaxed">{subline}</p>
      </div>
    </div>
  );
}

// ── Outcome badge ─────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<number, string> = {
  [GOAL_OUTCOME.Met]:     'bg-greenbg text-richgreen',
  [GOAL_OUTCOME.Partial]: 'bg-umberbg text-umber',
  [GOAL_OUTCOME.Missed]:  'bg-crimsonbg text-crimson',
  [GOAL_OUTCOME.Pending]: 'bg-umberbg text-umber',
};

const OUTCOME_LABELS: Record<number, string> = {
  [GOAL_OUTCOME.Met]:     'Met',
  [GOAL_OUTCOME.Partial]: 'Partially Met',
  [GOAL_OUTCOME.Missed]:  'Missed',
  [GOAL_OUTCOME.Pending]: 'Pending',
};

// ── Self-Rating inline form ───────────────────────────────────────────────────

const selfRatingSchema = z.object({
  selfRating: z.number().int().min(1, 'Please choose a rating').max(5),
  selfNote: z.string().max(2000).optional(),
});
type SelfRatingFormData = z.infer<typeof selfRatingSchema>;

// ── Review Hero Banner ────────────────────────────────────────────────────────

function ReviewHeroBanner({
  cycleCode,
  fyStart,
  fyEnd,
  selfReviewDeadline,
  managerReviewDeadline,
  managerName,
  status,
}: {
  cycleCode: string;
  fyStart: string;
  fyEnd: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  managerName: string | null;
  status: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white p-6 mb-6 shadow-2xl shadow-forest/40"
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #1C3D2E 25%, #2D7A5F 60%, #4DA37A 90%, #6FBE9E 100%)' }}
    >
      {/* Sheen overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(200,230,218,0.20) 48%, rgba(255,255,255,0.06) 52%, transparent 72%)' }}
      />
      {/* Ambient glow — top right */}
      <div
        className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,153,0.35) 0%, rgba(255,180,120,0.18) 28%, transparent 60%)', filter: 'blur(24px)' }}
      />
      {/* Ambient glow — bottom left */}
      <div
        className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(111,190,158,0.45) 0%, rgba(45,122,95,0.20) 35%, transparent 65%)', filter: 'blur(36px)' }}
      />
      {/* Wave lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" viewBox="0 0 800 240" preserveAspectRatio="none" fill="none" stroke="white" strokeWidth={1} aria-hidden="true">
        <path d="M0,40 C150,10 300,70 450,30 S700,80 800,50" />
        <path d="M0,80 C150,50 300,110 450,70 S700,120 800,90" />
        <path d="M0,120 C150,90 300,150 450,110 S700,160 800,130" />
        <path d="M0,160 C150,130 300,190 450,150 S700,200 800,170" />
        <path d="M0,200 C150,170 300,230 450,190 S700,240 800,210" />
      </svg>
      {/* Mountain silhouettes */}
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-25 pointer-events-none" viewBox="0 0 800 60" preserveAspectRatio="none" fill="#0F2E22" aria-hidden="true">
        <path d="M0,60 L0,38 L70,18 L150,32 L230,14 L310,30 L390,8 L470,22 L550,12 L630,28 L710,16 L800,30 L800,60 Z" />
      </svg>
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-30 pointer-events-none" viewBox="0 0 800 40" preserveAspectRatio="none" fill="#1C3D2E" aria-hidden="true">
        <path d="M0,40 L0,25 L60,10 L140,22 L220,5 L300,18 L380,2 L460,15 L540,6 L620,20 L700,8 L800,22 L800,40 Z" />
      </svg>
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.10] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />
      {/* Star sparks */}
      <div className="absolute top-6 right-1/4 w-1 h-1 rounded-full bg-white pointer-events-none" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }} />
      <div className="absolute top-14 right-[38%] w-0.5 h-0.5 rounded-full bg-white/80 pointer-events-none" />
      <div className="absolute top-20 left-1/3 w-1 h-1 rounded-full bg-white/85 pointer-events-none" style={{ boxShadow: '0 0 5px rgba(255,255,255,0.7)' }} />
      <div className="absolute top-9 left-[55%] w-0.5 h-0.5 rounded-full bg-white/60 pointer-events-none" />
      <div className="absolute top-24 right-[22%] w-1 h-1 rounded-full bg-mint pointer-events-none" style={{ boxShadow: '0 0 4px rgba(200,230,218,0.8)' }} />
      <div className="absolute bottom-16 right-[30%] w-0.5 h-0.5 rounded-full bg-white/70 pointer-events-none" />
      <div className="absolute top-16 left-[18%] w-0.5 h-0.5 rounded-full bg-mint/80 pointer-events-none" />

      {/* Content */}
      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-mint text-forest text-xs font-bold px-2 py-1 rounded">Active</span>
            <span className="text-mint/80 text-xs">{cycleCode}</span>
          </div>
          <h2 className="font-heading text-2xl font-bold mb-1">{cyclePeriod(fyStart, fyEnd)}</h2>
          {managerName && (
            <p className="text-mint/80 text-sm">
              Reporting Manager: <strong>{managerName}</strong>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
            <div className="text-xs text-mint/70">Self-Review By</div>
            <div className="text-sm font-bold">{formatDeadline(selfReviewDeadline)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
            <div className="text-xs text-mint/70">Manager Review By</div>
            <div className="text-sm font-bold">{formatDeadline(managerReviewDeadline)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero skeleton ─────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 p-6 text-white animate-pulse"
      style={{ background: 'linear-gradient(160deg, #0F2E22 0%, #2D7A5F 50%, #6FBE9E 100%)' }}
    >
      <div className="h-4 bg-white/20 rounded w-24 mb-3" />
      <div className="h-8 bg-white/20 rounded w-64 mb-2" />
      <div className="h-3 bg-white/15 rounded w-40" />
    </div>
  );
}

// ── Status cards skeleton ─────────────────────────────────────────────────────

function StatusCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-sage/30 p-5 animate-pulse">
          <div className="h-3 bg-sage/20 rounded w-20 mb-3" />
          <div className="h-8 bg-sage/20 rounded w-16 mb-2" />
          <div className="h-2.5 bg-sage/10 rounded w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Past cycles table skeleton ────────────────────────────────────────────────

function PastCyclesSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 animate-pulse">
      <div className="px-5 py-4 border-b border-sage/20">
        <div className="h-4 bg-sage/20 rounded w-28" />
      </div>
      <div className="divide-y divide-sage/10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-5 py-3 flex gap-4">
            <div className="h-3 bg-sage/20 rounded w-40" />
            <div className="h-3 bg-sage/10 rounded w-8" />
            <div className="h-3 bg-sage/10 rounded w-8" />
            <div className="h-3 bg-sage/10 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Self-rating section ───────────────────────────────────────────────────────

interface SelfRatingSectionProps {
  reviewId: number;
  selfRating: number | null;
  selfNote: string | null;
  selfSubmittedAt: string | null;
  selfReviewDeadline: string;
  lockedAt: string | null;
  cycleStatus: number;
  isMidCycleJoiner: boolean;
  version: number;
  basePath: string;
}

function SelfRatingSection({
  reviewId,
  selfRating,
  selfNote,
  selfSubmittedAt,
  selfReviewDeadline,
  lockedAt,
  cycleStatus,
  isMidCycleJoiner,
  version,
  basePath,
}: SelfRatingSectionProps) {
  const { mutateAsync, isPending } = useSubmitSelfRating(reviewId);

  const deadlinePassed = new Date(selfReviewDeadline) < new Date();
  const isClosed = lockedAt !== null || cycleStatus === CYCLE_STATUS.Closed;
  const isEditable = !deadlinePassed && !isClosed && !isMidCycleJoiner;
  const daysLeft = daysUntil(selfReviewDeadline);

  const {
    handleSubmit,
    control,
    register,
    watch,
    formState: { errors },
  } = useForm<SelfRatingFormData>({
    resolver: zodResolver(selfRatingSchema),
    defaultValues: {
      selfRating: selfRating ?? undefined,
      selfNote: selfNote ?? '',
    },
  });

  const noteValue = watch('selfNote') ?? '';

  async function onValid(data: SelfRatingFormData) {
    try {
      await mutateAsync({ selfRating: data.selfRating, selfNote: data.selfNote || undefined, version });
      showToast({ type: 'success', title: selfSubmittedAt ? 'Self-rating updated.' : 'Self-review submitted.' });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'CYCLE_CLOSED') {
        showToast({ type: 'error', title: 'This cycle is closed. Final ratings cannot be edited.' });
      } else {
        showToast({ type: 'error', title: 'Failed to save. Please try again.' });
      }
    }
  }

  if (isMidCycleJoiner) return null;

  // If locked — show read-only final state
  if (isClosed) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">Self-Rating</h3>
        <div className="bg-offwhite border border-dashed border-sage rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-sage flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-charcoal">
              Self-rating: {selfRating ?? '—'} / 5
            </div>
            <p className="text-xs text-slate mt-0.5">Cycle is closed. Final ratings are locked.</p>
          </div>
        </div>
        {selfNote && (
          <p className="mt-4 text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap">{selfNote}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
      <h3 className="font-heading text-base font-semibold text-charcoal mb-1">Self-Rating</h3>
      <p className="text-xs text-slate mb-5">
        {isEditable
          ? `Editable until self-review deadline · ${formatDeadline(selfReviewDeadline)}`
          : `Self-review window closed ${formatDeadline(selfReviewDeadline)}`}
      </p>

      {/* Deadline / urgency callout */}
      {!deadlinePassed && isEditable && (
        <div
          className={clsx(
            'rounded-lg px-4 py-3 flex items-start gap-2.5 mb-5',
            daysLeft <= 3
              ? 'bg-umberbg border border-umber/30'
              : 'bg-softmint border border-mint/50',
          )}
          role="note"
        >
          <svg
            className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', daysLeft <= 3 ? 'text-umber' : 'text-forest')}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={clsx('text-xs leading-relaxed', daysLeft <= 3 ? 'text-umber' : 'text-forest')}>
            {daysLeft <= 3
              ? `Deadline approaching — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`
              : `${daysLeft} days remaining to submit your self-review.`}
          </p>
        </div>
      )}

      {deadlinePassed && !isClosed && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-lg px-4 py-3 flex items-start gap-2.5 mb-5" role="note">
          <svg className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-crimson leading-relaxed">
            Self-review window closed on {formatDeadline(selfReviewDeadline)}. Submissions are no longer accepted.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onValid)} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            How do you rate your overall performance this cycle?
            {isEditable && <span className="text-crimson ml-0.5" aria-hidden="true">*</span>}
          </label>
          <Controller
            name="selfRating"
            control={control}
            render={({ field }) => (
              <RatingScale
                value={field.value ?? null}
                onChange={field.onChange}
                readonly={!isEditable}
                disabled={!isEditable}
                label="Overall self rating"
              />
            )}
          />
          {errors.selfRating && (
            <p className="mt-1.5 text-xs text-crimson" role="alert">{errors.selfRating.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            Reflection &amp; Comments
          </label>
          <div className="relative">
            <textarea
              {...register('selfNote')}
              rows={6}
              disabled={!isEditable}
              placeholder="Describe your performance, achievements, and areas for improvement…"
              className={clsx(
                'w-full border rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white resize-none',
                'placeholder:text-sage/70',
                'focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition',
                'disabled:bg-offwhite disabled:cursor-not-allowed',
                errors.selfNote ? 'border-crimson' : 'border-sage/50',
              )}
            />
            <span className="absolute bottom-2 right-3 text-xs text-sage pointer-events-none">
              {noteValue.length}/2000
            </span>
          </div>
          {errors.selfNote && (
            <p className="mt-1 text-xs text-crimson" role="alert">{errors.selfNote.message}</p>
          )}
        </div>

        {isEditable && (
          <div className="pt-4 border-t border-sage/20 flex justify-between items-center">
            <p className="text-xs text-slate">
              {selfSubmittedAt ? `Last saved: ${formatDate(selfSubmittedAt)}` : 'Not yet submitted'}
            </p>
            <div className="flex gap-3">
              <Link
                href={`${basePath}/${reviewId}`}
                className="border border-sage/50 px-4 py-2 rounded-lg text-sm font-semibold text-slate hover:bg-offwhite transition-colors"
              >
                Full review
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="bg-forest text-white hover:bg-emerald disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold transition-colors min-w-[44px] min-h-[44px]"
              >
                {isPending ? 'Saving…' : selfSubmittedAt ? 'Update Self-Review' : 'Submit Self-Review'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// ── Inline status card ────────────────────────────────────────────────────────

function StatusCard({
  label,
  value,
  badgeLabel,
  badgeClassName,
  subtitle,
  link,
  linkLabel,
  borderClassName,
}: {
  label: string;
  value: string;
  badgeLabel: string;
  badgeClassName: string;
  subtitle: string;
  link?: string;
  linkLabel?: string;
  borderClassName?: string;
}) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-sm p-5', borderClassName ?? 'border border-sage/30')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate uppercase">{label}</span>
        <span className={clsx('text-xs font-bold px-2 py-1 rounded', badgeClassName)}>{badgeLabel}</span>
      </div>
      <div className="font-heading text-3xl font-bold text-charcoal">{value}</div>
      <p className="text-xs text-slate mt-2">{subtitle}</p>
      {link && (
        <Link
          href={link}
          className="text-xs text-emerald font-semibold hover:underline mt-3 inline-block"
        >
          {linkLabel ?? 'View →'}
        </Link>
      )}
    </div>
  );
}

// ── MyReviewView ──────────────────────────────────────────────────────────────

interface MyReviewViewProps {
  /**
   * Role-specific base path for the review detail page.
   * e.g. "/admin/performance" → links to /admin/performance/{reviewId}
   */
  basePath: string;
}

export function MyReviewView({ basePath }: MyReviewViewProps) {
  const { data: auth } = useMe();
  const userId = auth?.data?.user?.id ?? '';

  // ── List of all reviews for this user ────────────────────────────────────
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
  } = useReviews({ employeeId: userId || undefined });

  // Cycle queries used only for the empty state to explain *why* there's
  // no review yet (in-flight cycle the user joined late vs. next cycle
  // hasn't started). Cheap — small payload, cached for 30s.
  const { data: selfReviewCycles } = useCycles({ status: CYCLE_STATUS.SelfReview });
  const { data: managerReviewCycles } = useCycles({ status: CYCLE_STATUS.ManagerReview });
  const { data: openCycles } = useCycles({ status: CYCLE_STATUS.Open });

  const allReviews: PerformanceReviewSummary[] = listData?.data ?? [];

  // Active = no finalRating and not mid-cycle joiner
  const activeReviewSummary = allReviews.find(
    (r) => r.finalRating === null && !r.isMidCycleJoiner,
  );

  // Past = finalRating set
  const pastReviews = allReviews
    .filter((r) => r.finalRating !== null)
    .sort((a, b) => b.cycleCode.localeCompare(a.cycleCode));

  // ── Full detail of the active review (for goals + notes) ─────────────────
  const {
    data: activeDetail,
    isLoading: detailLoading,
  } = useReview(activeReviewSummary?.id ?? 0);

  // ── Cycle info for active review (for deadlines) ──────────────────────────
  const {
    data: cycleData,
    isLoading: cycleLoading,
  } = useCycle(activeReviewSummary?.cycleId ?? 0);

  const loadingActive = detailLoading || cycleLoading;

  // ── Cycle summary for past cycles (fetched from active cycle only) ────────
  const hasMidCycleActive = allReviews.some((r) => r.isMidCycleJoiner && r.finalRating === null);

  // ── Error ─────────────────────────────────────────────────────────────────
  if (listError) {
    return (
      <div
        role="alert"
        className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 text-sm text-crimson"
      >
        Failed to load your performance reviews. Please refresh and try again.
      </div>
    );
  }

  // ── Skeleton while loading list ───────────────────────────────────────────
  if (listLoading) {
    return (
      <div>
        <HeroSkeleton />
        <StatusCardsSkeleton />
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5 animate-pulse">
          <div className="h-4 bg-sage/20 rounded w-40 mb-4" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-sage/20 rounded-lg p-4 mb-3">
              <div className="h-3 bg-sage/20 rounded w-56 mb-2" />
              <div className="h-2.5 bg-sage/10 rounded w-80" />
            </div>
          ))}
        </div>
        <PastCyclesSkeleton />
      </div>
    );
  }

  // ── Empty state (no reviews at all) ──────────────────────────────────────
  if (allReviews.length === 0) {
    const inFlightCycle =
      selfReviewCycles?.data?.[0] ?? managerReviewCycles?.data?.[0] ?? null;
    const upcomingCycle = openCycles?.data?.[0] ?? null;
    return (
      <NoReviewsEmptyState
        inFlight={inFlightCycle ? {
          code: inFlightCycle.code,
          fyStart: inFlightCycle.fyStart,
          fyEnd: inFlightCycle.fyEnd,
          status: inFlightCycle.status,
        } : null}
        upcoming={upcomingCycle ? {
          code: upcomingCycle.code,
          fyStart: upcomingCycle.fyStart,
          fyEnd: upcomingCycle.fyEnd,
        } : null}
      />
    );
  }

  // ── Resolved state ────────────────────────────────────────────────────────

  const review = activeDetail;
  const cycle = cycleData?.cycle ?? null;

  // ── Self-rating status card helpers ──────────────────────────────────────
  const selfSubmitted = activeReviewSummary?.selfRating !== null && activeReviewSummary?.selfRating !== undefined;
  const mgrSubmitted = activeReviewSummary?.managerRating !== null && activeReviewSummary?.managerRating !== undefined;
  const finalLocked = activeReviewSummary?.finalRating !== null && activeReviewSummary?.finalRating !== undefined;

  return (
    <div>
      {/* ── Mid-cycle joiner notice ─────────────────────────────────────── */}
      {hasMidCycleActive && <MidCycleJoinerNotice className="mb-5" />}

      {/* ── Active cycle section ────────────────────────────────────────── */}
      {activeReviewSummary && (
        <>
          {/* Hero banner */}
          {loadingActive ? (
            <HeroSkeleton />
          ) : cycle && review ? (
            <ReviewHeroBanner
              cycleCode={review.cycleCode}
              fyStart={cycle.fyStart}
              fyEnd={cycle.fyEnd}
              selfReviewDeadline={cycle.selfReviewDeadline}
              managerReviewDeadline={cycle.managerReviewDeadline}
              managerName={review.managerName}
              status={cycle.status}
            />
          ) : (
            <HeroSkeleton />
          )}

          {/* Status cards */}
          {loadingActive ? (
            <StatusCardsSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              {/* Self-Rating card */}
              <StatusCard
                label="Self-Rating"
                value={selfSubmitted ? `${activeReviewSummary.selfRating} / 5` : '— / 5'}
                badgeLabel={selfSubmitted ? 'Submitted' : 'Pending'}
                badgeClassName={selfSubmitted ? 'bg-greenbg text-richgreen' : 'bg-umberbg text-umber'}
                subtitle={
                  selfSubmitted && review?.selfSubmittedAt
                    ? `Submitted ${formatDate(review.selfSubmittedAt)} · Editable until ${cycle ? formatDeadline(cycle.selfReviewDeadline) : '—'}`
                    : cycle
                      ? `Due by ${formatDeadline(cycle.selfReviewDeadline)}`
                      : 'Submit your self-rating'
                }
                link={selfSubmitted ? `${basePath}/${activeReviewSummary.id}` : undefined}
                linkLabel="Edit Self-Rating →"
                borderClassName={selfSubmitted ? 'border-2 border-emerald' : 'border border-sage/30'}
              />

              {/* Manager Rating card */}
              <StatusCard
                label="Manager Rating"
                value={mgrSubmitted ? `${activeReviewSummary.managerRating} / 5` : '— / 5'}
                badgeLabel={mgrSubmitted ? 'Submitted' : 'Pending'}
                badgeClassName={mgrSubmitted ? 'bg-greenbg text-richgreen' : 'bg-umberbg text-umber'}
                subtitle={
                  mgrSubmitted && review?.managerSubmittedAt
                    ? `Submitted ${formatDate(review.managerSubmittedAt)}`
                    : activeReviewSummary.managerName
                      ? `Awaiting ${activeReviewSummary.managerName}${cycle ? ` · before ${formatDeadline(cycle.managerReviewDeadline)}` : ''}`
                      : 'No reviewer assigned'
                }
              />

              {/* Final Rating card */}
              <StatusCard
                label="Final Rating"
                value={finalLocked ? `${activeReviewSummary.finalRating} / 5` : '—'}
                badgeLabel={finalLocked ? 'Locked' : 'Not Locked'}
                badgeClassName={finalLocked ? 'bg-lockedbg text-lockedfg' : 'bg-umberbg text-umber'}
                subtitle={finalLocked ? 'Cycle closed by Admin' : 'Locks when Admin closes cycle'}
              />
            </div>
          )}

          {/* Goals card */}
          {loadingActive ? (
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5 animate-pulse">
              <div className="h-4 bg-sage/20 rounded w-48 mb-4" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="border border-sage/20 rounded-lg p-4 mb-3">
                  <div className="h-3 bg-sage/20 rounded w-56 mb-2" />
                  <div className="h-2.5 bg-sage/10 rounded w-full" />
                </div>
              ))}
            </div>
          ) : review && review.goals.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base font-semibold text-charcoal">
                  My Goals — {review.cycleCode}
                </h3>
                <span className="text-xs text-slate">
                  {review.managerName
                    ? `Set by ${review.managerName} · ${review.goals.length} goal${review.goals.length !== 1 ? 's' : ''} (typical 3–5; you may propose more during self-review)`
                    : `${review.goals.length} goal${review.goals.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="space-y-3">
                {review.goals.map((goal) => (
                  <div key={goal.id} className="border border-sage/30 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-charcoal">{goal.text}</div>
                        {goal.proposedByEmployee && (
                          <span className="mt-1 inline-flex items-center gap-1 bg-softmint text-forest text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Proposed by you
                          </span>
                        )}
                      </div>
                      <span className={clsx(
                        'text-xs font-bold px-2 py-1 rounded shrink-0',
                        OUTCOME_COLORS[goal.outcomeId] ?? 'bg-umberbg text-umber',
                      )}>
                        {OUTCOME_LABELS[goal.outcomeId] ?? GOAL_OUTCOME_MAP[goal.outcomeId]?.label ?? String(goal.outcomeId)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : review && review.goals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
              <h3 className="font-heading text-base font-semibold text-charcoal mb-3">My Goals</h3>
              <p className="text-sm text-slate">
                No goals set yet. Your reporting manager will add goals at the start of the review cycle.
              </p>
            </div>
          ) : null}

          {/* Self-Rating form */}
          {loadingActive ? (
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5 animate-pulse">
              <div className="h-4 bg-sage/20 rounded w-32 mb-3" />
              <div className="flex gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="w-12 h-12 bg-sage/20 rounded-lg" />
                ))}
              </div>
              <div className="h-32 bg-sage/10 rounded-lg" />
            </div>
          ) : review && cycle ? (
            <SelfRatingSection
              reviewId={review.id}
              selfRating={review.selfRating}
              selfNote={review.selfNote}
              selfSubmittedAt={review.selfSubmittedAt}
              selfReviewDeadline={cycle.selfReviewDeadline}
              lockedAt={review.lockedAt}
              cycleStatus={review.cycleStatus}
              isMidCycleJoiner={review.isMidCycleJoiner}
              version={review.version}
              basePath={basePath}
            />
          ) : null}

          {/* Manager Rating placeholder — shown when manager hasn't submitted yet */}
          {!loadingActive && review && !mgrSubmitted && !finalLocked && (
            <div className="bg-offwhite rounded-xl border border-dashed border-sage p-6 text-center mb-6">
              <svg className="w-10 h-10 text-sage mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-sm font-semibold text-charcoal">Manager Rating — pending</div>
              <p className="text-xs text-slate mt-1">
                {review.managerName
                  ? `${review.managerName} will submit the manager rating after the self-review deadline. Final rating will be locked once Admin closes the cycle.`
                  : 'Your reviewer will submit the manager rating after the self-review deadline.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Past Cycles table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30">
        <div className="px-5 py-4 border-b border-sage/20">
          <h3 className="text-sm font-semibold text-charcoal">Past Cycles</h3>
        </div>
        {pastReviews.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <svg className="w-8 h-8 mx-auto text-sage/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate">No past reviews yet — this is your first cycle.</p>
          </div>
        ) : (
          <table className="w-full text-sm" aria-label="Past review cycles">
            <thead className="bg-offwhite">
              <tr>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3">Cycle</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Self</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Manager</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Final</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3">Status</th>
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {pastReviews.map((r) => (
                <tr key={r.id} className="hover:bg-offwhite/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-charcoal">{r.cycleCode}</td>
                  <td className="px-4 py-3 text-slate">{r.selfRating ?? '—'}</td>
                  <td className="px-4 py-3 text-slate">{r.managerRating ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-charcoal">
                    {r.finalRating !== null ? `${r.finalRating} / 5` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-lockedbg text-lockedfg text-xs font-bold px-2 py-1 rounded">
                      Closed
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/${r.id}`}
                      className="text-xs font-semibold text-emerald hover:text-forest transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
