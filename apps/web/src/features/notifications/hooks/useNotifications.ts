'use client';

/**
 * useNotifications — infinite-scroll TanStack Query hook for the notification feed.
 *
 * Returns pages of notifications; the caller flattens them for rendering.
 * Filters are applied server-side via query params (no client-side filtering).
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listNotifications } from '@/lib/api/notifications';
import { qk } from '@/lib/api/query-keys';
import type { NotificationFilters } from '@/lib/api/notifications';

export function useNotifications(filters: Omit<NotificationFilters, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: qk.notifications.list(filters),
    queryFn: ({ pageParam }) =>
      listNotifications({
        ...filters,
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 15_000,
    retry: 1,
  });
}
