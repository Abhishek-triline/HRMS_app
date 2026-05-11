/**
 * A-08 — Leave Configuration Settings (Admin) — deep-link redirect.
 *
 * The canonical UI is now /admin/configuration?tab=leave.
 * This route exists for backwards compatibility and direct navigation.
 */

import { redirect } from 'next/navigation';

export default function LeaveConfigSettingsPage() {
  redirect('/admin/configuration?tab=leave');
}
