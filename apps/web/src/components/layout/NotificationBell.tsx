import Link from 'next/link';

interface NotificationBellProps {
  /** Show a crimson unread dot when true */
  hasUnread?: boolean;
  /** Override the notification destination */
  href?: string;
}

/**
 * NotificationBell — TopBar right-cluster component.
 *
 * Phase 0: renders a static bell icon with an optional unread dot.
 * Phase 2+: accepts a live unread-count from the useNotifications hook
 * and shows the numeric badge when count > 0.
 */
export function NotificationBell({
  hasUnread = false,
  href = '/notifications',
}: NotificationBellProps) {
  return (
    <Link
      href={href}
      aria-label={hasUnread ? 'Notifications (unread messages)' : 'Notifications'}
      className="relative w-9 h-9 rounded-lg border border-sage/40 flex items-center justify-center text-slate hover:bg-offwhite hover:text-forest transition-colors focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none"
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
  );
}
