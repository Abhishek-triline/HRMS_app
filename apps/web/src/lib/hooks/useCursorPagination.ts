/**
 * useCursorPagination — frontend state manager for cursor-paginated lists.
 *
 * The backend's paginated endpoints all share the same response shape:
 *
 *   { data: T[]; nextCursor: string | null }
 *
 * They have no `total` field (that's a v1.1 backlog item). So to drive a
 * numbered paginator the frontend keeps a map `{ pageNumber → cursor }`,
 * filling it in as the user navigates. The first cursor is `undefined`;
 * every subsequent page reads `nextCursor` from the previous response and
 * stashes it for that page slot.
 *
 * The hook returns:
 *   currentPage  — 1-indexed page the user is currently viewing
 *   cursor       — the cursor to pass to the data hook
 *   onResponse   — pass the response's `nextCursor` here after each fetch
 *                  so the hook can cache the cursor for the next page
 *   goToPage     — navigation handler
 *   reset        — call when filters change so the cursor map clears
 *   knownTotal   — `(currentPage - 1) * pageSize + currentPageData.length`
 *   isApproximate — true while `nextCursor !== null` (more pages exist)
 *
 * Mirrors the pattern hand-rolled in /admin/employees and /admin/audit-log
 * — those should eventually migrate to this hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Default page size — matches the backend's PaginationQuerySchema default. */
export const DEFAULT_PAGE_SIZE = 20;

/** Page number (1-based) → cursor string the API needs to fetch that page. */
type CursorMap = Record<number, string | undefined>;

export interface UseCursorPaginationOptions {
  /** Page size to request from the API. Defaults to 20. */
  pageSize?: number;
  /**
   * String that captures every filter you pass to the data hook. Whenever it
   * changes, the hook resets cursorMap so page 1 is the new top.
   * Typical use: `JSON.stringify(filters)` or a simple `${a}|${b}` concat.
   */
  filtersKey?: string;
}

export interface UseCursorPagination {
  currentPage: number;
  pageSize: number;
  cursor: string | undefined;
  /**
   * Call this with the response's `nextCursor` after each successful fetch.
   * Idempotent — if the cursor for `currentPage + 1` is already cached, it
   * leaves it alone.
   */
  cacheNextCursor: (nextCursor: string | null) => void;
  /** Number of rows visible so far across already-loaded pages. */
  knownTotal: (currentRowCount: number) => number;
  /** True while more pages exist (last `nextCursor !== null`). */
  hasMore: boolean;
  goToPage: (page: number) => void;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
  /** Highest page number we know is reachable (we've fetched a cursor for it). */
  highestReachablePage: number;
}

export function useCursorPagination(options: UseCursorPaginationOptions = {}): UseCursorPagination {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const filtersKey = options.filtersKey ?? '';

  const [currentPage, setCurrentPage] = useState(1);
  const [cursorMap, setCursorMap] = useState<CursorMap>({ 1: undefined });
  const [hasMore, setHasMore] = useState(false);

  // Reset whenever filtersKey changes.
  const prevFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      prevFiltersKey.current = filtersKey;
      setCurrentPage(1);
      setCursorMap({ 1: undefined });
      setHasMore(false);
    }
  }, [filtersKey]);

  const cacheNextCursor = useCallback(
    (nextCursor: string | null) => {
      setHasMore(nextCursor !== null);
      if (nextCursor) {
        setCursorMap((prev) =>
          prev[currentPage + 1] !== undefined ? prev : { ...prev, [currentPage + 1]: nextCursor },
        );
      }
    },
    [currentPage],
  );

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1) return;
      if (cursorMap[page] === undefined && page !== 1) return; // not reachable yet
      setCurrentPage(page);
    },
    [cursorMap],
  );

  const goNext = useCallback(() => {
    if (!hasMore) return;
    setCurrentPage((p) => p + 1);
  }, [hasMore]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setCursorMap({ 1: undefined });
    setHasMore(false);
  }, []);

  const knownTotal = useCallback(
    (currentRowCount: number) => (currentPage - 1) * pageSize + currentRowCount,
    [currentPage, pageSize],
  );

  // Highest page we have a cursor for (i.e. could navigate to without further fetches).
  const highestReachablePage = Object.keys(cursorMap).reduce((acc, k) => {
    const n = Number(k);
    return n > acc ? n : acc;
  }, 1);

  return {
    currentPage,
    pageSize,
    cursor: cursorMap[currentPage],
    cacheNextCursor,
    knownTotal,
    hasMore,
    goToPage,
    goNext,
    goPrev,
    reset,
    highestReachablePage,
  };
}
