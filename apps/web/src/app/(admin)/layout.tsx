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
import { pathForOtherRole } from '@/lib/route/redirect-for-role';

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

  // Get current path from x-pathname header (set by middleware) or fallback.
  // Resolved before the role check so we can preserve deep-links when a
  // wrong-role user lands here (e.g. an Employee clicking an /admin/...
  // link in a notification).
  const pathname = headers().get('x-pathname') ?? '/admin/dashboard';

  if (me.data.roleId !== ROLE_ID.Admin) {
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
