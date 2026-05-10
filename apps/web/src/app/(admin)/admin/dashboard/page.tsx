import type { Metadata } from 'next';
import { AdminDashboardClient } from '@/features/dashboard/components/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Nexora HRMS',
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
