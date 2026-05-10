import type { Metadata } from 'next';
import { ManagerDashboardClient } from '@/features/dashboard/components/ManagerDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Nexora HRMS',
};

export default function ManagerDashboardPage() {
  return <ManagerDashboardClient />;
}
