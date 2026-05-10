import type { Metadata } from 'next';
import { PayrollDashboardClient } from '@/features/dashboard/components/PayrollDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Nexora HRMS',
};

export default function PayrollDashboardPage() {
  return <PayrollDashboardClient />;
}
