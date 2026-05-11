'use client';

/**
 * KpiTile — generic KPI metric card used by all four role dashboards.
 *
 * Renders:
 *  - skeleton state (isLoading)
 *  - error state with retry button
 *  - value state with optional progress bar
 *
 * Wraps in an anchor when `href` is provided.
 */

import type { ReactNode } from 'react';

export interface KpiTileProps {
  label: string;
  value?: ReactNode;
  subtext?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  href?: string;
  /** If true, renders the tile with the umber/amber "attention" border */
  attention?: boolean;
  attentionDot?: boolean;
  /** Optional progress bar percentage (0–100) */
  progressPct?: number;
  progressColor?: string;
}

function TileShell({
  children,
  href,
  attention,
}: {
  children: ReactNode;
  href?: string;
  attention?: boolean;
}) {
  const base =
    attention
      ? 'bg-white rounded-xl border border-umber/30 px-5 py-4 transition-colors'
      : 'bg-white rounded-xl border border-sage/30 px-5 py-4 transition-colors';
  const hover = attention ? 'hover:border-umber/60' : 'hover:border-forest/50';

  if (href) {
    return (
      <a href={href} className={`block ${base} ${hover}`}>
        {children}
      </a>
    );
  }
  return <div className={base}>{children}</div>;
}

export function KpiTile({
  label,
  value,
  subtext,
  isLoading,
  isError,
  onRetry,
  href,
  attention,
  attentionDot,
  progressPct,
  progressColor = 'bg-forest',
}: KpiTileProps) {
  return (
    <TileShell href={href} attention={attention}>
      {/* Label row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[11px] font-semibold uppercase tracking-widest ${
            attention ? 'text-umber' : 'text-slate'
          }`}
        >
          {label}
        </span>
        {attentionDot && <span className="w-1.5 h-1.5 bg-umber rounded-full" />}
      </div>

      {isLoading && (
        <>
          <div className="h-8 w-20 bg-sage/20 rounded animate-pulse" />
          <div className="h-3 w-28 bg-sage/10 rounded mt-2 animate-pulse" />
        </>
      )}

      {isError && !isLoading && (
        <div className="text-xs text-crimson mt-1">
          Failed to load
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-2 underline text-emerald hover:text-forest transition-colors min-h-[44px]"
              aria-label={`Retry loading ${label}`}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="font-heading text-3xl font-bold text-charcoal leading-none">
            {value}
          </div>
          {progressPct !== undefined && (
            <div className="w-full bg-sage/30 rounded-full h-1.5 mt-3">
              <div
                className={`${progressColor} h-1.5 rounded-full`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          )}
          {subtext && <div className="text-xs text-slate mt-2">{subtext}</div>}
        </>
      )}
    </TileShell>
  );
}
