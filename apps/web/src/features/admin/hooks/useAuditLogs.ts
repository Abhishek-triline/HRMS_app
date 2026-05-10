'use client';

/**
 * useAuditLogs — infinite-scroll TanStack Query hook for the Audit Log feed.
 *
 * Uses cursor pagination; keepPreviousData ensures the table doesn't flicker
 * when filters change between pages.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { listAuditLogs } from '@/lib/api/audit';
import { qk } from '@/lib/api/query-keys';
import type { AuditLogFilters } from '@/lib/api/audit';

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useInfiniteQuery({
    queryKey: qk.audit.list(filters),
    queryFn: ({ pageParam }) =>
      listAuditLogs({
        ...filters,
        cursor: pageParam as string | undefined,
        limit: 25,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: (prev) => prev, // keepPreviousData equivalent in v5
    staleTime: 30_000,
    retry: 2,
  });
}
