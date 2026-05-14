'use client';

/**
 * Manager Check In/Out — BL-004: every role is also an employee.
 * Delegates to the shared MyCheckInView.
 */

import { MyCheckInView } from '@/features/attendance/components/MyCheckInView';

export default function ManagerCheckInPage() {
  return <MyCheckInView regularisationHref="/manager/regularisation" />;
}
