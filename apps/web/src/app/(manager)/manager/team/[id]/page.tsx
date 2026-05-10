'use client';

/**
 * Manager — Team Member Profile (read-only).
 * BL-022a: Manager can view profile of current or past team members.
 * No edit capabilities — admin-only.
 */

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmployee } from '@/lib/hooks/useEmployees';
import { EmployeeStatusBadge } from '@/components/employees/EmployeeStatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return iso ?? '—'; }
}

export default function TeamMemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: employee, isLoading, isError, error } = useEmployee(id ?? '');

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !employee) {
    const apiErr = error as ApiError | null;
    return (
      <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-6 py-8 text-center">
        <p className="text-crimson font-semibold mb-2">
          {apiErr?.status === 404 ? 'Employee not found.' : 'Failed to load profile.'}
        </p>
        <Button variant="secondary" onClick={() => router.push('/manager/team')}>
          Back to My Team
        </Button>
      </div>
    );
  }

  const initials = getInitials(employee.name);

  return (
    <div>
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/manager/team" className="text-slate hover:text-forest transition-colors" aria-label="Back to My Team">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-heading text-base font-bold text-charcoal leading-tight">{employee.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate font-mono">{employee.code}</span>
            <span className="text-sage">·</span>
            <EmployeeStatusBadge status={employee.status} />
          </div>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="bg-softmint border border-mint rounded-xl px-5 py-3 mb-5 flex items-start gap-3">
        <svg className="w-4 h-4 text-forest mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-forest">
          Profile details are read-only. To update, contact your HR Administrator.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-6 py-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-forest flex items-center justify-center text-white font-heading text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-charcoal">{employee.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-slate">{employee.designation ?? '—'}</span>
                  <span className="text-sage">·</span>
                  <EmployeeStatusBadge status={employee.status} />
                </div>
              </div>
              <div className="font-mono text-xs text-slate bg-offwhite px-2.5 py-1.5 rounded-lg">{employee.code}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-5">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate">{employee.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs text-slate">{employee.department ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate">{employee.employmentType}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate">Joined: {formatDate(employee.joinDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reporting Manager */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4">
        <h3 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Reporting Manager</h3>
        {employee.reportingManagerId ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-forest text-sm font-bold flex-shrink-0">
              {employee.reportingManagerName ? getInitials(employee.reportingManagerName) : '?'}
            </div>
            <div>
              <div className="text-sm font-semibold text-charcoal">{employee.reportingManagerName ?? '—'}</div>
              <div className="text-xs text-slate font-mono">{employee.reportingManagerCode ?? ''}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate">No reporting manager — top of organisation tree.</p>
        )}
      </div>
    </div>
  );
}
