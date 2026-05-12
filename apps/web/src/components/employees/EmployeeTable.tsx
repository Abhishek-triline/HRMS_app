'use client';

/**
 * EmployeeTable — generic data table for the directory + team views.
 *
 * Columns: code, name, email, role, status badge, department, manager, joined
 * Click-through opens detail page.
 * Mobile: stacks to card layout (≤768 px).
 * Accessibility: <th scope="col">, keyboard nav on rows.
 *
 * v2: status and employmentTypeId are INT codes.
 */

import Link from 'next/link';
import { clsx } from 'clsx';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { EMPLOYEE_STATUS, EMPLOYMENT_TYPE_MAP } from '@/lib/status/maps';
import type { EmployeeListItem } from '@nexora/contracts/employees';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-forest',
  'bg-emerald',
  'bg-mint',
  'bg-softmint',
  'bg-umberbg',
  'bg-greenbg',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? 'bg-forest';
}

function formatDate(iso: string): string {
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

interface EmployeeTableProps {
  employees: EmployeeListItem[];
  isLoading?: boolean;
  /** Base URL for detail links, e.g. "/admin/employees" */
  detailBase?: string;
  /** Show "View" button (admin) or just click on row */
  showViewButton?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

export function EmployeeTable({
  employees,
  isLoading = false,
  detailBase = '/admin/employees',
  showViewButton = true,
  emptyMessage = 'No employees found.',
}: EmployeeTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 py-16 flex flex-col items-center gap-3">
        <Spinner size="md" />
        <p className="text-sm text-slate">Loading employees…</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 py-16 flex flex-col items-center gap-3">
        <svg className="w-10 h-10 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm text-slate">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full" aria-label="Employee directory">
          <thead>
            <tr className="bg-offwhite border-b border-sage/20">
              <th scope="col" className="text-left text-xs font-semibold text-slate px-5 py-3 uppercase tracking-wide">
                EMP Code
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Name
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Designation
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Department
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Type
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Status
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Reporting To
              </th>
              <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                Joined
              </th>
              {showViewButton && (
                <th scope="col" className="text-left text-xs font-semibold text-slate px-4 py-3 uppercase tracking-wide">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {employees.map((emp) => {
              const empInitials = getInitials(emp.name);
              const color = avatarColor(emp.name);
              const isExited = emp.status === EMPLOYEE_STATUS.Exited;
              const employmentTypeLabel = EMPLOYMENT_TYPE_MAP[emp.employmentTypeId]?.label ?? `Type ${emp.employmentTypeId}`;

              return (
                <tr
                  key={emp.id}
                  className={clsx(
                    'hover:bg-offwhite/50 transition-colors',
                    isExited && 'opacity-75',
                  )}
                >
                  <td className="px-5 py-3.5 text-xs font-mono text-slate">{emp.code}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          isExited
                            ? 'bg-gray-100 text-slate'
                            : `${color} ${color === 'bg-forest' || color === 'bg-emerald' ? 'text-white' : 'text-forest'}`,
                        )}
                        aria-hidden="true"
                      >
                        {empInitials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-charcoal">{emp.name}</div>
                        <div className="text-xs text-slate">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate">{emp.designation ?? '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate">{employmentTypeLabel}</td>
                  <td className="px-4 py-3.5">
                    <EmployeeStatusBadge status={emp.status} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate">
                    {emp.reportingManagerName ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate">{formatDate(emp.joinDate)}</td>
                  {showViewButton && (
                    <td className="px-4 py-3.5">
                      <Link
                        href={`${detailBase}/${emp.id}`}
                        className={clsx(
                          'border px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                          isExited
                            ? 'border-sage text-slate hover:bg-offwhite'
                            : 'border-forest text-forest hover:bg-forest hover:text-white',
                        )}
                      >
                        View
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-sage/10">
        {employees.map((emp) => {
          const empInitials = getInitials(emp.name);
          const color = avatarColor(emp.name);
          const isExited = emp.status === EMPLOYEE_STATUS.Exited;
          const employmentTypeLabel = EMPLOYMENT_TYPE_MAP[emp.employmentTypeId]?.label ?? `Type ${emp.employmentTypeId}`;

          return (
            <div key={emp.id} className={clsx('p-4', isExited && 'opacity-75')}>
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isExited
                      ? 'bg-gray-100 text-slate'
                      : `${color} ${color === 'bg-forest' || color === 'bg-emerald' ? 'text-white' : 'text-forest'}`,
                  )}
                  aria-hidden="true"
                >
                  {empInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-charcoal truncate">{emp.name}</div>
                    <EmployeeStatusBadge status={emp.status} />
                  </div>
                  <div className="text-xs text-slate font-mono mt-0.5">{emp.code}</div>
                  <div className="text-xs text-slate mt-1">{emp.designation ?? emp.email}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate mb-3">
                {emp.department && <span>{emp.department}</span>}
                <span>{employmentTypeLabel}</span>
                {emp.reportingManagerName && <span>Reports to: {emp.reportingManagerName}</span>}
              </div>
              {showViewButton && (
                <Link
                  href={`${detailBase}/${emp.id}`}
                  className="inline-flex border border-forest text-forest hover:bg-forest hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  View Details
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
