/**
 * Payroll Officer route group layout.
 * Server-side: fetches getMe(), validates role === 'PayrollOfficer'.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { ROLE_ID } from '@/lib/status/maps';

const ROLE_DASHBOARD: Record<number, string> = {
  [ROLE_ID.Admin]:   '/admin/dashboard',
  [ROLE_ID.Manager]: '/manager/dashboard',
  [ROLE_ID.Employee]:'/employee/dashboard',
};

export default async function PayrollGroupLayout({
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

  if (me.data.roleId !== ROLE_ID.PayrollOfficer) {
    const dest = ROLE_DASHBOARD[me.data.roleId];
    if (dest) redirect(dest);
    redirect('/login');
  }

  const pathname = headers().get('x-pathname') ?? '/payroll/dashboard';

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
