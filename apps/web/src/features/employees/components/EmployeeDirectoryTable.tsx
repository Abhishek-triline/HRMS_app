'use client';

/**
 * EmployeeDirectoryTable — pixel-faithful replica of prototype/admin/employees.html table.
 *
 * Matches the prototype exactly:
 * - 8 columns: EMP Code, Name (avatar + email), Designation, Department, Type, Status,
 *   Reporting To, Actions
 * - Avatar background varies by status:
 *     Active / default  → bg-mint text-forest
 *     On Notice         → bg-umberbg text-umber
 *     Exited            → bg-gray-100 text-slate
 *     On Leave          → bg-softmint text-forest
 * - Status pills: Active → bg-mint text-forest; On Notice → bg-umberbg text-umber;
 *                 Exited → bg-gray-100 text-slate; On Leave → bg-softmint text-forest
 * - View button: outlined-forest for non-Exited; outlined-sage for Exited
 * - Paginator: numbered strip with ellipsis; active page bg-forest text-white
 * - Mobile card layout below md breakpoint
 */

import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { EMPLOYEE_STATUS, EMPLOYEE_STATUS_MAP, EMPLOYMENT_TYPE_MAP } from '@/lib/status/maps';
import type { EmployeeListItem } from '@nexora/contracts/employees';

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

type AvatarStyle = { bg: string; text: string };

function avatarStyleForStatus(status: number): AvatarStyle {
  switch (status) {
    case EMPLOYEE_STATUS.OnNotice:
      return { bg: 'bg-umberbg', text: 'text-umber' };
    case EMPLOYEE_STATUS.Exited:
      return { bg: 'bg-gray-100', text: 'text-slate' };
    case EMPLOYEE_STATUS.OnLeave:
      return { bg: 'bg-softmint', text: 'text-forest' };
    default: // Active, Inactive
      return { bg: 'bg-mint', text: 'text-forest' };
  }
}

type StatusPillStyle = { bg: string; text: string; label: string };

function statusPillStyle(status: number): StatusPillStyle {
  const label = EMPLOYEE_STATUS_MAP[status]?.label ?? String(status);
  switch (status) {
    case EMPLOYEE_STATUS.Active:
      return { bg: 'bg-mint', text: 'text-forest', label };
    case EMPLOYEE_STATUS.OnNotice:
      return { bg: 'bg-umberbg', text: 'text-umber', label };
    case EMPLOYEE_STATUS.Exited:
      return { bg: 'bg-gray-100', text: 'text-slate', label };
    case EMPLOYEE_STATUS.OnLeave:
      return { bg: 'bg-softmint', text: 'text-forest', label };
    default:
      return { bg: 'bg-gray-100', text: 'text-slate', label };
  }
}

// ── paginator ─────────────────────────────────────────────────────────────────

/**
 * Build the page number array to display, with ellipsis markers.
 * Returns an array of (number | 'ellipsis'). Always shows first + last + up to
 * 3 pages around currentPage.
 */
