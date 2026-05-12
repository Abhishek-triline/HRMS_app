'use client';

/**
 * LeaveRequestForm — RHF form for the Apply Leave flow.
 *
 * - Selects leave type, date range, reason.
 * - Computes calendar-day count live.
 * - Shows balance preview after request via BalanceImpactPreview.
 * - Surfaces 409 LEAVE_OVERLAP / LEAVE_REG_CONFLICT / INSUFFICIENT_BALANCE
 *   via ConflictErrorBlock (DN-19 — never a generic error).
 */

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FieldError } from '@/components/ui/FieldError';
import { ConflictErrorBlock } from './ConflictErrorBlock';
import { BalanceImpactPreview } from './BalanceImpactPreview';
import { ApiError } from '@/lib/api/client';
import { ErrorCode } from '@nexora/contracts/errors';
import { CreateLeaveRequestSchema } from '@nexora/contracts/leave';
import { LEAVE_TYPE_ID } from '@/lib/status/maps';
import type { LeaveBalance, LeaveBalancesResponse, LeaveTypeCatalogItem } from '@nexora/contracts/leave';
import { useToast } from '@/lib/hooks/useToast';
import { useCreateLeave } from '@/lib/hooks/useLeave';

// ── Validation (derived from contract schema) ─────────────────────────────────

const FormSchema = CreateLeaveRequestSchema;
type FormValues = z.infer<typeof FormSchema>;

// ── Calendar day count helper ─────────────────────────────────────────────────

function calendarDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return diff > 0 ? diff : 0;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LeaveRequestFormProps {
  /** Available leave types from the catalogue */
  leaveTypes: LeaveTypeCatalogItem[];
  /** Current employee's balances */
  balancesData: LeaveBalancesResponse['data'] | null;
  /** Back-link path (role-specific) */
  backPath: string;
  /** Redirect path after successful submission */
  successPath: string;
}

