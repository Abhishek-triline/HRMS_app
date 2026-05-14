/**
 * EmptyFeed — friendly empty state for the notification feed.
 *
 * Copy changes per active filter so users know the filter is working.
 * v2: filter can be 'all', 'unread', or an INT category ID.
 */

import { NOTIFICATION_CATEGORY_ID } from '@/lib/status/maps';

// Reverse lookup: category ID → label
const CATEGORY_LABEL: Record<number, string> = {
  [NOTIFICATION_CATEGORY_ID.Leave]:         'Leave',
  [NOTIFICATION_CATEGORY_ID.Attendance]:    'Attendance',
  [NOTIFICATION_CATEGORY_ID.Payroll]:       'Payroll',
  [NOTIFICATION_CATEGORY_ID.Performance]:   'Performance',
  [NOTIFICATION_CATEGORY_ID.Status]:        'Status',
  [NOTIFICATION_CATEGORY_ID.Configuration]: 'Configuration',
  [NOTIFICATION_CATEGORY_ID.Auth]:          'Auth',
  [NOTIFICATION_CATEGORY_ID.System]:        'System',
};

interface EmptyFeedProps {
  filter?: string | number;
}

export function EmptyFeed({ filter }: EmptyFeedProps) {
  let heading = "You're all caught up";
  let sub = "No notifications yet. We'll let you know when something needs your attention.";

  if (filter === 'unread') {
    heading = 'No unread notifications';
    sub = 'Everything has been read. Check back later.';
  } else if (filter != null && filter !== 'all') {
    const label = typeof filter === 'number' ? (CATEGORY_LABEL[filter] ?? String(filter)) : filter;
    heading = `No ${label} notifications`;
    sub = `Nothing in this category right now. We'll notify you when something arrives.`;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-offwhite border border-sage/30 flex items-center justify-center mb-4">
        <svg
          className="w-7 h-7 text-slate"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </div>
      <h3 className="font-heading font-semibold text-charcoal text-base mb-1">{heading}</h3>
      <p className="text-sm text-slate max-w-xs">{sub}</p>
    </div>
  );
}
