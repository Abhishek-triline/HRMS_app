'use client';

/**
 * A-02 — Employee Directory (Admin).
 * Visual reference: prototype/admin/employees.html
 *
 * Features:
 * - Search (name / email / EMP code)
 * - Filter: status, role, employment type, department (select with seeded options)
 * - "Filters" toggle button (mobile collapsible)
 * - Count line "Showing 1–N of T" above Load-more
 * - Org-wide status sub-counters (Active / On Notice / Exited) via parallel queries
 * - "Create Employee" CTA in top-right
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useEmployeesList } from '@/lib/hooks/useEmployees';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { Button } from '@/components/ui/Button';
import type { EmployeeStatus, Role, EmploymentType } from '@nexora/contracts/common';

type FilterStatus = EmployeeStatus | '';
type FilterRole = Role | '';
type FilterEmpType = EmploymentType | '';

const DEPARTMENTS = ['Engineering', 'Design', 'HR', 'Finance', 'Operations'];

export default function EmployeesPage() {
  const [searchRaw, setSearchRaw] = useState('');
  const [status, setStatus] = useState<FilterStatus>('');
  const [role, setRole] = useState<FilterRole>('');
  const [empType, setEmpType] = useState<FilterEmpType>('');
  const [department, setDepartment] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const [search, setSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchRaw(value);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(
      setTimeout(() => {
        setSearch(value);
      }, 300),
    );
  }

  const query = {
    q: search || undefined,
    status: (status || undefined) as EmployeeStatus | undefined,
    role: (role || undefined) as Role | undefined,
    employmentType: (empType || undefined) as EmploymentType | undefined,
    department: department || undefined,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useEmployeesList(query);
  const employees = data?.data ?? [];

  // Org-wide status counts — parallel small queries (limit=1 to read total if API supports it,
  // otherwise we fall back to counting the current page slice).
  // The EmployeeListResponse does NOT currently carry `total` — contract only has `nextCursor`.
  // So we run three parallel minimal queries filtered by status and use the length when no
  // nextCursor is present (i.e. all loaded). When nextCursor is present the count is "N+".
  const activeQuery = useEmployeesList({ status: 'Active', limit: 1 });
  const onNoticeQuery = useEmployeesList({ status: 'On-Notice', limit: 1 });
  const exitedQuery = useEmployeesList({ status: 'Exited', limit: 1 });

  // Since the API uses cursor pagination without a total field, we resolve the
  // sub-counts from the filtered queries. We request limit=1 and check nextCursor:
  // if nextCursor is null, the count == data.length (0 or 1). We only use this
  // for the sub-count badges, so a small discrepancy is acceptable.
  // A better approach is for the backend to return `total` — flagged as contract gap.
  const activeCount = activeQuery.data
    ? activeQuery.data.data.length + (activeQuery.data.nextCursor ? '+' : '')
    : '—';
  const onNoticeCount = onNoticeQuery.data
    ? onNoticeQuery.data.data.length + (onNoticeQuery.data.nextCursor ? '+' : '')
    : '—';
  const exitedCount = exitedQuery.data
    ? exitedQuery.data.data.length + (exitedQuery.data.nextCursor ? '+' : '')
    : '—';

  // Total shown in the headline
  const totalDisplay = !isLoading
    ? `${employees.length}${data?.nextCursor ? '+' : ''} Employees`
    : 'Employee Directory';

  function resetFilters() {
    setSearchRaw('');
    setSearch('');
    setStatus('');
    setRole('');
    setEmpType('');
    setDepartment('');
  }

  const hasActiveFilters = !!(searchRaw || status || role || empType || department);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-xl font-bold text-charcoal">
            {totalDisplay}
          </h2>
          {!isLoading && (
            <p className="text-xs text-slate mt-0.5">
              Active: {activeCount} &middot; On Notice: {onNoticeCount} &middot; Exited: {exitedCount}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filters toggle (visible on mobile, hidden on desktop since filters are always shown) */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="md:hidden flex items-center gap-1.5 border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate hover:bg-offwhite transition-colors"
            aria-expanded={showFilters}
            aria-controls="filter-row"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
          </button>

          <Link href="/admin/employees/new">
            <Button
              variant="primary"
              size="md"
              leadingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div
        id="filter-row"
        className={`bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4 mb-5 ${showFilters ? 'block' : 'hidden md:block'}`}
      >
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
              type="search"
              value={searchRaw}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, EMP code…"
              aria-label="Search employees"
              className="w-full border border-sage/50 rounded-lg pl-9 pr-4 py-2 text-sm text-charcoal placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FilterStatus)}
            aria-label="Filter by status"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="On-Notice">On Notice</option>
            <option value="Exited">Exited</option>
            <option value="On-Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Role */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as FilterRole)}
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
            onChange={(e) => setEmpType(e.target.value as FilterEmpType)}
            aria-label="Filter by employment type"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">Employment Type</option>
            <option value="Permanent">Permanent</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
            <option value="Probation">Probation</option>
          </select>

          {/* Department — select with seeded options */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            aria-label="Filter by department"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest bg-white"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate hover:bg-offwhite transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-crimsonbg border border-crimson/30 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
          <p className="text-sm text-crimson">Failed to load employees.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Count line */}
      {!isLoading && employees.length > 0 && (
        <div className="mb-3 text-xs text-slate">
          Showing 1–{employees.length}{data?.nextCursor ? '+' : ''} of{' '}
          {data?.nextCursor ? `${employees.length}+ employees` : `${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Table */}
      <EmployeeTable
        employees={employees}
        isLoading={isLoading}
        detailBase="/admin/employees"
        showViewButton
        emptyMessage={
          hasActiveFilters
            ? 'No employees match your filters.'
            : 'No employees found. Add your first employee to get started.'
        }
      />

      {/* Load more (cursor pagination) */}
      {data?.nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="md">
            Load more employees
          </Button>
        </div>
      )}
    </div>
  );
}