export function LeaveRequestForm({
  leaveTypes,
  balancesData,
  backPath,
  successPath,
}: LeaveRequestFormProps) {
  const router = useRouter();
  const toast = useToast();
  const createLeave = useCreateLeave();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const selectedTypeId = watch('leaveTypeId') as number | undefined;
  const fromDate = watch('fromDate');
  const toDate = watch('toDate');
  const dayCount = calendarDays(fromDate ?? '', toDate ?? '');

  // Resolve selected type name for display
  const selectedTypeName = leaveTypes.find((lt) => lt.id === selectedTypeId)?.name ?? null;

  const conflictError =
    createLeave.error instanceof ApiError &&
    (createLeave.error.code === ErrorCode.LEAVE_OVERLAP ||
      createLeave.error.code === ErrorCode.LEAVE_REG_CONFLICT ||
      createLeave.error.code === ErrorCode.INSUFFICIENT_BALANCE)
      ? createLeave.error
      : null;

  // Event-based leave routes directly to Admin (Maternity=5, Paternity=6)
  const isAdminRoute =
    selectedTypeId === LEAVE_TYPE_ID.Maternity || selectedTypeId === LEAVE_TYPE_ID.Paternity;

  async function onSubmit(values: FormValues) {
    try {
      const result = await createLeave.mutateAsync(values);
      toast.success(
        'Leave request submitted',
        `Request ${result.leaveRequest.code} submitted successfully.`,
      );
      router.push(successPath);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === ErrorCode.LEAVE_OVERLAP ||
          err.code === ErrorCode.LEAVE_REG_CONFLICT ||
          err.code === ErrorCode.INSUFFICIENT_BALANCE)
      ) {
        // ConflictErrorBlock handles display — no generic toast
        return;
      }
      toast.error('Submission failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  const balances: LeaveBalance[] = balancesData?.balances ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: form (2/3) */}
      <div className="lg:col-span-2 space-y-5">
        {/* Application form card */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h2 className="font-heading text-base font-semibold text-charcoal mb-5">
            Leave Application
          </h2>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
            aria-label="Leave application form"
          >
            {/* Leave type */}
            <div>
              <Label htmlFor="leaveTypeId" required>
                Leave Type
              </Label>
              <Controller
                name="leaveTypeId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    id="leaveTypeId"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    aria-describedby={errors.leaveTypeId ? 'leaveTypeId-error' : undefined}
                    aria-required="true"
                    className={clsx(
                      'w-full border rounded-lg px-3 py-2.5 text-sm text-charcoal bg-white',
                      'focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest transition-colors',
                      errors.leaveTypeId ? 'border-crimson' : 'border-sage',
                    )}
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} Leave
                        {lt.isEventBased ? ' (event-based)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.leaveTypeId && (
                <FieldError id="leaveTypeId-error" message={errors.leaveTypeId.message ?? 'Required'} />
              )}
            </div>

            {/* Admin-route hint */}
            {isAdminRoute && (
              <div className="flex items-start gap-2.5 bg-softmint border border-mint/40 rounded-lg px-4 py-3">
                <svg
                  className="w-4 h-4 text-forest shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-forest">
                  <span className="font-semibold">{selectedTypeName} leave</span> is event-based and
                  goes directly to Admin for approval — your manager is bypassed (BL-015/016).
                </p>
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromDate" required>
                  Start Date
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  aria-required="true"
                  aria-describedby={errors.fromDate ? 'fromDate-error' : undefined}
                  error={errors.fromDate?.message}
                  {...register('fromDate')}
                />
                {errors.fromDate && (
                  <FieldError id="fromDate-error" message={errors.fromDate.message ?? 'Required'} />
                )}
              </div>
              <div>
                <Label htmlFor="toDate" required>
                  End Date
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  aria-required="true"
                  aria-describedby={errors.toDate ? 'toDate-error' : undefined}
                  error={errors.toDate?.message}
                  {...register('toDate')}
                />
                {errors.toDate && (
                  <FieldError id="toDate-error" message={errors.toDate.message ?? 'Required'} />
                )}
              </div>
            </div>

            {/* Day count preview */}
            <div className="flex items-center gap-3 bg-softmint rounded-lg px-4 py-3">
              <svg
                className="w-4 h-4 text-forest"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-slate">Total working days:</span>
              <span className="text-sm font-bold text-charcoal">
                {dayCount > 0 ? `${dayCount} day${dayCount !== 1 ? 's' : ''}` : '0 days'}
              </span>
              {dayCount === 0 && (
                <span className="text-xs text-slate">(select dates to calculate)</span>
              )}
            </div>

            {/* Conflict error block (BL-010 / DN-19) */}
            {conflictError && (
              <ConflictErrorBlock error={conflictError} />
            )}

            {/* Generic non-conflict submission error */}
            {createLeave.error &&
              !conflictError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 text-sm text-crimson"
                >
                  {createLeave.error instanceof Error
                    ? createLeave.error.message
                    : 'Submission failed. Please try again.'}
                </div>
              )}

            {/* Reason */}
            <div>
              <Label htmlFor="reason" required>
                Reason
              </Label>
              <textarea
                id="reason"
                rows={4}
                placeholder="Briefly describe the reason for your leave request..."
                aria-required="true"
                aria-describedby={errors.reason ? 'reason-error' : 'reason-hint'}
                className={clsx(
                  'w-full border rounded-lg px-3 py-2.5 text-sm text-charcoal',
                  'focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest',
                  'transition-colors resize-none',
                  errors.reason ? 'border-crimson' : 'border-sage',
                )}
                {...register('reason')}
              />
              <div id="reason-hint" className="text-xs text-slate mt-1">
                This will be visible to your reporting manager.
              </div>
              {errors.reason && (
                <FieldError id="reason-error" message={errors.reason.message ?? 'Required'} />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting || createLeave.isPending}
                disabled={isSubmitting || createLeave.isPending}
              >
                Submit Request
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(backPath)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Important notes card */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-umber"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Important Notes
          </h3>
          <ul className="space-y-3" role="list">
            {[
              {
                label: 'No half-day leave',
                text: '— leave is taken in full-day units only (BL-011).',
              },
              {
                label: 'No date overlap',
                text: '— two leave requests cannot overlap in dates (BL-009).',
              },
              {
                label: 'Maternity & Paternity leave',
                text: 'are event-based and approved by Admin only. Annual, Sick, Casual, and Unpaid go to your reporting manager.',
              },
              {
                label: 'Cancellation:',
                text: 'before start date = full balance restored; after start = only remaining days restored (BL-019/020).',
              },
            ].map(({ label, text }) => (
              <li key={label} className="flex items-start gap-3 text-sm text-slate">
                <div className="w-1.5 h-1.5 rounded-full bg-umber mt-2 flex-shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-charcoal">{label}</span> {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: sidebar (1/3) */}
      <div className="space-y-5">
        <BalanceImpactPreview
          balances={balances}
          selectedTypeId={selectedTypeId ?? null}
          selectedTypeName={selectedTypeName}
          requestedDays={dayCount}
        />

        {/* Approval route card */}
        <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-5">
          <h3 className="font-heading text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-forest"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Approval Route
          </h3>
          <div className="space-y-3">
            <div className="bg-softmint rounded-lg p-3">
              <div className="text-xs font-semibold text-forest mb-1">
                Annual / Sick / Casual / Unpaid
              </div>
              <div className="text-xs text-slate">Goes to your reporting manager for approval.</div>
            </div>
            <div className="bg-softmint rounded-lg p-3">
              <div className="text-xs font-semibold text-forest mb-1">
                Maternity / Paternity (event-based)
              </div>
              <div className="text-xs text-slate">
                Admin only — both bypass the manager (BL-015/016).
              </div>
            </div>
          </div>
          <div className="mt-3 bg-umberbg rounded-lg p-3">
            <div className="text-xs text-umber">
              <span className="font-semibold">Escalation:</span> If your manager does not act
              within 5 working days, the request is automatically escalated to Admin (BL-018).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
