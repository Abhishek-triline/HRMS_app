'use client';

/**
 * A-08 — Leave Configuration Settings (Admin).
 * Visual reference: prototype/admin/config.html → Leave Config tab
 *
 * Distinct from /admin/leave-config (per-type quota matrix).
 * This page covers the global leave policy settings:
 *   - carryForwardCaps: per leave type (Annual, Casual configurable; others fixed)
 *   - escalationPeriodDays: 1..30
 *   - maternityDays / paternityDays
 *
 * RHF + zod resolver against LeaveConfigSchema.
 * On success: toast + redirect to /admin/configuration.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { LeaveConfigSchema } from '@nexora/contracts/configuration';
import type { LeaveConfig } from '@nexora/contracts/configuration';
import { useLeaveConfigSettings, useUpdateLeaveConfigSettings } from '@/features/admin/hooks/useLeaveConfigSettings';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

// ── Reusable number input row ─────────────────────────────────────────────────

function ConfigRow({
  label,
  hint,
  unit,
  id,
  min,
  max,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration,
  error,
  locked,
  lockedReason,
}: {
  label: string;
  hint: string;
  unit: string;
  id: string;
  min: number;
  max: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
  error?: string;
  locked?: boolean;
  lockedReason?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-charcoal text-sm">{label}</p>
        <p className="text-xs text-slate mt-0.5">{hint}</p>
        {error && (
          <p role="alert" className="text-xs text-crimson mt-1">{error}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {locked ? (
          <div className="flex items-center gap-2 bg-offwhite border border-sage/30 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm text-slate font-medium">{lockedReason}</span>
          </div>
        ) : (
          <>
            <input
              id={id}
              type="number"
              min={min}
              max={max}
              {...registration}
              aria-label={label}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`w-20 border rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30 ${
                error ? 'border-crimson' : 'border-sage/50'
              }`}
            />
            <span className="text-xs text-slate">{unit}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LeaveConfigSettingsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useLeaveConfigSettings();
  const mutation = useUpdateLeaveConfigSettings();

  const defaultValues: LeaveConfig = {
    carryForwardCaps: {
      Annual: 10,
      Sick: 0,
      Casual: 5,
      Unpaid: 0,
      Maternity: 0,
      Paternity: 0,
    },
    escalationPeriodDays: 5,
    maternityDays: 182,
    paternityDays: 10,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LeaveConfig>({
    resolver: zodResolver(LeaveConfigSchema),
    defaultValues,
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  async function onSubmit(values: LeaveConfig) {
    await mutation.mutateAsync(values);
    router.push('/admin/configuration');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" aria-label="Loading leave config" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson" role="alert">
          Could not load leave configuration. Please refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="text-xs text-slate flex items-center gap-1 mb-1">
          <Link href="/admin/configuration" className="hover:text-forest transition-colors">
            Configuration
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-charcoal font-medium">Leave Config</span>
        </div>
        <h1 className="font-heading text-xl font-bold text-charcoal">Leave Configuration</h1>
        <p className="text-sm text-slate mt-0.5">
          Global leave policy settings. For per-type quotas (annual days by employment type), see{' '}
          <Link href="/admin/leave-config" className="text-forest underline-offset-2 hover:underline">Leave Quotas</Link>.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5 max-w-2xl">

          {/* Carry-forward caps */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
            <h2 className="font-heading text-base font-semibold text-charcoal mb-1">Carry-Forward Caps</h2>
            <p className="text-xs text-slate mb-5">
              Maximum unused leave that rolls into the next year (1 January reset — BL-013).
              Sick, Unpaid, Maternity, and Paternity caps are fixed at zero.
            </p>

            <div className="space-y-0">
              <ConfigRow
                id="cf-annual"
                label="Annual Leave Carry-Forward Cap"
                hint="Max Annual leave that rolls into next year · default 10"
                unit="days"
                min={0}
                max={365}
                registration={register('carryForwardCaps.Annual', { valueAsNumber: true })}
                error={errors.carryForwardCaps?.Annual?.message}
              />
              <ConfigRow
                id="cf-casual"
                label="Casual Leave Carry-Forward Cap"
                hint="Max Casual leave that rolls into next year · default 5"
                unit="days"
                min={0}
                max={365}
                registration={register('carryForwardCaps.Casual', { valueAsNumber: true })}
                error={errors.carryForwardCaps?.Casual?.message}
              />
              <ConfigRow
                id="cf-sick"
                label="Sick Leave"
                hint="Resets to zero on 1 January — fixed rule (BL-012)"
                unit=""
                min={0}
                max={0}
                registration={register('carryForwardCaps.Sick', { valueAsNumber: true })}
                locked
                lockedReason="Resets to zero on January 1 — fixed rule"
              />
              <ConfigRow
                id="cf-unpaid"
                label="Unpaid Leave"
                hint="Always available — no accrual or reset"
                unit=""
                min={0}
                max={0}
                registration={register('carryForwardCaps.Unpaid', { valueAsNumber: true })}
                locked
                lockedReason="No carry-forward (unlimited policy)"
              />
              <ConfigRow
                id="cf-maternity"
                label="Maternity Leave"
                hint="Event-based — not affected by annual reset (BL-014)"
                unit=""
                min={0}
                max={0}
                registration={register('carryForwardCaps.Maternity', { valueAsNumber: true })}
                locked
                lockedReason="Event-based — no carry-forward"
              />
              <ConfigRow
                id="cf-paternity"
                label="Paternity Leave"
                hint="Event-based — not affected by annual reset (BL-014)"
                unit=""
                min={0}
                max={0}
                registration={register('carryForwardCaps.Paternity', { valueAsNumber: true })}
                locked
                lockedReason="Event-based — no carry-forward"
              />
            </div>
          </div>

          {/* Escalation */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
            <h2 className="font-heading text-base font-semibold text-charcoal mb-1">Leave Escalation</h2>
            <p className="text-xs text-slate mb-5">
              If a Manager doesn&apos;t act on a leave request within this period, it auto-escalates to Admin (BL-018).
              The system never auto-approves.
            </p>

            <div className="space-y-0">
              <ConfigRow
                id="escalation-days"
                label="Escalation Period"
                hint="Working days before a pending request escalates to Admin · default 5"
                unit="working days"
                min={1}
                max={30}
                registration={register('escalationPeriodDays', { valueAsNumber: true })}
                error={errors.escalationPeriodDays?.message}
              />
            </div>

            <div className="mt-4 bg-crimsonbg/40 border border-crimson/30 rounded-lg px-4 py-3">
              <div className="text-xs font-semibold text-crimson mb-1">No Auto-Approval</div>
              <p className="text-xs text-charcoal">
                Escalated leaves stay <strong>pending</strong> in the Admin queue.
                The system never auto-approves leave requests.
              </p>
            </div>
          </div>

          {/* Event-based leaves */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
            <h2 className="font-heading text-base font-semibold text-charcoal mb-1">Event-Based Leave Maximums</h2>
            <p className="text-xs text-slate mb-5">
              Maternity and Paternity are event-based (one allocation per life event; no balance tracked).
              Both are Admin-approved (BL-015, BL-016).
            </p>

            <div className="space-y-0">
              <ConfigRow
                id="maternity-days"
                label="Maternity Leave Maximum"
                hint="Calendar days per event · Admin-approved · default 182 (26 weeks)"
                unit="calendar days"
                min={1}
                max={730}
                registration={register('maternityDays', { valueAsNumber: true })}
                error={errors.maternityDays?.message}
              />
              <ConfigRow
                id="paternity-days"
                label="Paternity Leave Maximum"
                hint="Working days per event · single block · within 6 months of birth · Admin-approved · default 10"
                unit="working days"
                min={1}
                max={90}
                registration={register('paternityDays', { valueAsNumber: true })}
                error={errors.paternityDays?.message}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/admin/configuration"
              className="text-sm text-slate hover:text-forest transition-colors underline-offset-2 hover:underline"
            >
              Cancel
            </Link>
            <div className="flex items-center gap-3">
              {!isDirty && data && (
                <span className="text-xs text-slate">No changes</span>
              )}
              <Button
                type="submit"
                variant="primary"
                loading={mutation.isPending}
                disabled={mutation.isPending || !isDirty}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
