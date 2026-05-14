'use client';

/**
 * OverrideTag — small "Mgr changed" badge.
 *
 * Rendered when managerOverrodeSelf=true (BL-040).
 * Tooltip cites the business rule. Only shown when the flag is set.
 */

import { useState } from 'react';
import { clsx } from 'clsx';

interface OverrideTagProps {
  show: boolean;
  className?: string;
}

export function OverrideTag({ show, className }: OverrideTagProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  if (!show) return null;

  return (
    <span className={clsx('relative inline-flex', className)}>
      <span
        className="inline-flex items-center gap-1 bg-umberbg text-umber text-[10px] font-bold px-1.5 py-0.5 rounded cursor-help"
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onFocus={() => setTooltipVisible(true)}
        onBlur={() => setTooltipVisible(false)}
        tabIndex={0}
        role="note"
        aria-label="Manager changed rating from employee self-rating"
      >
        <svg
          className="w-2.5 h-2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Mgr changed
      </span>

      {tooltipVisible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 mb-1.5 z-10 w-56 bg-charcoal text-white text-xs rounded-lg px-2.5 py-2 shadow-lg pointer-events-none"
        >
          The manager&apos;s rating differs from the employee&apos;s self-rating. The manager rating takes precedence once submitted.
        </span>
      )}
    </span>
  );
}
