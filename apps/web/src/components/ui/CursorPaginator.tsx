/**
 * CursorPaginator — reusable paginator UI for cursor-based server pagination.
 *
 * Pair with `useCursorPagination` from `lib/hooks/useCursorPagination`. The
 * hook owns the cursor map; this component just renders the controls.
 *
 * Typical usage:
 *
 *   const pager = useCursorPagination({ pageSize: 20, filtersKey: `${status}|${q}` });
 *   const query = useThingsList({ ...filters, limit: pager.pageSize, cursor: pager.cursor });
 *
 *   useEffect(() => {
 *     if (query.data) pager.cacheNextCursor(query.data.nextCursor);
 *   }, [query.data, pager]);
 *
 *   return (
 *     <>
 *       <Table rows={query.data?.data ?? []} />
 *       <CursorPaginator
 *         currentPage={pager.currentPage}
 *         pageSize={pager.pageSize}
 *         currentPageCount={query.data?.data.length ?? 0}
 *         hasMore={pager.hasMore}
 *         highestReachablePage={pager.highestReachablePage}
 *         onPageChange={pager.goToPage}
 *         onPrev={pager.goPrev}
 *         onNext={pager.goNext}
 *       />
 *     </>
 *   );
 *
 * Because the server returns no `total`, the displayed "Showing X-Y of Z+"
 * uses `currentPage * pageSize` as a known floor, with a "+" suffix while
 * more pages remain. Numbered buttons are shown only for pages we've already
 * cached a cursor for (so the user can jump back instantly), plus a Next
 * button to advance.
 */

import { clsx } from 'clsx';

export interface CursorPaginatorProps {
  currentPage: number;
  pageSize: number;
  /** Number of rows in the currently-visible page (data.data.length). */
  currentPageCount: number;
  /** True if the API said nextCursor != null on the latest fetch. */
  hasMore: boolean;
  /**
   * Highest page number we've cached a cursor for. Used to render numbered
   * buttons up to that point so the user can jump back to a previous page.
   */
  highestReachablePage: number;
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  /**
   * Exact total row count, if the API returns one. When provided, the label
   * reads "Showing X–Y of N" with no "+" suffix and the numbered buttons fill
   * out to the full page range. Leave undefined for endpoints that only
   * surface a cursor floor.
   */
  total?: number;
  /**
   * Optional override for the "Showing X-Y of Z" copy. The default reads
   * naturally for record lists; override for non-record nouns ("Showing
   * 1-20 of 42+ employees").
   */
  label?: (info: { from: number; to: number; total: number; hasMore: boolean }) => string;
  /** Optional className for the outer wrapper. */
  className?: string;
}

export function CursorPaginator(props: CursorPaginatorProps) {
  const {
    currentPage,
    pageSize,
    currentPageCount,
    hasMore,
    highestReachablePage,
    onPageChange,
    onPrev,
    onNext,
    total: knownTotal,
    label,
    className,
  } = props;

  // Nothing to paginate if we're on page 1 and there's no next page.
  if (currentPage === 1 && !hasMore && currentPageCount <= pageSize) {
    // Still render the "Showing X" copy for clarity, but no buttons.
    const from = currentPageCount === 0 ? 0 : 1;
    const to = currentPageCount;
    const total = knownTotal ?? currentPageCount;
    const text = label
      ? label({ from, to, total, hasMore: false })
      : currentPageCount === 0
        ? 'No records'
        : `Showing ${from}–${to} of ${total}`;
    return (
      <div
        className={clsx(
          'flex items-center justify-between px-6 py-3 border-t border-sage/20 text-xs text-slate',
          className,
        )}
      >
        <span>{text}</span>
      </div>
    );
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = (currentPage - 1) * pageSize + currentPageCount;
  // Total. If the API gave us an exact `total`, use it — the label reads
  // "Showing X–Y of N" cleanly. Otherwise fall back to a cursor floor:
  // on the *final* page (!hasMore here) the total is exact — `to`. Earlier
  // pages can only floor the total at `highestReachablePage * pageSize`
  // because we don't yet know how full the last page will be, so the
  // label gets a "+" suffix.
  const onFinalPage = !hasMore && currentPage >= highestReachablePage;
  const hasKnownTotal = typeof knownTotal === 'number';
  const totalForLabel = hasKnownTotal
    ? knownTotal
    : onFinalPage
      ? to
      : Math.max(to, highestReachablePage * pageSize);
  const suffix = hasKnownTotal || onFinalPage ? '' : '+';
  const text = label
    ? label({ from, to, total: totalForLabel, hasMore })
    : `Showing ${from}–${to} of ${totalForLabel}${suffix}`;

  // Numbered buttons can only be shown for pages we've cached a cursor for —
  // cursor pagination has no way to jump to an arbitrary page. Even when a
  // known `total` lets the label advertise more pages, the buttons stay
  // bounded by `highestReachablePage`; the Next button walks the user there.
  const pages: (number | 'ellipsis')[] = [];
  if (highestReachablePage <= 7) {
    for (let i = 1; i <= highestReachablePage; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 4) pages.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(highestReachablePage - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < highestReachablePage - 3) pages.push('ellipsis');
    pages.push(highestReachablePage);
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-between px-6 py-3 border-t border-sage/20 text-xs text-slate',
        className,
      )}
    >
      <span>{text}</span>
      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentPage === 1}
          className="border border-sage/50 px-3 py-1.5 rounded hover:bg-offwhite disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 py-1.5 text-slate" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              className={clsx(
                'px-3 py-1.5 rounded',
                p === currentPage
                  ? 'bg-forest text-white'
                  : 'border border-sage/50 hover:bg-offwhite',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!hasMore}
          className="border border-sage/50 px-3 py-1.5 rounded hover:bg-offwhite disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </nav>
    </div>
  );
}
