'use client';

/**
 * Payroll Officer personal attendance — BL-004: every role is also an
 * employee. Delegates to the shared MyAttendanceView.
 */

import { MyAttendanceView } from '@/features/attendance/components/MyAttendanceView';

export default function PayrollAttendancePage() {
  return <MyAttendanceView regularisationHref="/payroll/regularisation" />;
}
