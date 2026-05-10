'use client';

/**
 * DashboardPanelCard — white card used for the two-panel middle row and
 * the bottom needs-attention strip.
 *
 * Handles loading (skeleton rows), empty state, and error state internally.
 */

import type { ReactNode } from 'react';

export interface DashboardPanelCardProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  children?: ReactNode;
  /** Number of skeleton rows to render while loading */
  skeletonRows?: number;
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="px-5 py-4 space-y-3" aria-label="Loading…" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-sage/20 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-sage/20 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-sage/10 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPanelCard({
  title,
  actionLabel,
  actionHref,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  emptyMessage = 'Nothing to show right now.',
  children,
  skeletonRows = 4,
}: DashboardPanelCardProps) {
  return (
    <div className="bg-white rounded-xl border border-sage/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-sage/20">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        {actionLabel && actionHref && (
          <a href={actionHref} className="text-xs text-emerald font-semibold hover:underline">
            {actionLabel}
          </a>
        )}
      </div>

      {isLoading && <SkeletonRows count={skeletonRows} />}

      {isError && !isLoading && (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-crimson mb-2">Failed to load data.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-emerald underline hover:text-forest transition-colors min-h-[44px]"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && isEmpty && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-slate">{emptyMessage}</p>
        </div>
      )}

      {!isLoading && !isError && !isEmpty && children}
    </div>
  );
}
