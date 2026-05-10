'use client';

/**
 * Payroll Officer personal regularisation — BL-004.
 */

import { RegularisationForm } from '@/components/attendance/RegularisationForm';

export default function PayrollRegularisationPage() {
  return (
    <div className="p-8">
      <RegularisationForm />
    </div>
  );
}
