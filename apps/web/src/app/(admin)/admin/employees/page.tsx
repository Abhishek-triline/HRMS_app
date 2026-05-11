'use client';

/**
 * A-02 — Employee Directory (Admin).
 * Visual reference: prototype/admin/employees.html
 *
 * Pixel-faithful reproduction of the prototype. Key implementation notes:
 *
 * PAGINATION SHAPE
 *   The EmployeeListResponse contract carries only `nextCursor` (cursor-based).
 *   There is no `total` field. To drive a numbered paginator we maintain a client-side
 *   cursor map: cursorMap[page] = cursor. We use limit=20 per page.
 *   The total shown in the header / paginator footer is computed as:
 *     knownTotal = (currentPage - 1) * PAGE_SIZE + currentPageData.length
 *     isApproximate = nextCursor !== null  (there are more pages)
 *   Status sub-counts use three parallel queries (status=Active/On-Notice/Exited, limit=1)
 *   and read nextCursor: if not null, show "1+"; if null, data.length is the true count.
 *   Contract gap flagged: backend should return `pagination.total` in EmployeeListResponse.
 *
 * FILTER "FILTERS" BUTTON
 *   Always visible in the filter card (prototype line 151), not mobile-only.
 *   Clicking it resets all filters (matches prototype's wired filter behaviour).
 */

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useEmployeesCount, useEmployeesList } from '@/lib/hooks/useEmployees';
import { EmployeeDirectoryTable } from '@/features/employees/components/EmployeeDirectoryTable';
import { Button } from '@/components/ui/Button';
import type { EmployeeStatus, Role, EmploymentType } from '@nexora/contracts/common';

// ── constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const DEPARTMENTS = ['Engineering', 'Design', 'HR', 'Finance', 'Operations'];

// ── types ─────────────────────────────────────────────────────────────────────

type FilterStatus = EmployeeStatus | '';
type FilterRole = Role | '';
type FilterEmpType = EmploymentType | '';

/** Maps page number (1-based) → cursor string (or undefined for page 1). */
type CursorMap = Record<number, string | undefined>;

