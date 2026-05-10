'use client';

/**
 * Admin personal regularisation submission — BL-004 (every role is also an employee).
 * Visual reference: prototype/admin/regularisation.html
 *
 * - 3-col grid layout: form (2/3) + right column info cards (1/3)
 * - Routing Rules card with avatar pills
 * - Important card with 3 bullet points
 * - Original Record context block (crimsonbg/border)
 * - My Regularisation History table at the bottom
 *
 * The RegularisationForm component implements all of the above internally.
 */

import { RegularisationForm } from '@/components/attendance/RegularisationForm';

export default function AdminRegularisationPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-charcoal">Regularisation Request</h1>
        <nav className="text-xs text-slate flex items-center gap-1 mt-1" aria-label="Breadcrumb">
          <a href="/admin/attendance" className="hover:text-forest transition-colors">My Attendance</a>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
          <span className="text-charcoal font-medium">Regularisation</span>
        </nav>
      </div>
      <RegularisationForm />
    </div>
  );
}
