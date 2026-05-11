'use client';

/**
 * RegularisationForm — RHF + zod form for E-07 Regularisation Request.
 *
 * - Date picker: only past dates allowed
 * - proposedCheckIn / proposedCheckOut: HH:MM time inputs (24h)
 * - reason: textarea with 5-1000 char validation
 * - Original Record panel: fetched from useAttendanceList filtered to chosen date
 * - 409 LEAVE_REG_CONFLICT → rendered via ConflictErrorBlock (Phase 2 reuse, DN-19)
 * - At least one time field required (CreateRegularisationRequestSchema refine)
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { Spinner } from '@/components/ui/Spinner';
import { ConflictErrorBlock } from '@/components/leave/ConflictErrorBlock';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { RegularisationStatusBadge } from './RegularisationStatusBadge';
import { useSubmitRegularisation } from '@/lib/hooks/useRegularisations';
import { useAttendanceList } from '@/lib/hooks/useAttendance';
import { useRegularisations } from '@/lib/hooks/useRegularisations';
import { ApiError } from '@/lib/api/client';

// ── Zod schema (mirrors CreateRegularisationRequestSchema but with UX coercion) ─

const formSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .refine((v) => v < new Date().toISOString().slice(0, 10), 'Date must be in the past'),
    proposedCheckIn: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24-hour)')
      .nullable()
      .optional(),
    proposedCheckOut: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24-hour)')
      .nullable()
      .optional(),
    reason: z.string().min(5, 'Reason must be at least 5 characters.').max(1000, 'Max 1000 characters.'),
  })
  .refine((v) => v.proposedCheckIn || v.proposedCheckOut, {
    message: 'At least one of Check-in or Check-out time is required.',
    path: ['proposedCheckIn'],
  });

type FormValues = z.infer<typeof formSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHHMM(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayMinus1(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegularisationForm() {
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: todayMinus1(),
      proposedCheckIn: '',
      proposedCheckOut: '',
      reason: '',
    },
  });

  const watchedDate = watch('date');
  const reason = watch('reason');

  // Fetch the original attendance record for the chosen date
  const { data: attData, isLoading: attLoading } = useAttendanceList('me', {
    date: watchedDate,
  });
  const originalRecord = attData?.data?.[0] ?? null;

  // My regularisation history
  const { data: historyData } = useRegularisations();

  const submitMutation = useSubmitRegularisation();

  // Reset conflict error when date changes
  useEffect(() => {
    setSubmitError(null);
  }, [watchedDate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await submitMutation.mutateAsync({
        date: values.date,
        proposedCheckIn: values.proposedCheckIn || null,
        proposedCheckOut: values.proposedCheckOut || null,
        reason: values.reason,
      });
      setSubmitted(true);
      reset({ date: todayMinus1(), proposedCheckIn: '', proposedCheckOut: '', reason: '' });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left: Form (2/3) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h2 className="font-heading text-base font-semibold text-charcoal mb-5">
            Submit Regularisation
          </h2>

          {submitted && (
            <div role="alert" aria-live="assertive" className="mb-5 bg-greenbg border border-richgreen/30 rounded-lg p-4 text-sm text-richgreen font-semibold">
              Regularisation request submitted successfully and routed for approval.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Date */}
            <div>
              <Label htmlFor="reg-date">
                Select Date <span className="text-crimson" aria-hidden="true">*</span>
              </Label>
              <input
                id="reg-date"
                type="date"
                max={todayMinus1()}
                aria-required="true"
                aria-describedby={errors.date ? 'reg-date-error' : 'reg-date-hint'}
                {...register('date')}
                className="mt-1 w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors"
              />
              <div id="reg-date-hint" className="text-xs text-slate mt-1">
                You can only submit corrections for past dates.
              </div>
              <FieldError id="reg-date-error" message={errors.date?.message} />
            </div>

            {/* BL-010 conflict block */}
            <ConflictErrorBlock error={submitError} />

            {/* Original Record — crimsonbg/border per prototype */}
            {watchedDate && (
              <div className="bg-crimsonbg border border-crimson/20 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">
                  Original Record
                </div>
                {attLoading ? (
                  <Spinner size="sm" aria-label="Loading original record…" />
                ) : originalRecord ? (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate mb-0.5">Date</div>
                      <div className="font-semibold text-charcoal">{originalRecord.date}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate mb-0.5">Status</div>
                      <AttendanceStatusBadge status={originalRecord.status} />
                    </div>
                    <div>
                      <div className="text-xs text-slate mb-0.5">Check-In / Out</div>
                      <div className="text-charcoal text-xs">
                        {formatHHMM(originalRecord.checkInTime)} –{' '}
                        {formatHHMM(originalRecord.checkOutTime)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate italic">No record found for this date.</p>
                )}
              </div>
            )}

            {/* Correction Times */}
            <div>
              <div className="text-sm font-semibold text-charcoal mb-3">Correction Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="check-in-time">
                    Actual Check-In Time
                  </Label>
                  <input
                    id="check-in-time"
                    type="time"
                    aria-describedby={errors.proposedCheckIn ? 'ci-error' : undefined}
                    {...register('proposedCheckIn')}
                    className="mt-1 w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors"
                  />
                  <FieldError id="ci-error" message={errors.proposedCheckIn?.message} />
                </div>
                <div>
                  <Label htmlFor="check-out-time">
                    Actual Check-Out Time
                  </Label>
                  <input
                    id="check-out-time"
                    type="time"
                    aria-describedby={errors.proposedCheckOut ? 'co-error' : undefined}
                    {...register('proposedCheckOut')}
                    className="mt-1 w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors"
                  />
                  <FieldError id="co-error" message={errors.proposedCheckOut?.message} />
                </div>
              </div>
              <p className="text-xs text-slate mt-1">At least one time is required.</p>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reg-reason">
                Reason / Evidence <span className="text-crimson" aria-hidden="true">*</span>
              </Label>
              <textarea
                id="reg-reason"
                rows={4}
                aria-required="true"
                aria-describedby={errors.reason ? 'reason-error' : 'reason-hint'}
                placeholder="E.g., I was working from office but forgot to check in on the app. My manager can confirm."
                {...register('reason')}
                className="mt-1 w-full border border-sage rounded-lg px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors resize-none"
              />
              <div className="flex justify-between mt-0.5">
                <FieldError id="reason-error" message={errors.reason?.message} />
                <span id="reason-hint" className="text-xs text-slate">{reason.length}/1000</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || submitMutation.isPending}
              disabled={isSubmitting || submitMutation.isPending}
            >
              Submit Regularisation Request
            </Button>
          </form>
        </div>
      </div>

      {/* Right: Info (1/3) */}
      <div className="space-y-5">

        {/* Routing rules */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Routing Rules (BL-029)
          </h3>
          <div className="space-y-3">
            <div className="bg-greenbg rounded-lg p-3">
              <div className="text-xs font-bold text-richgreen mb-2">Within 7 days</div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald text-white flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">M</div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">Your Manager</div>
                  <div className="text-xs text-slate">Direct Reporting Manager</div>
                </div>
              </div>
            </div>
            <div className="bg-softmint rounded-lg p-3">
              <div className="text-xs font-bold text-forest mb-2">Older than 7 days</div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-forest text-white flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">A</div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">Admin</div>
                  <div className="text-xs text-slate">Organisation Administrator</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important notes */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-umber" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important
          </h3>
          <ul className="space-y-3 text-xs text-slate">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-crimson mt-1.5 flex-shrink-0" aria-hidden="true" />
              <span>
                You <strong className="text-charcoal">cannot submit</strong> a regularisation for a date that has an
                approved leave — it will be blocked with a conflict error (BL-010).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate mt-1.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Original attendance record is <strong className="text-charcoal">preserved</strong> — corrections
                create a new overlay entry upon approval (BL-007).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-umber mt-1.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Late deduction is <strong className="text-charcoal">recomputed</strong> if the corrected check-in
                time changes your attendance status for that day.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* History table — full width below */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow-sm border border-sage/30">
          <div className="px-6 py-4 border-b border-sage/20">
            <h2 className="font-heading text-base font-semibold text-charcoal">My Regularisation History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-offwhite border-b border-sage/20">
                  <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Submitted</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">For Date</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Days Old</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate uppercase tracking-wide">Actioned By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/20">
                {!historyData?.data?.length ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-slate py-8">
                      No regularisation history.
                    </td>
                  </tr>
                ) : (
                  historyData.data.map((r) => (
                    <tr key={r.id} className="hover:bg-offwhite transition-colors">
                      <td className="px-6 py-4 font-medium text-charcoal">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4 text-slate">{r.date}</td>
                      <td className="px-4 py-4 text-slate">{r.ageDaysAtSubmit} days</td>
                      <td className="px-4 py-4">
                        <RegularisationStatusBadge status={r.status} routedTo={r.routedTo} />
                      </td>
                      <td className="px-4 py-4 text-slate">{r.approverName ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
