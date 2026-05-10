import type { Metadata } from 'next';
import { NotificationsPageClient } from '@/features/notifications/components/NotificationsPageClient';

export const metadata: Metadata = {
  title: 'Notifications — Nexora HRMS',
};

export default function PayrollNotificationsPage() {
  return <NotificationsPageClient role="PayrollOfficer" />;
}
