import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getMe } from '@/lib/api/auth';
import { PayrollDashboardClient } from '@/features/dashboard/components/PayrollDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Nexora HRMS',
};

export default async function PayrollDashboardPage() {
  let firstName: string | undefined;
  try {
    const cookieHeader = headers().get('cookie') ?? undefined;
    const me = await getMe(cookieHeader);
    firstName = me.data.user.name?.split(' ')[0];
  } catch {
    /* fall back to client-side useMe() */
  }
  return <PayrollDashboardClient firstName={firstName} />;
}
