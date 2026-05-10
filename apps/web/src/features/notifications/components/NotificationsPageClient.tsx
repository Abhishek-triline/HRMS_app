'use client';

/**
 * NotificationsPageClient — client-side shell for all 4 role notification pages.
 *
 * Manages the active filter chip state and passes it down to the feed.
 * Separation of concerns: the server page just passes the role; this
 * component owns all interactivity.
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
    <div className="w-full max-w-3xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <p className="text-xs text-slate" aria-live="polite">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </p>
        <MarkAllReadButton disabled={!hasUnread} />
      </div>

      {/* Category chips */}
      <div className="mb-5">
        <NotificationCategoryChips
          role={role}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* Feed */}
      <NotificationFeed activeFilter={activeFilter} />

      {/* BL-045 retention disclosure */}
      <p className="mt-8 text-center text-xs text-slate/60 leading-relaxed">
        Notifications older than 90 days are archived. Audit records remain permanent.
      </p>
    </div>
  );
}
