'use client';

/**
 * GoalRow — single goal display.
 *
 * Manager mode: shows outcome dropdown (editable if not locked).
 * Employee mode: display-only with "Proposed by employee" tag.
 * BL-038: outcomes are Met / Partial / Missed / Pending.
 */

import { clsx } from 'clsx';
import type { Goal, GoalOutcome } from '@nexora/contracts/performance';

const OUTCOME_OPTIONS: GoalOutcome[] = ['Pending', 'Met', 'Partial', 'Missed'];

const outcomeConfig: Record<
  GoalOutcome,
  { label: string; badgeClassName: string; cardClassName: string; selectClassName: string }
> = {
  Pending: {
    label: 'Pending',
    badgeClassName: 'bg-umberbg text-umber',
    cardClassName: 'bg-offwhite border-sage/30',
    selectClassName: 'border-sage focus:border-forest',
  },
  Met: {
    label: 'Met',
    badgeClassName: 'bg-greenbg text-richgreen',
    cardClassName: 'bg-greenbg border-richgreen/20',
    selectClassName: 'border-richgreen bg-white font-semibold text-richgreen',
  },
  Partial: {
    label: 'Partially Met',
    badgeClassName: 'bg-softmint text-forest',
    cardClassName: 'bg-offwhite border-sage/30',
    selectClassName: 'border-sage focus:border-forest',
  },
  Missed: {
    label: 'Missed',
    badgeClassName: 'bg-crimsonbg text-crimson',
    cardClassName: 'bg-umberbg border-umber/20',
    selectClassName: 'border-umber bg-white font-semibold text-umber',
  },
};

interface GoalRowProps {
  goal: Goal;
  /** If provided and non-null, renders an outcome dropdown */
  onOutcomeChange?: (goalId: string, outcome: GoalOutcome) => void;
  disabled?: boolean;
  className?: string;
}

export function GoalRow({ goal, onOutcomeChange, disabled = false, className }: GoalRowProps) {
  const config = outcomeConfig[goal.outcome];
  const isManagerMode = !!onOutcomeChange;

  return (
    <div
      className={clsx(
        'p-4 rounded-lg border transition-colors',
        isManagerMode ? config.cardClassName : 'bg-white border-sage/30',
        className,
      )}
    >
      {/* Header row: index label + outcome select/badge */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-slate bg-sage/20 px-2 py-0.5 rounded">
          Goal
        </span>
        {isManagerMode && !disabled ? (
          <select
            value={goal.outcome}
            onChange={(e) => onOutcomeChange(goal.id, e.target.value as GoalOutcome)}
            aria-label={`Outcome for goal: ${goal.text}`}
            className={clsx(
              'text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-forest/20',
              config.selectClassName,
            )}
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {outcomeConfig[o].label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={clsx(
              'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded tracking-[0.03em]',
              config.badgeClassName,
            )}
          >
            {config.label}
          </span>
        )}
      </div>

      {/* Goal text */}
      <p className="text-sm font-semibold text-charcoal leading-relaxed">{goal.text}</p>

      {/* Proposed by employee tag */}
      {goal.proposedByEmployee && (
        <span className="mt-1.5 inline-flex items-center gap-1 bg-softmint text-forest text-[10px] font-semibold px-1.5 py-0.5 rounded">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Proposed by employee
        </span>
      )}
    </div>
  );
}
