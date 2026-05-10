import Link from 'next/link';
import type { AuthUser } from '@nexora/contracts/auth';
import { NotificationBell } from './NotificationBell';

interface TopBarProps {
  user: AuthUser;
  /** Page title displayed on the left */
  children?: React.ReactNode;
  /** Show unread dot on notification bell */
  hasUnread?: boolean;
  /** The burger button rendered by MobileDrawer */
  burgerSlot?: React.ReactNode;
}

/** Get initials from a full name */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

export function TopBar({ user, children, hasUnread = false, burgerSlot }: TopBarProps) {
  const initials = getInitials(user.name);

  return (
    <header
      className="h-[60px] bg-white border-b border-sage/30 flex items-center justify-between px-4 md:px-6 flex-shrink-0"
      style={{ height: 60 }}
    >
      {/* Left: burger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0">
        {burgerSlot}
        <div className="min-w-0">
          {children ? (
            <div className="font-heading text-lg font-bold text-charcoal leading-tight truncate">
              {children}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Notification bell */}
        <NotificationBell hasUnread={hasUnread} />

        {/* Avatar + name */}
        <Link
          href="/profile"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label={`Profile: ${user.name}`}
        >
          <div
            className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-charcoal leading-tight">{user.name}</div>
            <div className="text-xs text-slate">{user.code}</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
