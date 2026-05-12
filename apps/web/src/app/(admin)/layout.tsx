/**
 * Admin route group layout.
 * Server-side: fetches getMe(), validates role === 'Admin'.
 * Redirects to /login if unauthenticated, to the correct dashboard if wrong role.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { ROLE_ID } from '@/lib/status/maps';

const ROLE_DASHBOARD: Record<number, string> = {
  [ROLE_ID.Manager]:       '/manager/dashboard',
  [ROLE_ID.Employee]:      '/employee/dashboard',
  [ROLE_ID.PayrollOfficer]:'/payroll/dashboard',
};

export default async function AdminGroupLayout({
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

  if (me.data.roleId !== ROLE_ID.Admin) {
    const dest = ROLE_DASHBOARD[me.data.roleId];
    if (dest) redirect(dest);
    redirect('/login');
  }

  // Get current path from x-pathname header (set by middleware) or fallback
  const pathname = headers().get('x-pathname') ?? '/admin/dashboard';

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
