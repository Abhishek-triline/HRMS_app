'use client';

/**
 * RatingScale — 1–5 button row.
 *
 * Labels: 1=Below, 2=Needs Work, 3=Meets, 4=Exceeds, 5=Outstanding.
 * Modes:
 *   - Selectable: keyboard-operable with arrow-key navigation + Enter to select.
 *   - Display-only: `readonly` prop; renders as static pills (no button role).
 */

import { useRef } from 'react';
import { clsx } from 'clsx';

const RATING_LABELS: Record<number, string> = {
  1: 'Below',
  2: 'Needs Work',
  3: 'Meets',
  4: 'Exceeds',
  5: 'Outstanding',
};

const RATING_COLORS: Record<number, { active: string; idle: string }> = {
  1: { active: 'bg-crimson text-white border-crimson', idle: 'border-sage/60 text-slate hover:border-crimson hover:text-crimson' },
  2: { active: 'bg-umber text-white border-umber', idle: 'border-sage/60 text-slate hover:border-umber hover:text-umber' },
  3: { active: 'bg-forest text-white border-forest', idle: 'border-sage/60 text-slate hover:border-forest hover:text-forest' },
  4: { active: 'bg-emerald text-white border-emerald', idle: 'border-sage/60 text-slate hover:border-emerald hover:text-emerald' },
  5: { active: 'bg-richgreen text-white border-richgreen', idle: 'border-sage/60 text-slate hover:border-richgreen hover:text-richgreen' },
};

interface RatingScaleProps {
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  disabled?: boolean;
  /** aria-label for the group */
  label?: string;
}

export function RatingScale({
  value,
  onChange,
  readonly = false,
  disabled = false,
  label = 'Rating',
}: RatingScaleProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, rating: number) {
    if (readonly || disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(5, rating + 1);
      buttonsRef.current[next - 1]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(1, rating - 1);
      buttonsRef.current[prev - 1]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange?.(rating);
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isSelected = value === rating;
        const colors = RATING_COLORS[rating];

        if (readonly) {
          return (
            <div
              key={rating}
              aria-label={`${rating} — ${RATING_LABELS[rating]}`}
              className={clsx(
                'inline-flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-semibold select-none',
                isSelected ? colors.active : 'border-sage/30 text-sage bg-offwhite',
              )}
            >
              <span className="text-base font-bold leading-none">{rating}</span>
              <span className="mt-0.5 text-[10px] leading-none">{RATING_LABELS[rating]}</span>
            </div>
          );
        }

        return (
          <button
            key={rating}
            ref={(el) => { buttonsRef.current[rating - 1] = el; }}
            type="button"
            aria-label={`Rate ${rating} — ${RATING_LABELS[rating]}`}
            aria-pressed={isSelected}
            disabled={disabled}
            tabIndex={isSelected || (value === null && rating === 1) ? 0 : -1}
            onClick={() => onChange?.(rating)}
            onKeyDown={(e) => handleKeyDown(e, rating)}
            className={clsx(
              'inline-flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40',
              'min-w-[60px] min-h-[44px]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected ? colors.active : colors.idle,
            )}
          >
            <span className="text-base font-bold leading-none">{rating}</span>
            <span className="mt-0.5 text-[10px] leading-none">{RATING_LABELS[rating]}</span>
          </button>
        );
      })}
    </div>
  );
}
