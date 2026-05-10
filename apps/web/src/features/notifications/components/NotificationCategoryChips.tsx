'use client';

/**
 * NotificationCategoryChips — filter chips for the notification feed.
 *
 * The chip set rendered varies by role (BL-044 scoping).
 * "All" and "Unread" are always shown first.
 * Clicking a chip is an instant query update (no debounce needed at chip level).
 */

import { clsx } from 'clsx';
import type { NotificationCategory } from '@nexora/contracts/notifications';

// ── Role-scoped chip configs ─────────────────────────────────────────────────

export type ChipFilter = 'all' | 'unread' | NotificationCategory;

type RoleChips = {
  Admin: ChipFilter[];
  Manager: ChipFilter[];
  Employee: ChipFilter[];
  PayrollOfficer: ChipFilter[];
};

export const ROLE_CHIPS: RoleChips = {
  Admin:         ['all', 'unread', 'Status', 'Configuration', 'Performance', 'Payroll', 'Auth', 'System'],
  Manager:       ['all', 'unread', 'Leave', 'Attendance', 'Performance', 'System'],
  Employee:      ['all', 'unread', 'Leave', 'Attendance', 'Payroll', 'Performance', 'Auth', 'System'],
  PayrollOfficer:['all', 'unread', 'Payroll', 'System'],
};

// Label overrides for chips that need friendlier display names
const CHIP_LABELS: Partial<Record<ChipFilter, string>> = {
  all:           'All',
  unread:        'Unread',
};

function chipLabel(filter: ChipFilter): string {
  return CHIP_LABELS[filter] ?? filter;
}

// ── Component ────────────────────────────────────────────────────────────────

interface NotificationCategoryChipsProps {
  role: keyof RoleChips;
  active: ChipFilter;
  onChange: (filter: ChipFilter) => void;
}

export function NotificationCategoryChips({
  role,
  active,
  onChange,
}: NotificationCategoryChipsProps) {
  const chips = ROLE_CHIPS[role];

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="Filter notifications by category"
    >
      {chips.map((chip) => {
        const isActive = chip === active;
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            aria-pressed={isActive}
            className={clsx(
              'text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:outline-none',
              isActive
                ? 'bg-forest text-white border-forest'
                : 'border-sage text-slate hover:border-forest hover:text-forest bg-white',
            )}
          >
            {chipLabel(chip)}
          </button>
        );
      })}
    </div>
  );
}