// ── page ──────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  // ── filter state ────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterStatus>('');
  const [role, setRole] = useState<FilterRole>('');
  const [empType, setEmpType] = useState<FilterEmpType>('');
  const [department, setDepartment] = useState('');

  // ── pagination state ─────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  // cursorMap[page] = cursor needed to fetch that page
  const [cursorMap, setCursorMap] = useState<CursorMap>({ 1: undefined });

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── search debounce ──────────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setSearchRaw(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      // Reset to page 1 on search change
      setCurrentPage(1);
      setCursorMap({ 1: undefined });
    }, 300);
  }

  // ── reset filters ────────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setSearchRaw('');
    setSearch('');
    setStatus('');
    setRole('');
    setEmpType('');
    setDepartment('');
    setCurrentPage(1);
    setCursorMap({ 1: undefined });
  }, []);

  // ── filter change handlers (reset page) ──────────────────────────────────────
  function handleStatusChange(v: string) {
    setStatus(v as FilterStatus);
    setCurrentPage(1);
    setCursorMap({ 1: undefined });
  }
  function handleRoleChange(v: string) {
    setRole(v as FilterRole);
    setCurrentPage(1);
    setCursorMap({ 1: undefined });
  }
  function handleEmpTypeChange(v: string) {
    setEmpType(v as FilterEmpType);
    setCurrentPage(1);
    setCursorMap({ 1: undefined });
  }
  function handleDepartmentChange(v: string) {
    setDepartment(v);
    setCurrentPage(1);
    setCursorMap({ 1: undefined });
  }

  // ── main query ───────────────────────────────────────────────────────────────
  const mainQuery = useEmployeesList({
    q: search || undefined,
    status: (status || undefined) as EmployeeStatus | undefined,
    role: (role || undefined) as Role | undefined,
    employmentType: (empType || undefined) as EmploymentType | undefined,
    department: department || undefined,
    limit: PAGE_SIZE,
    cursor: cursorMap[currentPage],
  });

  const employees = mainQuery.data?.data ?? [];
  const nextCursor = mainQuery.data?.nextCursor ?? null;

  // Cache the cursor for the next page whenever we receive one
  if (nextCursor && !cursorMap[currentPage + 1]) {
    setCursorMap((prev) => ({ ...prev, [currentPage + 1]: nextCursor }));
  }

  // ── org-wide status sub-counts (exact via cursor walk) ───────────────────────
  // useEmployeesCount walks all cursor pages so the count is exact regardless
  // of org size (up to 1,000 per bucket). v1.1: backend pagination.total would
  // replace this with a single fetch.
  const activeCountQuery = useEmployeesCount({ status: 'Active' });
  const onNoticeCountQuery = useEmployeesCount({ status: 'On-Notice' });
  const exitedCountQuery = useEmployeesCount({ status: 'Exited' });

  function subCount(q: { count: number | null }): string {
    if (q.count === null) return '—';
    return String(q.count);
  }

  const activeCount = subCount(activeCountQuery);
  const onNoticeCount = subCount(onNoticeCountQuery);
  const exitedCount = subCount(exitedCountQuery);

  // ── headline + true total ────────────────────────────────────────────────────
  const allLoaded =
    activeCountQuery.count !== null &&
    onNoticeCountQuery.count !== null &&
    exitedCountQuery.count !== null;
  const orgTotal = allLoaded
    ? activeCountQuery.count! +
      onNoticeCountQuery.count! +
      exitedCountQuery.count!
    : null;

  const bucketCountForStatus = (s: string): number | null => {
    if (s === 'Active') return activeCountQuery.count;
    if (s === 'On-Notice') return onNoticeCountQuery.count;
    if (s === 'Exited') return exitedCountQuery.count;
    return null;
  };

  // True total for the *currently filtered* set. We can only compute this
  // exactly when the only filter applied is `status` (no search/role/dept/type).
  const onlyStatusFilter =
    !!status && !searchRaw && !role && !empType && !department;
  const trueTotal: number | null = onlyStatusFilter
    ? bucketCountForStatus(status)
    : !status && !searchRaw && !role && !empType && !department
      ? orgTotal
      : null;

  const headlineTotal = orgTotal !== null ? String(orgTotal) : null;

  // Paginator total: prefer the exact trueTotal; fall back to cursor-derived
  // lower bound so search/role/dept-filtered lists still page through cleanly.
  const knownTotal = trueTotal ?? (currentPage - 1) * PAGE_SIZE + employees.length;
  const isApproximate = trueTotal === null && nextCursor !== null;
  const totalPages = trueTotal !== null
    ? Math.max(1, Math.ceil(trueTotal / PAGE_SIZE))
    : (isApproximate ? currentPage + 1 : currentPage);

  // ── page navigation ──────────────────────────────────────────────────────────
  function handlePageChange(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  const hasActiveFilters = !!(searchRaw || status || role || empType || department);

  return (
    <div>
      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-xl font-bold text-charcoal">
            {headlineTotal !== null ? `${headlineTotal} Employees` : 'Employee Directory'}
          </h2>
          {allLoaded && (
            <p className="text-xs text-slate mt-0.5">
              Active: {activeCount} &middot; On Notice: {onNoticeCount} &middot; Exited: {exitedCount}
            </p>
          )}
        </div>
        <Link
          href="/admin/employees/new"
          className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg font-body text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </Link>
      </div>

      {/* ── Filter card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <svg
              className="w-4 h-4 text-sage absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchRaw}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, EMP code..."
              aria-label="Search employees"
              className="w-full border border-sage/50 rounded-lg pl-9 pr-4 py-2 text-sm text-charcoal placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Filter by status"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="On-Notice">On Notice</option>
            <option value="Exited">Exited</option>
            <option value="On-Leave">On Leave</option>
          </select>

          {/* Role */}
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            aria-label="Filter by role"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Employee">Employee</option>
            <option value="PayrollOfficer">Payroll Officer</option>
          </select>

          {/* Employment Type */}
          <select
            value={empType}
            onChange={(e) => handleEmpTypeChange(e.target.value)}
            aria-label="Filter by employment type"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">Employment Type</option>
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
            <option value="Probation">Probation</option>
          </select>

          {/* Department */}
          <select
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            aria-label="Filter by department"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Filters / Reset button — always visible (matches prototype) */}
          <button
            type="button"
            onClick={resetFilters}
            aria-label={hasActiveFilters ? 'Clear filters' : 'Filters'}
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate hover:bg-offwhite transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {mainQuery.isError && (
        <div
          role="alert"
          className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 mb-5 flex items-center justify-between"
        >
          <p className="text-sm text-crimson">Failed to load employees. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => mainQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Table + Paginator ────────────────────────────────────────────────── */}
      <EmployeeDirectoryTable
        employees={employees}
        isLoading={mainQuery.isLoading}
        detailBase="/admin/employees"
        emptyMessage={
          hasActiveFilters
            ? 'No employees match your filters.'
            : 'No employees found. Add your first employee to get started.'
        }
        paginator={{
          currentPage,
          pageSize: PAGE_SIZE,
          total: knownTotal,
          isApproximate,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}
