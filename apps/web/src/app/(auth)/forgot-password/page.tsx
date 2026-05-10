'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Link from 'next/link';
import { ForgotPasswordRequestSchema } from '@nexora/contracts/auth';
import type { ForgotPasswordRequest } from '@nexora/contracts/auth';
import { forgotPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Nexora logo used in auth pages
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

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
  });

  const onSubmit = async (data: ForgotPasswordRequest) => {
    // ALWAYS succeed on the UI side — never reveal email existence
    await forgotPassword(data).catch(() => {
      // silently swallow — the page always shows "check your email"
    });
    setSubmitted(true);
  };

  return (
    <div className="font-body bg-offwhite min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <NexoraLogo />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8" aria-label="Steps">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
              submitted ? 'bg-greenbg text-richgreen' : 'bg-forest text-white'
            }`}
          >
            {submitted ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              '1'
            )}
          </div>
          <span className={`text-xs font-semibold ${submitted ? 'text-richgreen' : 'text-forest'}`}>
            Request Link
          </span>
        </div>
        <div className="w-8 h-px bg-sage" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
              submitted ? 'bg-forest text-white' : 'bg-sage/40 text-slate'
            }`}
          >
            2
          </div>
          <span className={`text-xs font-medium ${submitted ? 'text-forest' : 'text-slate'}`}>
            Check Email
          </span>
        </div>
      </div>

      {/* Step 1 card */}
      {!submitted && (
        <section
          aria-label="Step 1: Request password reset link"
          className="bg-white rounded-2xl shadow-sm border border-sage/30 w-full max-w-md px-8 py-10 mb-5"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-softmint rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-charcoal">Forgot your password?</h1>
              <p className="text-slate text-xs">Step 1 — Enter your work email</p>
            </div>
          </div>

          <p className="text-sm text-slate mb-6 leading-relaxed">
            Enter the email address associated with your Nexora HRMS account. We'll send you a secure link to reset your password.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <Input
              {...register('email')}
              label="Work Email Address"
              type="email"
              id="fp-email"
              placeholder="you@nexora.in"
              required
              error={errors.email?.message}
              autoComplete="email"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              className="w-full"
            >
              Send Reset Link
            </Button>
          </form>
        </section>
      )}

      {/* Step 2 card — shown after submission */}
      {submitted && (
        <section
          role="status"
          aria-live="polite"
          aria-label="Step 2: Check your email"
          className="bg-white rounded-2xl shadow-sm border border-sage/30 w-full max-w-md px-8 py-10 mb-5"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-greenbg rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-richgreen" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-charcoal">Check your email</h1>
              <p className="text-slate text-xs">Step 2 — Open the reset link we sent</p>
            </div>
          </div>

          <div className="bg-greenbg rounded-lg px-4 py-4 mb-5">
            <p className="text-sm text-richgreen font-medium mb-1">Reset link sent!</p>
            <p className="text-xs text-richgreen/80 leading-relaxed">
              If an account exists for that email address, we've sent a password reset link. Check your inbox and click the link within 30 minutes.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-slate mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-slate">The link expires in 30 minutes. If you don't see the email, check your spam folder.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-slate mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-slate">
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-emerald font-medium hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        </section>
      )}

      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-slate hover:text-forest font-medium mt-2 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Sign In
      </Link>
    </div>
  );
}
