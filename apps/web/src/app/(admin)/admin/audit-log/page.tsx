/**
 * A-26 — Audit Log Viewer (Admin).
 * Server component shell; delegates rendering to AuditLogPageClient.
 * Visual reference: prototype/admin/audit-log.html
 */

import { AuditLogPageClient } from '@/features/admin/components/AuditLogPageClient';

export const metadata = { title: 'Audit Log — Nexora HRMS' };

export default function AuditLogPage() {
  return <AuditLogPageClient />;
}
