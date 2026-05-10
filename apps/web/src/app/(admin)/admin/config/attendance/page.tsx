/**
 * A-19 — Attendance Configuration (Admin) — deep-link redirect.
 *
 * The canonical UI is now /admin/configuration?tab=attendance.
 * This route exists for backwards compatibility and direct navigation.
 */

import { redirect } from 'next/navigation';

export default function AttendanceConfigPage() {
  redirect('/admin/configuration?tab=attendance');
}
