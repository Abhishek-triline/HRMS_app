import type { AuthUser } from '@nexora/contracts/auth';
import type { RoleKey } from './roleNavConfig';
import { roleIdToKey } from './roleNavConfig';
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

/** Derive the notifications page path from the user's role key. */
function notificationsPath(role: RoleKey): string {
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
  const role = roleIdToKey(user.roleId);
  const notifHref = notificationsPath(role);

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      {/* Skip-to-main link — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-2 focus:left-2 focus:bg-white focus:text-forest focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-semibold focus:text-sm focus:ring-2 focus:ring-forest"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar (hidden on mobile via lg: classes) */}
      <div className="hidden lg:flex">
        <Sidebar
          role={role}
          currentPath={currentPath}
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
            />
          }
        >
          {pageTitle}
        </TopBar>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
