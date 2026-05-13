'use client';

/**
 * E-05 — My Attendance (Employee).
 * Delegates to the shared MyAttendanceView so every role sees the same UI.
 */

import { MyAttendanceView } from '@/features/attendance/components/MyAttendanceView';

export default function EmployeeAttendancePage() {
  return <MyAttendanceView regularisationHref="/employee/regularisation" />;
}
