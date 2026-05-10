/**
 * Employee route group layout.
 * Server-side: fetches getMe(), validates role === 'Employee'.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { RoleLayout } from '@/components/layout/RoleLayout';

const ROLE_DASHBOARD: Record<string, string> = {
  Admin: '/admin/dashboard',
  Manager: '/manager/dashboard',
  PayrollOfficer: '/payroll/dashboard',
};

export default async function EmployeeGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let me;
  try {
    const cookieHeader = headers().get('cookie') ?? undefined;
    me = await getMe(cookieHeader);
  } catch (err) {
    if (err instanceof ApiError) {
      redirect('/login');
    }
    redirect('/login');
  }

  if (me.data.role !== 'Employee') {
    const dest = ROLE_DASHBOARD[me.data.role];
    if (dest) redirect(dest);
    redirect('/login');
  }

  const pathname = headers().get('x-pathname') ?? '/employee/dashboard';

  return (
    <RoleLayout
      user={me.data.user}
      currentPath={pathname}
      hasUnread={false}
    >
      {children}
    </RoleLayout>
  );
}