function buildPageNumbers(totalPages: number, currentPage: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const delta = 1; // pages on each side of current

  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);
  if (rangeStart > 2) pages.push('ellipsis');
  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
  if (rangeEnd < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface PaginatorState {
  currentPage: number;
  pageSize: number;
  /** Known total (may be approximate — shown as "N+" when isApproximate=true) */
  total: number;
  isApproximate: boolean;
  onPageChange: (page: number) => void;
}

export interface EmployeeDirectoryTableProps {
  employees: EmployeeListItem[];
  isLoading?: boolean;
  detailBase?: string;
  emptyMessage?: string;
  paginator: PaginatorState;
}

// ── component ─────────────────────────────────────────────────────────────────

export function EmployeeDirectoryTable({
  employees,
  isLoading = false,
  detailBase = '/admin/employees',
  emptyMessage = 'No employees found.',
  paginator,
}: EmployeeDirectoryTableProps) {
  const { currentPage, pageSize, total, isApproximate, onPageChange } = paginator;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  const pageNumbers = buildPageNumbers(totalPages, currentPage);

  // ── loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="py-16 flex flex-col items-center gap-3">
          <Spinner size="md" />
          <p className="text-sm text-slate">Loading employees…</p>
        </div>
      </div>
    );
  }

  // ── empty state ────────────────────────────────────────────────────────────
  if (employees.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="py-16 flex flex-col items-center gap-3">
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
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">

      {/* ── Desktop table ─────────────────────────────────────────────────── */}
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {employees.map((emp) => {
              const initials = getInitials(emp.name);
              const avatar = avatarStyleForStatus(emp.status);
              const pill = statusPillStyle(emp.status);
              const isExited = emp.status === EMPLOYEE_STATUS.Exited;

              return (
                <tr key={emp.id} className="hover:bg-offwhite/50 transition-colors">
                  {/* EMP Code */}
                  <td className="px-5 py-3.5 text-xs font-mono text-slate">{emp.code}</td>

                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full ${avatar.bg} flex items-center justify-center ${avatar.text} text-xs font-bold flex-shrink-0`}
                        aria-hidden="true"
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-charcoal">{emp.name}</div>
                        <div className="text-xs text-slate">{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Designation */}
                  <td className="px-4 py-3.5 text-sm text-slate">{emp.designation ?? '—'}</td>

                  {/* Department */}
                  <td className="px-4 py-3.5 text-sm text-slate">{emp.department ?? '—'}</td>

                  {/* Type */}
                  <td className="px-4 py-3.5 text-xs text-slate">{EMPLOYMENT_TYPE_MAP[emp.employmentTypeId]?.label ?? emp.employmentTypeId}</td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={`${pill.bg} ${pill.text} text-xs font-bold px-2 py-1 rounded`}>
                      {pill.label}
                    </span>
                  </td>

                  {/* Reporting To */}
                  <td className="px-4 py-3.5 text-sm text-slate">
                    {emp.reportingManagerName ?? '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <Link
                      href={`${detailBase}/${emp.id}`}
                      className={
                        isExited
                          ? 'border border-sage text-slate hover:bg-offwhite px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition-colors'
                          : 'border border-forest text-forest hover:bg-forest hover:text-white px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition-colors'
                      }
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card layout ─────────────────────────────────────────────── */}
      <div className="md:hidden divide-y divide-sage/10">
        {employees.map((emp) => {
          const initials = getInitials(emp.name);
          const avatar = avatarStyleForStatus(emp.status);
          const pill = statusPillStyle(emp.status);
          const isExited = emp.status === EMPLOYEE_STATUS.Exited;

          return (
            <div key={emp.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full ${avatar.bg} flex items-center justify-center ${avatar.text} text-sm font-bold flex-shrink-0`}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-charcoal truncate">{emp.name}</div>
                    <span className={`${pill.bg} ${pill.text} text-xs font-bold px-2 py-1 rounded flex-shrink-0`}>
                      {pill.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate font-mono mt-0.5">{emp.code}</div>
                  <div className="text-xs text-slate mt-1">{emp.designation ?? emp.email}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate mb-3">
                {emp.department && <span>{emp.department}</span>}
                <span>{EMPLOYMENT_TYPE_MAP[emp.employmentTypeId]?.label ?? emp.employmentTypeId}</span>
                {emp.reportingManagerName && (
                  <span>Reports to: {emp.reportingManagerName}</span>
                )}
              </div>
              <Link
                href={`${detailBase}/${emp.id}`}
                className={
                  isExited
                    ? 'inline-flex border border-sage text-slate hover:bg-offwhite px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'
                    : 'inline-flex border border-forest text-forest hover:bg-forest hover:text-white px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition-colors'
                }
              >
                View
              </Link>
            </div>
          );
        })}
      </div>

      {/* ── Paginator ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-sage/20 bg-offwhite/40">
        <p className="text-xs text-slate">
          Showing{' '}
          <span className="font-semibold text-charcoal">{from === 0 ? 0 : `${from}–${to}`}</span>{' '}
          of{' '}
          <span className="font-semibold text-charcoal">
            {total}
            {isApproximate ? '+' : ''}
          </span>{' '}
          employees
        </p>

        <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
          {/* Prev */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="w-8 h-8 rounded-lg border border-sage/40 flex items-center justify-center text-slate text-sm hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page numbers */}
          {pageNumbers.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="text-slate text-xs px-1">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
                className={
                  p === currentPage
                    ? 'w-8 h-8 rounded-lg bg-forest text-white text-xs font-semibold'
                    : 'w-8 h-8 rounded-lg border border-sage/40 text-slate text-xs hover:bg-white transition-colors'
                }
              >
                {p}
              </button>
            ),
          )}

          {/* Next */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="w-8 h-8 rounded-lg border border-sage/40 flex items-center justify-center text-slate text-sm hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
