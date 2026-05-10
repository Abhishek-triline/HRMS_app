'use client';

/**
 * NotificationFeed — infinite-scroll notification list.
 *
 * - Uses useInfiniteQuery via useNotifications.
 * - Renders skeleton loading state, error retry, and empty state.
 * - Optimistic mark-read: flips unread flag locally before server confirms.
 * - Accessible: role="feed", items are role="article".
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { EmptyFeed } from './EmptyFeed';
import type { Notification, NotificationCategory } from '@nexora/contracts/notifications';
import type { ChipFilter } from './NotificationCategoryChips';

// ── Loading skeleton ─────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-xl border border-sage/20 bg-white animate-pulse">
      <span className="w-2 h-2 rounded-full mt-2 shrink-0 bg-sage/30" />
      <div className="w-10 h-10 rounded-xl bg-sage/20 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-4">
          <div className="h-3.5 bg-sage/20 rounded w-48" />
          <div className="h-3 bg-sage/20 rounded w-14" />
        </div>
        <div className="h-3 bg-sage/20 rounded w-full" />
        <div className="h-3 bg-sage/20 rounded w-3/4" />
      </div>
    </div>
  );
}

// ── Prop types ───────────────────────────────────────────────────────────────

interface NotificationFeedProps {
  activeFilter: ChipFilter;
}

// ── Component ────────────────────────────────────────────────────────────────

export function NotificationFeed({ activeFilter }: NotificationFeedProps) {
  // Translate chip filter → API params
  const apiFilters =
    activeFilter === 'all'
      ? {}
      : activeFilter === 'unread'
      ? { unread: true }
      : { category: activeFilter as NotificationCategory };

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useNotifications(apiFilters);

  // Optimistic: track locally-read IDs until refetch settles
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  const handleRead = useCallback((id: string) => {
    setLocalReadIds((prev) => new Set(prev).add(id));
  }, []);

  // Flatten pages → single notification array
  const notifications: Notification[] = (data?.pages ?? []).flatMap((page) =>
    page.data.map((n) =>
      localReadIds.has(n.id) ? { ...n, unread: false } : n,
    ),
  );

  // Reset local optimistic state when query key changes (filter switch)
  useEffect(() => {
    setLocalReadIds(new Set());
  }, [activeFilter]);

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading notifications">
        {Array.from({ length: 4 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-crimson/30 bg-crimsonbg px-5 py-6 text-center"
      >
        <p className="text-sm font-semibold text-crimson mb-1">Could not load notifications</p>
        <p className="text-xs text-slate mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-semibold text-crimson border border-crimson/40 rounded-lg px-4 py-2 hover:bg-crimson/10 transition-colors focus-visible:ring-2 focus-visible:ring-crimson/30 focus-visible:outline-none"
        >
          Try again
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return <EmptyFeed filter={activeFilter} />;
  }

  return (
    <>
      <div
        role="feed"
        aria-label="Notifications"
        aria-busy={isFetchingNextPage}
        className="space-y-3"
      >
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onRead={handleRead} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4" aria-label="Loading more notifications">
          <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasNextPage && notifications.length > 0 && (
        <p className="text-center text-xs text-slate/60 py-4">
          {"You've reached the end of your notifications."}
        </p>
      )}
    </>
  );
}
