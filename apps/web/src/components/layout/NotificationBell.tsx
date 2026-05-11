'use client';

/**
 * NotificationBell — live unread-count badge in the dashboard header.
 *
 * Phase 6: fetches unread count via useUnreadCount (60s poll, staleTime 30s).
 * Shows numeric badge when count > 0; caps display at "99+".
 * Navigates to the role-specific notifications page on click.
 *
 * Accessibility: aria-label includes the unread count.
 * Role resolution: passed as a prop from the server-side layout.
 */

import Link from 'next/link';
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount';

interface NotificationBellProps {
  /** Role-prefixed path, e.g. "/admin/notifications" */
  href: string;
}

function formatCount(count: number): string {
  if (count <= 0) return '';
  if (count > 99) return '99+';
  return String(count);
}

export function NotificationBell({ href }: NotificationBellProps) {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  const displayCount = formatCount(count);
  const ariaLabel =
    count > 0 ? `Notifications, ${count > 99 ? '99+' : count} unread` : 'Notifications';

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
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

      {count > 0 && (
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-crimson rounded-full"
          aria-hidden="true"
          title={displayCount}
        />
      )}
    </Link>
  );
}
