'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { ApiError } from '@/lib/api/client';
import { resetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Nexora logo
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

// Form schema — token is read from URL so not part of the RHF schema
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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      await resetPassword({ token, newPassword: data.newPassword });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'TOKEN_EXPIRED') {
          setServerError('This reset link has expired. Please request a new one.');
        } else if (err.code === 'TOKEN_INVALID') {
          setServerError('This reset link is invalid. Please request a new one.');
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
        className="bg-crimsonbg border border-crimson/20 rounded-lg px-5 py-4 text-sm text-crimson text-center"
      >
        Invalid or missing reset token. Please use the link from your email.
      </div>
    );
  }

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-greenbg border border-richgreen/20 rounded-xl px-6 py-8 text-center"
      >
        <svg
          className="w-10 h-10 text-richgreen mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="font-heading text-xl font-bold text-charcoal mb-2">Password updated</h2>
        <p className="text-sm text-slate mb-5">Your password has been reset successfully.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-forest text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-emerald transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sage/30 w-full max-w-md px-8 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-softmint rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold text-charcoal">Set new password</h1>
          <p className="text-slate text-xs">Choose a strong password for your account</p>
        </div>
      </div>

      {serverError && (
        <div role="alert" className="mb-4 bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 text-sm text-crimson">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          {...register('newPassword')}
          label="New Password"
          type="password"
          id="new-password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          required
          error={errors.newPassword?.message}
        />
        <Input
          {...register('confirmPassword')}
          label="Confirm Password"
          type="password"
          id="confirm-password"
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
          Reset Password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="font-body bg-offwhite min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <NexoraLogo />
      <Suspense fallback={<div className="text-slate text-sm">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-center text-xs text-slate mt-6">
        Remember your password?{' '}
        <Link href="/login" className="text-emerald font-medium hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
