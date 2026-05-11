/**
 * A-08 — Leave Configuration / Quotas (Admin) — deep-link redirect.
 *
 * The canonical UI is now /admin/configuration?tab=quotas.
 * This route exists for backwards compatibility and direct navigation.
 */

import { redirect } from 'next/navigation';

export default function AdminLeaveConfigPage() {
  redirect('/admin/configuration?tab=quotas');
}
