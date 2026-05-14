'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { ApiError } from '@/lib/api/client';
import { firstLoginSetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ── Nexora logo ───────────────────────────────────────────────────────────────

function NexoraLogo() {
  return (
    <div className="flex items-center gap-2.5 mb-8">
      <div className="w-9 h-9 bg-forest rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <span className="font-heading text-xl font-bold text-forest">Nexora HRMS</span>
    </div>
  );
}

// ── Password requirements checker ─────────────────────────────────────────────

interface PasswordRequirement {
  label: string;
  met: boolean;
}

function usePasswordRequirements(password: string): PasswordRequirement[] {
  return useMemo(
    () => [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'At least one number', met: /[0-9]/.test(password) },
      { label: 'At least one special character (!@#$%)', met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const reqs = usePasswordRequirements(password);
  const metCount = reqs.filter((r) => r.met).length;

  const strengthLabel = ['', 'Weak', 'Fair', 'Moderate', 'Strong'][metCount] ?? '';
  const strengthColor = ['', 'text-crimson', 'text-umber', 'text-umber', 'text-richgreen'][metCount] ?? '';

  const segmentColors = [
    metCount >= 1 ? (metCount === 1 ? 'bg-crimson' : metCount === 2 ? 'bg-umber' : 'bg-richgreen') : 'bg-sage/30',
    metCount >= 2 ? (metCount === 2 ? 'bg-umber' : 'bg-richgreen') : 'bg-sage/30',
    metCount >= 3 ? 'bg-richgreen' : 'bg-sage/30',
    metCount >= 4 ? 'bg-richgreen' : 'bg-sage/30',
  ];

  return (
    <div aria-live="polite">
      {password && (
        <>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate">Password strength</span>
            <span className={`text-xs font-semibold ${strengthColor}`}>{strengthLabel}</span>
          </div>
          <div className="flex gap-1 mb-4" aria-label={`Password strength: ${strengthLabel}`}>
            {segmentColors.map((color, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${color}`} />
            ))}
          </div>
        </>
      )}

      <div className="bg-offwhite rounded-lg px-4 py-4 space-y-2.5">
        <p className="text-xs font-semibold text-charcoal mb-2">Password requirements</p>
        {reqs.map((req) => (
          <div key={req.label} className="flex items-center gap-2.5">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                req.met ? 'bg-greenbg' : 'bg-sage/30'
              }`}
              aria-hidden="true"
            >
              {req.met ? (
                <svg className="w-2.5 h-2.5 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className={`text-xs ${req.met ? 'text-richgreen font-medium' : 'text-slate'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Form schema ───────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Minimum 8 characters')
      .max(128, 'Maximum 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

import { ROLE_ID } from '@/lib/status/maps';

const ROLE_DASHBOARD: Record<number, string> = {
  [ROLE_ID.Admin]: '/admin/dashboard',
  [ROLE_ID.Manager]: '/manager/dashboard',
  [ROLE_ID.Employee]: '/employee/dashboard',
  [ROLE_ID.PayrollOfficer]: '/payroll/dashboard',
};

// ── Main form (needs searchParams) ───────────────────────────────────────────

function FirstLoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const password = watch('newPassword') ?? '';

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      const result = await firstLoginSetPassword({
        tempCredentialsToken: token,
        newPassword: data.newPassword,
      });
      // Session cookie is now set — redirect to role dashboard
      const destination = ROLE_DASHBOARD[result.data.roleId] ?? '/employee/dashboard';
      router.push(destination);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'TOKEN_EXPIRED') {
          setServerError('This invitation link has expired. Please contact HR for a new link.');
        } else if (err.code === 'TOKEN_INVALID') {
          setServerError('This invitation link is invalid. Please contact HR.');
        } else {
          setServerError('Something went wrong. Please try again.');
        }
      } else {
        setServerError('Unable to connect. Please check your connection.');
      }
    }
  };

  if (!token) {
    return (
      <div
        role="alert"
        className="bg-crimsonbg border border-crimson/20 rounded-lg px-5 py-4 text-sm text-crimson text-center max-w-md w-full"
      >
        Invalid invitation link. Please contact HR for assistance.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sage/30 w-full max-w-md px-8 py-10">
      {/* Welcome badge */}
      <div className="inline-flex items-center gap-2 bg-greenbg text-richgreen text-xs font-bold px-3 py-1 rounded-full mb-5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        First Login
      </div>

      <h1 className="font-heading text-2xl font-bold text-charcoal mb-1">Welcome to Nexora HRMS</h1>
      <p className="text-slate text-sm mb-6 leading-relaxed">
        Your account has been created. Please set your password to get started.
      </p>

      {serverError && (
        <div role="alert" className="mb-5 bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 text-sm text-crimson">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          {...register('newPassword')}
          label="New Password"
          type="password"
          id="fl-new-password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          required
          error={errors.newPassword?.message}
        />

        <PasswordStrengthIndicator password={password} />

        <Input
          {...register('confirmPassword')}
          label="Confirm Password"
          type="password"
          id="fl-confirm-password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          required
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          className="w-full"
        >
          Set Password &amp; Continue
        </Button>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FirstLoginPage() {
  return (
    <div className="font-body bg-offwhite min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <NexoraLogo />
      <Suspense fallback={<div className="text-slate text-sm">Loading…</div>}>
        <FirstLoginForm />
      </Suspense>
      <p className="text-center text-xs text-slate mt-6">
        Already set up?{' '}
        <Link href="/login" className="text-emerald font-medium hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
