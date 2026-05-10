/**
 * A-19 — Holiday Calendar Editor (Admin) — deep-link redirect.
 *
 * The canonical UI is now /admin/configuration?tab=holidays.
 * This route exists for backwards compatibility and direct navigation.
 */

import { redirect } from 'next/navigation';

export default function HolidaysPage() {
  redirect('/admin/configuration?tab=holidays');
}
