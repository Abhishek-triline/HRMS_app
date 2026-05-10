import Link from 'next/link';
import type { AuthUser } from '@nexora/contracts/auth';

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
        <Link
          href="/notifications"
          aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
          className="relative w-9 h-9 rounded-lg border border-sage/40 flex items-center justify-center text-slate hover:bg-offwhite hover:text-forest transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {hasUnread && (
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-crimson rounded-full"
              aria-hidden="true"
            />
          )}
        </Link>

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
