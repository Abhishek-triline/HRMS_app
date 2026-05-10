'use client';

/**
 * Admin personal regularisation — BL-004: every role is also an employee.
 */

import { RegularisationForm } from '@/components/attendance/RegularisationForm';

export default function AdminRegularisationPage() {
  return (
    <div className="p-8">
      <RegularisationForm />
    </div>
  );
}
