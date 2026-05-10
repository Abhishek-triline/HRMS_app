/**
 * Root page — redirects to /login if no session, else to role dashboard.
 * This is a server component; it runs getMe() server-side via cookie forwarding.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const ROLE_DASHBOARD: Record<string, string> = {
  Admin: '/admin/dashboard',
  Manager: '/manager/dashboard',
  Employee: '/employee/dashboard',
  PayrollOfficer: '/payroll/dashboard',
};

export default async function RootPage() {
  try {
    const cookieHeader = headers().get('cookie') ?? undefined;
    const me = await getMe(cookieHeader);
    const destination = ROLE_DASHBOARD[me.data.role] ?? '/employee/dashboard';
    redirect(destination);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect('/login');
    }
    // Any other error — send to login
    redirect('/login');
  }
}
