'use client';

/**
 * ProfileView — read-only profile display used by SELF / Admin profile pages.
 *
 * "Profile details are read-only. To update, contact your HR Administrator."
 *
 * Calls useProfile(id) and renders a rich profile card matching
 * prototype/admin/profile.html visual language.
 */

import { useProfile } from '@/lib/hooks/useEmployees';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const fmtInr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function formatRupees(paise: number) {
  return `₹${fmtInr.format(Math.floor(paise / 100))}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ProfileViewProps {
  employeeId: string;
  /** Whether to show the salary section (Admin or SELF) */
  showSalary?: boolean;
}

export function ProfileView({ employeeId, showSalary = true }: ProfileViewProps) {
  const { data: profile, isLoading, isError, error } = useProfile(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    const apiErr = error as ApiError | null;
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-8 text-center">
        <p className="text-crimson font-semibold">
          {apiErr?.status === 404
            ? 'Profile not found.'
            : 'Failed to load profile. Please try again later.'}
        </p>
      </div>
    );
  }

  const initials = getInitials(profile.name);
  const salary = profile.salaryStructure;

  return (
    <div className="space-y-5">
      {/* Read-only notice */}
      <div className="bg-softmint border border-mint rounded-xl px-5 py-3 flex items-start gap-3">
        <svg className="w-4 h-4 text-forest mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-forest leading-relaxed">
          Profile details are read-only. To update, contact your HR Administrator.
        </p>
      </div>

      <div className="flex gap-5 items-start">
        {/* LEFT — Profile details */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-forest flex items-center justify-center text-white font-heading text-xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-bold text-charcoal">{profile.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm text-slate">{profile.designation ?? '—'}</span>
                      <span className="text-sage">·</span>
                      <EmployeeStatusBadge status={profile.status} />
                      <span className="bg-softmint text-forest text-xs font-bold px-2 py-0.5 rounded">
                        {profile.role}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs text-slate bg-offwhite px-2.5 py-1.5 rounded-lg">
                      {profile.code}
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-5">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs text-slate">{profile.department ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate">{profile.employmentType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-slate">Joined: {formatDate(profile.joinDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting Manager */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
            <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
              Reporting Manager
            </h3>
            {profile.reportingManagerId ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-forest text-sm font-bold flex-shrink-0">
                  {profile.reportingManagerName ? getInitials(profile.reportingManagerName) : '?'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">
                    {profile.reportingManagerName ?? '—'}
                  </div>
                  <div className="text-xs text-slate font-mono">
                    {profile.reportingManagerCode ?? ''}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate">
                No reporting manager — top of organisation tree.
              </p>
            )}
          </div>

          {/* Salary (if applicable) */}
          {showSalary && salary && (
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
              <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-4">
                Salary Structure
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-offwhite rounded-lg px-3.5 py-3">
                  <div className="text-xs text-slate mb-0.5">Basic Salary</div>
                  <div className="text-sm font-bold text-charcoal">
                    {formatRupees(salary.basic_paise)}
                  </div>
                </div>
                <div className="bg-offwhite rounded-lg px-3.5 py-3">
                  <div className="text-xs text-slate mb-0.5">Allowances</div>
                  <div className="text-sm font-bold text-charcoal">
                    {formatRupees(salary.allowances_paise)}
                  </div>
                </div>
              </div>
              <div className="bg-forest rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-mint/80 text-xs font-medium">Gross Monthly CTC</span>
                <span className="font-heading text-white text-lg font-bold">
                  {formatRupees(salary.basic_paise + salary.allowances_paise)}
                </span>
              </div>
              <p className="text-xs text-slate mt-2">
                Effective from: {formatDate(salary.effectiveFrom)}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — Metadata */}
        <div className="w-60 flex-shrink-0 space-y-4 sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
            <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
              Record Info
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate">EMP Code</span>
                <span className="font-mono font-medium text-charcoal">{profile.code}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate">Role</span>
                <span className="font-medium text-charcoal">{profile.role}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate">Employment</span>
                <span className="font-medium text-charcoal">{profile.employmentType}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate">Status</span>
                <EmployeeStatusBadge status={profile.status} />
              </div>
              <div className="border-t border-sage/20 pt-2 flex justify-between text-xs">
                <span className="text-slate">Last updated</span>
                <span className="text-charcoal">{formatDate(profile.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
