'use client';

/**
 * useUnreadCount — short-polling hook for the header bell badge.
 *
 * staleTime: 30s — avoids hammering on rapid re-renders.
 * refetchInterval: 60s — keeps the bell count live without SSE.
 */

import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/lib/api/notifications';
import { qk } from '@/lib/api/query-keys';

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.notifications.unreadCount(),
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
