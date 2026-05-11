import type { Metadata } from 'next';
import { NotificationsPageClient } from '@/features/notifications/components/NotificationsPageClient';

export const metadata: Metadata = {
  title: 'Notifications — Nexora HRMS',
};

export default function EmployeeNotificationsPage() {
  return <NotificationsPageClient role="Employee" />;
}
