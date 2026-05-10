'use client';

/**
 * GoalList — list of goals with optional "Propose goal" button (Employee mode).
 *
 * BL-038: Employee can propose additional goals only during the self-review window.
 * The window-gated prop controls button visibility.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { GoalRow } from './GoalRow';
import { Button } from '@/components/ui/Button';
import type { Goal, GoalOutcome } from '@nexora/contracts/performance';

interface GoalListProps {
  goals: Goal[];
  /** Manager mode: called when an outcome changes */
  onOutcomeChange?: (goalId: string, outcome: GoalOutcome) => void;
  /** Employee mode: show "Propose goal" button (window-gated) */
  canProposeGoal?: boolean;
  onProposeGoal?: (text: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function GoalList({
  goals,
  onOutcomeChange,
  canProposeGoal = false,
  onProposeGoal,
  disabled = false,
  className,
}: GoalListProps) {
  const [proposing, setProposing] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!proposalText.trim() || !onProposeGoal) return;
    setSubmitting(true);
    try {
      await onProposeGoal(proposalText.trim());
      setProposalText('');
      setCharCount(0);
      setProposing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (goals.length === 0 && !canProposeGoal) {
    return (
      <div className={clsx('text-sm text-slate text-center py-6', className)}>
        No goals set for this review yet.
      </div>
    );
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {goals.map((goal) => (
        <GoalRow
          key={goal.id}
          goal={goal}
          onOutcomeChange={onOutcomeChange}
          disabled={disabled}
        />
      ))}

      {goals.length === 0 && canProposeGoal && (
        <p className="text-sm text-slate py-2">No goals set yet. Propose one below to get started.</p>
      )}

      {canProposeGoal && (
        <div className="pt-2">
          {!proposing ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setProposing(true)}
              disabled={disabled}
              leadingIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Propose a goal
            </Button>
          ) : (
            <form onSubmit={handlePropose} className="space-y-2">
              <div className="relative">
                <textarea
                  value={proposalText}
                  onChange={(e) => {
                    setProposalText(e.target.value);
                    setCharCount(e.target.value.length);
                  }}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe the goal (3–500 characters)…"
                  className="w-full border border-sage rounded-lg px-3.5 py-2.5 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none"
                  aria-label="Proposed goal text"
                  required
                />
                <span className="absolute bottom-2 right-3 text-xs text-sage">
                  {charCount}/500
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  disabled={proposalText.trim().length < 3}
                >
                  Submit proposal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProposing(false);
                    setProposalText('');
                    setCharCount(0);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
