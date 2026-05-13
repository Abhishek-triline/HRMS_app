'use client';

/**
 * Admin personal Check In/Out — BL-004: every role is also an employee.
 * Delegates to the shared MyCheckInView.
 */

import { MyCheckInView } from '@/features/attendance/components/MyCheckInView';

export default function AdminCheckInPage() {
  return <MyCheckInView regularisationHref="/admin/regularisation" />;
}
