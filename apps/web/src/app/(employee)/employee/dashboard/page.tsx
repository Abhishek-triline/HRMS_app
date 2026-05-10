import type { Metadata } from 'next';
import { EmployeeDashboardClient } from '@/features/dashboard/components/EmployeeDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Nexora HRMS',
};

export default function EmployeeDashboardPage() {
  return <EmployeeDashboardClient />;
}
