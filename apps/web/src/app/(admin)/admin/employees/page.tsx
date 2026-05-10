'use client';

/**
 * A-02 — Employee Directory (Admin).
 * Visual reference: prototype/admin/employees.html
 *
 * Features:
 * - Search (name / email / EMP code)
 * - Filter: status, role, employment type, department
 * - EmployeeTable with cursor pagination ("Load more")
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  // Using a simple ref-less approach for SSR safety
  const [, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const updateDebounced = useCallback(
    (v: T) => {
      setTimer((prev) => {
        if (prev) clearTimeout(prev);
        return setTimeout(() => setDebouncedValue(v), delay);
      });
    },
    [delay],
  );

  // Update debounced value when value changes
  useState(() => {
    updateDebounced(value);
  });

  return debouncedValue;
}

export default function EmployeesPage() {
  const [searchRaw, setSearchRaw] = useState('');
  const [status, setStatus] = useState<FilterStatus>('');
  const [role, setRole] = useState<FilterRole>('');
  const [empType, setEmpType] = useState<FilterEmpType>('');
  const [department, setDepartment] = useState('');

  // Simple manual debounce for search
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

  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const onNoticeCount = employees.filter((e) => e.status === 'On-Notice').length;
  const exitedCount = employees.filter((e) => e.status === 'Exited').length;

  function resetFilters() {
    setSearchRaw('');
    setSearch('');
    setStatus('');
    setRole('');
    setEmpType('');
    setDepartment('');
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading text-xl font-bold text-charcoal">
            {isLoading ? 'Employee Directory' : `${employees.length}+ Employees`}
          </h2>
          {!isLoading && (
            <p className="text-xs text-slate mt-0.5">
              Active: {activeCount} · On Notice: {onNoticeCount} · Exited: {exitedCount}
            </p>
          )}
        </div>
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

      {/* Filters */}
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

          {/* Department (free-text for now — phase 7 will make this a config select) */}
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department…"
            aria-label="Filter by department"
            className="border border-sage/50 rounded-lg px-3 py-2 text-sm text-slate w-36 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />

          {/* Reset */}
          {(searchRaw || status || role || empType || department) && (
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

      {/* Table */}
      <EmployeeTable
        employees={employees}
        isLoading={isLoading}
        detailBase="/admin/employees"
        showViewButton
        emptyMessage={
          searchRaw || status || role || empType || department
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

      {/* Pagination meta */}
      {employees.length > 0 && (
        <div className="mt-3 text-center text-xs text-slate">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
          {data?.nextCursor ? ' — more available' : ''}
        </div>
      )}
    </div>
  );
}
