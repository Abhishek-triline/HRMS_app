'use client';

/**
 * E-06 — Check In / Out (Employee). Delegates to the shared MyCheckInView.
 */

import { MyCheckInView } from '@/features/attendance/components/MyCheckInView';

export default function EmployeeCheckInPage() {
  return <MyCheckInView regularisationHref="/employee/regularisation" />;
}
