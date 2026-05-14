'use client';

/**
 * NotificationsPageClient — client-side shell for all 4 role notification pages.
 *
 * Manages the active filter chip state and passes it down to the feed.
 * Separation of concerns: the server page just passes the role; this
 * component owns all interactivity.
 *
 * Visual reference: prototype/admin/notifications.html
 */

import { useState } from 'react';
import { NotificationFeed } from './NotificationFeed';
import { NotificationCategoryChips, ROLE_CHIPS } from './NotificationCategoryChips';
import { MarkAllReadButton } from './MarkAllReadButton';
import { useUnreadCount } from '../hooks/useUnreadCount';
import type { ChipFilter } from './NotificationCategoryChips';

type NotifRole = keyof typeof ROLE_CHIPS;

interface NotificationsPageClientProps {
  role: NotifRole;
}

export function NotificationsPageClient({ role }: NotificationsPageClientProps) {
  const [activeFilter, setActiveFilter] = useState<ChipFilter>('all');
  const { data: countData } = useUnreadCount();
  const hasUnread = (countData?.count ?? 0) > 0;
  const unreadCount = countData?.count ?? 0;

  return (
    <div className="w-full" data-nx-notif-page>
      {/* Header row: status + mark-all-read */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <p className="text-xs text-slate" aria-live="polite" data-nx-status>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </p>
        <MarkAllReadButton disabled={!hasUnread} />
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <NotificationCategoryChips
          role={role}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* Feed */}
      <div className="space-y-3 mb-5">
        <NotificationFeed activeFilter={activeFilter} />
      </div>

      {/* BL-045 / BL-047 retention disclosure */}
      <p className="text-xs text-slate flex items-start gap-2">
        <svg
          className="w-3.5 h-3.5 text-slate shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Notifications are retained for <span className="font-semibold text-charcoal">90 days</span>.
          Audit-relevant events (approvals, payroll runs, reversals, status changes) are kept permanently in the system audit log —{' '}
          <span className="font-semibold text-charcoal">system-generated and append-only</span>; no user can edit or delete entries.
        </span>
      </p>
    </div>
  );
}
