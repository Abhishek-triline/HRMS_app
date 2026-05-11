/**
 * A-17 — Tax Configuration (Admin) — deep-link redirect.
 *
 * The canonical UI is now /admin/configuration?tab=tax.
 * This route exists for backwards compatibility and direct navigation.
 */

import { redirect } from 'next/navigation';

export default function TaxConfigPage() {
  redirect('/admin/configuration?tab=tax');
}
