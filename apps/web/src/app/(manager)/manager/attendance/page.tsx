'use client';

/**
 * Manager personal attendance — BL-004: every role is also an employee for
 * self-service attendance views. Delegates to the shared MyAttendanceView so
 * every role sees the same UI; only the Regularise CTA target changes.
 */

import { MyAttendanceView } from '@/features/attendance/components/MyAttendanceView';

export default function ManagerMyAttendancePage() {
  return <MyAttendanceView regularisationHref="/manager/regularisation" />;
}
