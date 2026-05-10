'use client';

/**
 * Manager own regularisation — same as E-07 but under /manager/regularisation.
 * BL-004: every role is also an employee for self-service attendance.
 */

import { RegularisationForm } from '@/components/attendance/RegularisationForm';

export default function ManagerRegularisationPage() {
  return (
    <div className="p-8">
      <RegularisationForm />
    </div>
  );
}
