import type { AuthUser } from '@nexora/contracts/auth';
import type { Role } from '@nexora/contracts/common';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileDrawerWrapper } from './MobileDrawerWrapper';

interface RoleLayoutProps {
  user: AuthUser;
  children: React.ReactNode;
  currentPath: string;
  /** Page title shown in the TopBar left slot */
  pageTitle?: string;
  /**
   * @deprecated Phase 0 compat shim — no longer used.
   * The bell now reads count live from useUnreadCount.
   */
  hasUnread?: boolean;
}

/** Get initials from a full name */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

/** Derive the notifications page path from the user's role. */
function notificationsPath(role: Role): string {
  switch (role) {
    case 'Admin':         return '/admin/notifications';
    case 'Manager':       return '/manager/notifications';
    case 'Employee':      return '/employee/notifications';
    case 'PayrollOfficer': return '/payroll/notifications';
    default:              return '/notifications';
  }
}

/**
 * RoleLayout — server component.
 * Wraps Sidebar + TopBar + main content slot.
 * Used by each (role)/layout.tsx route group.
 */
export function RoleLayout({
  user,
  children,
  currentPath,
  pageTitle,
}: RoleLayoutProps) {
  const role = user.role as Role;
  const initials = getInitials(user.name);
  const notifHref = notificationsPath(role);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile via lg: classes) */}
      <div className="hidden lg:flex">
        <Sidebar
          role={role}
          currentPath={currentPath}
          initials={initials}
          name={user.name}
          email={user.email}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          user={user}
          notificationsHref={notifHref}
          burgerSlot={
            <MobileDrawerWrapper
              role={role}
              currentPath={currentPath}
              initials={initials}
              name={user.name}
              email={user.email}
            />
          }
        >
          {pageTitle}
        </TopBar>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
