'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { LoginRequest } from '@nexora/contracts/auth';
import { LoginRequestSchema } from '@nexora/contracts/auth';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Icon SVGs
const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

import { ROLE_ID } from '@/lib/status/maps';

// Demo role credentials — development convenience for TC-AUTH-006.
// Pre-fill the form with the selected demo account and submit immediately.
// All four chips work against the seeded accounts after Phase 1.
const DEMO_ROLES = [
  { label: 'Admin',    email: 'admin@triline.co.in',    password: 'admin@123', abbr: 'A', bg: 'bg-forest',  text: 'text-mint' },
  { label: 'Manager',  email: 'manager@triline.co.in',  password: 'admin@123', abbr: 'M', bg: 'bg-emerald', text: 'text-white' },
  { label: 'Employee', email: 'employee@triline.co.in', password: 'admin@123', abbr: 'E', bg: 'bg-mint',    text: 'text-forest' },
  { label: 'Payroll',  email: 'payroll@triline.co.in',  password: 'admin@123', abbr: 'P', bg: 'bg-umber',   text: 'text-white' },
] as const;

const ROLE_DASHBOARD: Record<number, string> = {
  [ROLE_ID.Admin]: '/admin/dashboard',
  [ROLE_ID.Manager]: '/manager/dashboard',
  [ROLE_ID.Employee]: '/employee/dashboard',
  [ROLE_ID.PayrollOfficer]: '/payroll/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { rememberMe: false },
  });

  /**
   * Demo shortcut — pre-fills the form with a seeded credential and
   * programmatically submits. TC-AUTH-006: demo chips must be present.
   * RHF needs a tick to flush setValue updates before submit() reads them.
   */
  const handleDemoLogin = useCallback(
    (email: string, password: string) => {
      setValue('email', email);
      setValue('password', password);
      setTimeout(() => {
        document.getElementById('nx-login-submit')?.click();
      }, 0);
    },
    [setValue],
  );

  const onSubmit = async (data: LoginRequest) => {
    setServerError(null);
    try {
      const response = await login(data);
      // Login response includes the role — use it directly, no extra /auth/me call needed
      const destination = ROLE_DASHBOARD[response.data.roleId] ?? '/employee/dashboard';
      router.push(destination);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setServerError('Email or password is incorrect.');
        } else if (err.code === 'LOCKED') {
          // BUG-AUTH-002: API sends retryAfterSeconds, not minutes.
          const seconds =
            typeof err.details?.retryAfterSeconds === 'number'
              ? err.details.retryAfterSeconds
              : 900;
          const retryMinutes = Math.max(1, Math.ceil(seconds / 60));
          setServerError(
            `Account temporarily locked. Try again in ${retryMinutes} min.`,
          );
        } else {
          setServerError('Something went wrong. Please try again.');
        }
      } else {
        setServerError('Unable to connect. Please check your connection.');
      }
    }
  };


  return (
    <div className="font-body bg-forest text-white min-h-screen flex flex-col relative overflow-hidden">

      {/* ===== Decorative background ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="#FFFFFF" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Drifting blobs */}
        <div className="animate-drift1 absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-emerald/40 blur-3xl" />
        <div className="animate-drift2 absolute -bottom-48 -right-40 w-[40rem] h-[40rem] rounded-full bg-mint/15 blur-3xl" />
        <div className="animate-drift3 absolute top-1/2 left-1/2 w-[28rem] h-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/25 blur-3xl" />

        {/* Org-tree illustration */}
        <svg className="absolute top-12 right-12 w-56 h-56 text-mint/15 hidden md:block" fill="none" stroke="currentColor" strokeWidth="1.4" viewBox="0 0 200 200">
          <circle cx="100" cy="40" r="14" />
          <circle cx="50" cy="120" r="12" />
          <circle cx="100" cy="120" r="12" />
          <circle cx="150" cy="120" r="12" />
          <circle cx="50" cy="170" r="10" />
          <circle cx="100" cy="170" r="10" />
          <circle cx="150" cy="170" r="10" />
          <line x1="100" y1="54" x2="50" y2="108" />
          <line x1="100" y1="54" x2="100" y2="108" />
          <line x1="100" y1="54" x2="150" y2="108" />
          <line x1="50" y1="132" x2="50" y2="160" />
          <line x1="100" y1="132" x2="100" y2="160" />
          <line x1="150" y1="132" x2="150" y2="160" />
        </svg>

        {/* Leaf motif */}
        <svg className="absolute bottom-16 left-16 w-40 h-40 text-mint/15 hidden md:block" fill="none" stroke="currentColor" strokeWidth="1.4" viewBox="0 0 100 100">
          <path d="M50 90 C 50 60, 30 40, 15 25 C 35 30, 55 45, 60 75" />
          <path d="M50 90 C 50 55, 70 35, 85 20 C 70 35, 60 60, 55 80" />
          <line x1="50" y1="90" x2="50" y2="50" />
        </svg>
      </div>

      {/* ===== Top brand bar ===== */}
      <header className="relative z-10 flex items-center justify-between px-8 lg:px-14 py-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-mint rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-richgreen rounded-full ring-2 ring-forest" aria-hidden="true" />
          </div>
          <span className="font-heading text-base font-bold tracking-wide">Nexora HRMS</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-mint/70 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M12 12h.01" />
          </svg>
          Need an account?{' '}
          <span className="text-white font-medium">Contact HR</span>
        </div>
      </header>

      {/* ===== Main grid ===== */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-8 lg:px-14 py-8 max-w-7xl w-full mx-auto">

        {/* Left: brand hero */}
        <div className="hidden lg:block lg:flex-1 lg:max-w-xl" aria-hidden="true">
          <div className="accent-bar mb-6" />
          <h1 className="font-heading text-5xl xl:text-6xl font-bold leading-[1.05] mb-8">
            Your complete<br />
            <span className="animate-shine">HR platform.</span>
          </h1>

          {/* Modules grid */}
          <div className="grid grid-cols-2 gap-2.5 max-w-md">
            {[
              {
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
                label: 'Employees',
              },
              {
                icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                label: 'Leave',
              },
              {
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                label: 'Attendance',
              },
              {
                icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
                label: 'Payroll',
              },
            ].map((mod) => (
              <div
                key={mod.label}
                className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              >
                <div className="w-7 h-7 rounded-md bg-mint/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-mint" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                  </svg>
                </div>
                <span className="text-mint text-sm font-medium">{mod.label}</span>
              </div>
            ))}
            {/* Performance — full width */}
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2 col-span-2">
              <div className="w-7 h-7 rounded-md bg-mint/20 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-mint" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <span className="text-mint text-sm font-medium">Performance Reviews</span>
            </div>
          </div>

        </div>

        {/* Right: floating glass sign-in card */}
        <div className="animate-float w-full max-w-md mx-auto lg:ml-auto">
          {/* Mobile headline */}
          <div className="lg:hidden text-center mb-6">
            <h1 className="font-heading text-3xl font-bold mb-1">
              <span className="animate-shine">HR platform.</span>
            </h1>
            <p className="text-mint/70 text-sm">Sign in to continue.</p>
          </div>

          <div className="card-glow relative bg-white/95 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl shadow-black/30 p-8">
            <h2 className="font-heading text-2xl font-bold text-charcoal mb-1">Welcome back</h2>
            <p className="text-sm text-slate mb-6">Sign in to your workspace.</p>

            {/* Server error */}
            {serverError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 bg-crimsonbg border border-crimson/20 rounded-lg px-4 py-3 text-sm text-crimson"
              >
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Email */}
              <Input
                {...register('email')}
                label="Work email"
                type="email"
                id="email"
                autoComplete="email"
                placeholder="you@nexora.in"
                leftIcon={<MailIcon />}
                error={errors.email?.message}
              />

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-slate">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-emerald hover:underline font-medium"
                  >
                    Forgot?
                  </a>
                </div>
                <Input
                  {...register('password')}
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leftIcon={<LockIcon />}
                  error={errors.password?.message}
                  srOnlyLabel
                  label="Password"
                />
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 text-xs text-slate cursor-pointer select-none">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="rounded border-sage accent-forest w-3.5 h-3.5"
                />
                Keep me signed in for 30 days
              </label>

              {/* Submit */}
              <Button
                id="nx-login-submit"
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                trailingIcon={<ArrowRightIcon />}
                className="group w-full"
              >
                Sign in
              </Button>
            </form>

            {/* "Demo as" divider */}
            <div className="flex items-center gap-3 my-6" aria-hidden="true">
              <div className="flex-1 h-px bg-sage/40" />
              <span className="text-[10px] text-slate uppercase tracking-[0.15em] font-semibold">Demo as</span>
              <div className="flex-1 h-px bg-sage/40" />
            </div>

            {/* Demo role shortcuts — TC-AUTH-006 */}
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Demo login shortcuts">
              {DEMO_ROLES.map((role) => (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => handleDemoLogin(role.email, role.password)}
                  className="group flex items-center gap-2 bg-softmint border border-mint hover:border-forest hover:bg-mint rounded-lg px-3 py-2 transition-colors"
                  aria-label={`Sign in as demo ${role.label}`}
                >
                  <div
                    className={`w-6 h-6 rounded-md ${role.bg} ${role.text} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}
                    aria-hidden="true"
                  >
                    {role.abbr}
                  </div>
                  <span className="text-xs font-semibold text-forest flex-1 text-left">{role.label}</span>
                  <svg
                    className="w-3 h-3 text-emerald group-hover:translate-x-0.5 transition-transform flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

          </div>

          {/* Trust micro-line */}
          <div className="flex items-center justify-center gap-2 text-mint/60 text-[11px] mt-5">
            <ShieldIcon />
            <span>Encrypted · Role-based access · Audit logged</span>
          </div>
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 px-8 lg:px-14 py-5 flex items-center justify-between text-mint/50 text-xs">
        <span>&copy; 2026 Nexora Technologies Pvt. Ltd.</span>
        <span className="hidden sm:inline">All rights reserved.</span>
      </footer>
    </div>
  );
}
