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

const outcomeConfig: Record<GoalOutcome, { label: string; className: string }> = {
  Pending: { label: 'Pending', className: 'bg-umberbg text-umber' },
  Met: { label: 'Met', className: 'bg-greenbg text-richgreen' },
  Partial: { label: 'Partially Met', className: 'bg-softmint text-forest' },
  Missed: { label: 'Missed', className: 'bg-crimsonbg text-crimson' },
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
        'flex items-start gap-3 p-3.5 rounded-lg border border-sage/30 bg-white',
        className,
      )}
    >
      {/* Bullet */}
      <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-charcoal leading-relaxed">{goal.text}</p>
        {goal.proposedByEmployee && (
          <span className="mt-1 inline-flex items-center gap-1 bg-softmint text-forest text-[10px] font-semibold px-1.5 py-0.5 rounded">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Proposed by employee
          </span>
        )}
      </div>

      {/* Outcome */}
      <div className="flex-shrink-0">
        {isManagerMode && !disabled ? (
          <select
            value={goal.outcome}
            onChange={(e) => onOutcomeChange(goal.id, e.target.value as GoalOutcome)}
            aria-label={`Outcome for goal: ${goal.text}`}
            className="text-xs border border-sage/60 rounded-lg px-2 py-1.5 bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
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
              config.className,
            )}
          >
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}
