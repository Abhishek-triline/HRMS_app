'use client';

/**
 * ProfileView — read-only profile display used by SELF / non-Admin role profile pages.
 *
 * "Profile details are read-only. To update, contact your HR Administrator."
 *
 * Calls useProfile(id) and renders a rich profile card matching
 * prototype/manager/profile.html and prototype/employee/profile.html visual language.
 * The top card now uses <ProfileHero> matching the forest-gradient design exactly.
 */

import { useProfile } from '@/lib/hooks/useEmployees';
import { ProfileHero } from './ProfileHero';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';

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

  const salary = profile.salaryStructure;

  return (
    <div className="space-y-5">
      {/* Forest-gradient hero card — matches prototype/manager/profile.html */}
      <ProfileHero
        name={profile.name}
        empCode={profile.code}
        designation={profile.designation}
        department={profile.department}
        status={profile.status}
        role={profile.role}
        joinDate={profile.joinDate}
      />

      {/* Read-only notice — small inline help line under the hero per spec */}
      <p className="text-xs text-slate flex items-start gap-2">
        <svg
          className="w-3.5 h-3.5 text-umber mt-0.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Profile details are read-only. To update, contact your HR Administrator.
      </p>

      <div className="space-y-5">

          {/* Personal + Employment detail cards (dl blocks) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Personal card */}
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-forest"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Personal
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Full name</dt>
                  <dd className="text-charcoal font-medium text-right">{profile.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Email</dt>
                  <dd className="text-charcoal font-medium text-right break-all">{profile.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Designation</dt>
                  <dd className="text-charcoal font-medium text-right">{profile.designation ?? '—'}</dd>
                </div>
              </dl>
            </div>

            {/* Employment card */}
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-forest"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Employment
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Employee code</dt>
                  <dd className="text-forest font-mono font-semibold">{profile.code}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Role</dt>
                  <dd className="text-charcoal font-medium">{profile.role}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Department</dt>
                  <dd className="text-charcoal font-medium">{profile.department ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Employment type</dt>
                  <dd className="text-charcoal font-medium">{profile.employmentType}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Reporting manager</dt>
                  <dd className="text-charcoal font-medium">{profile.reportingManagerName ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate">Date joined</dt>
                  <dd className="text-charcoal font-medium">{formatDate(profile.joinDate)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Salary (if applicable) */}
          {showSalary && salary && (
            <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
              <h3 className="font-heading text-sm font-bold text-charcoal mb-4">
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

          {/* Record metadata */}
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-4 py-4">
            <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">
              Record Info
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate">Status</span>
                <EmployeeStatusBadge status={profile.status} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate">Employment</span>
                <span className="font-medium text-charcoal">{profile.employmentType}</span>
              </div>
              <div className="border-t border-sage/20 pt-2 flex justify-between text-xs">
                <span className="text-slate">Last updated</span>
                <span className="text-charcoal">{formatDate(profile.updatedAt)}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
