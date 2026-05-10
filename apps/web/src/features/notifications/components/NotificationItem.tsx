'use client';

/**
 * NotificationItem — single row in the notification feed.
 *
 * - Clicking marks the item as read (optimistic) then navigates to `link` when present.
 * - Unread items have a crimson dot, left accent border, highlighted bg, bold title.
 * - Category icon/colour follows the design system palette.
 * - Uses date-fns formatDistanceToNowStrict for time-ago.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { clsx } from 'clsx';
import { useMarkRead } from '../hooks/useMarkRead';
import type { Notification, NotificationCategory } from '@nexora/contracts/notifications';

// ── Category icon & colour maps ──────────────────────────────────────────────

const categoryIcon: Record<NotificationCategory, string> = {
  Leave:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  Attendance:
    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  Payroll:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  Performance:
    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  Status:
    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  Configuration:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  Auth:
    'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  System:
    'M13 10V3L4 14h7v7l9-11h-7z',
};

// bg + text colour pairs per category (Tailwind classes only, no arbitrary values)
const categoryStyle: Record<NotificationCategory, { bg: string; text: string }> = {
  Leave:         { bg: 'bg-softmint',   text: 'text-emerald' },
  Attendance:    { bg: 'bg-mint',       text: 'text-forest'  },
  Payroll:       { bg: 'bg-softmint',   text: 'text-emerald' },
  Performance:   { bg: 'bg-softmint',   text: 'text-emerald' },
  Status:        { bg: 'bg-umberbg',    text: 'text-umber'   },
  Configuration: { bg: 'bg-sage/20',    text: 'text-slate'   },
  Auth:          { bg: 'bg-crimsonbg',  text: 'text-crimson' },
  System:        { bg: 'bg-sage/20',    text: 'text-slate'   },
};

// ── Time-ago formatter ───────────────────────────────────────────────────────

function formatTimeAgo(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const distance = formatDistanceToNowStrict(date, { addSuffix: false });
    // Compact the output: "3 hours" → "3h", "12 minutes" → "12m", "2 days" → "2d"
    return distance
      .replace(/\s+seconds?/, 's')
      .replace(/\s+minutes?/, 'm')
      .replace(/\s+hours?/, 'h')
      .replace(/\s+days?/, 'd')
      .replace(/\s+weeks?/, 'w')
      .replace(/\s+months?/, 'mo')
      .replace(/\s+years?/, 'y')
      + ' ago';
  } catch {
    return '';
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  /** Used for optimistic updates from the parent list. */
  onRead?: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter();
  const markRead = useMarkRead();
  const { id, category, title, body, link, unread, createdAt } = notification;

  const style = categoryStyle[category];
  const iconPath = categoryIcon[category];

  const handleClick = useCallback(() => {
    if (unread) {
      onRead?.(id);
      markRead.mutate({ ids: [id] });
    }
    if (link) {
      router.push(link);
    }
  }, [id, unread, link, onRead, markRead, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <article
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'group flex items-start gap-4 px-5 py-4 rounded-xl border transition-all cursor-pointer outline-none',
        'focus-visible:ring-2 focus-visible:ring-forest/40',
        'hover:border-forest hover:shadow-sm',
        unread
          ? 'bg-softmint/40 border-l-2 border-l-forest border-sage/30'
          : 'bg-white border-sage/30',
      )}
      aria-label={`${unread ? 'Unread: ' : ''}${title}`}
    >
      {/* Unread dot */}
      <span
        className={clsx(
          'w-2 h-2 rounded-full mt-2 shrink-0',
          unread ? 'bg-crimson' : 'invisible',
        )}
        aria-label={unread ? 'Unread' : undefined}
        aria-hidden={!unread}
      />

      {/* Category icon */}
      <div
        className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          style.bg,
          style.text,
        )}
        aria-hidden="true"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3
            className={clsx(
              'font-heading text-sm text-charcoal leading-snug',
              unread ? 'font-semibold' : 'font-medium',
            )}
          >
            {title}
          </h3>
          <time
            className="text-xs text-slate shrink-0"
            dateTime={createdAt}
          >
            {formatTimeAgo(createdAt)}
          </time>
        </div>
        <p className="text-sm text-slate mt-0.5 leading-relaxed">{body}</p>
        {link && (
          <span className="inline-block text-xs font-semibold text-emerald mt-2 group-hover:underline">
            View →
          </span>
        )}
      </div>
    </article>
  );
}
