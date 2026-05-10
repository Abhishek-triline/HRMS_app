'use client';

/**
 * A-03 — Create Employee (Admin).
 * Visual reference: prototype/admin/create-employee.html
 *
 * Wraps EmployeeForm in create mode.
 * On success: toast "Employee created — invitation sent to {email}", route to detail page.
 */

import Link from 'next/link';
import { EmployeeForm } from '@/components/employees/EmployeeForm';

export default function CreateEmployeePage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5">
        <Link href="/admin/employees" className="text-slate hover:text-forest transition-colors">
          Employees
        </Link>
        <svg className="w-3.5 h-3.5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-semibold text-charcoal">Create Employee</span>
      </div>

      <div className="mb-5">
        <h2 className="font-heading text-xl font-bold text-charcoal">Create New Employee</h2>
        <p className="text-sm text-slate mt-0.5">
          Fill in the details below to onboard a new employee. An invite will be sent automatically.
        </p>
      </div>

      <EmployeeForm mode="create" />
    </div>
  );
}
