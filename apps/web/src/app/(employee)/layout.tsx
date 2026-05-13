/**
 * Employee route group layout.
 * Server-side: fetches getMe(), validates role === 'Employee'.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { ROLE_ID } from '@/lib/status/maps';
import { pathForOtherRole } from '@/lib/route/redirect-for-role';

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

  // Read pathname first so wrong-role redirects can preserve the deep link.
  // Notifications across the app hardcode /employee/... in their `link`
  // field; a non-Employee receiving one needs to be sent to the equivalent
  // path inside their own role group instead of dropped on the dashboard.
  const pathname = headers().get('x-pathname') ?? '/employee/dashboard';

  if (me.data.roleId !== ROLE_ID.Employee) {
    redirect(pathForOtherRole(pathname, me.data.roleId));
  }

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
