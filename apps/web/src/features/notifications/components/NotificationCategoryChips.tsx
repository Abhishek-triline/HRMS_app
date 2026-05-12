'use client';

/**
 * NotificationCategoryChips — filter chips for the notification feed.
 *
 * The chip set rendered varies by role (BL-044 scoping).
 * "All" and "Unread" are always shown first.
 * Clicking a chip is an instant query update (no debounce needed at chip level).
 *
 * v2: category is an INT code (NOTIFICATION_CATEGORY_ID from maps).
 */

import { clsx } from 'clsx';
import { NOTIFICATION_CATEGORY_ID } from '@/lib/status/maps';
import type { NotificationCategoryIdValue } from '@nexora/contracts/notifications';

// ── ChipFilter ────────────────────────────────────────────────────────────────

export type ChipFilter = 'all' | 'unread' | NotificationCategoryIdValue;

// ── Role-scoped chip configs ─────────────────────────────────────────────────

type RoleChips = {
  Admin: ChipFilter[];
  Manager: ChipFilter[];
  Employee: ChipFilter[];
  PayrollOfficer: ChipFilter[];
};

export const ROLE_CHIPS: RoleChips = {
  Admin: [
    'all', 'unread',
    NOTIFICATION_CATEGORY_ID.Leave,
    NOTIFICATION_CATEGORY_ID.Attendance,
    NOTIFICATION_CATEGORY_ID.Status,
    NOTIFICATION_CATEGORY_ID.Configuration,
    NOTIFICATION_CATEGORY_ID.Performance,
    NOTIFICATION_CATEGORY_ID.Payroll,
    NOTIFICATION_CATEGORY_ID.Auth,
    NOTIFICATION_CATEGORY_ID.System,
  ],
  Manager: [
    'all', 'unread',
    NOTIFICATION_CATEGORY_ID.Leave,
    NOTIFICATION_CATEGORY_ID.Attendance,
    NOTIFICATION_CATEGORY_ID.Performance,
    NOTIFICATION_CATEGORY_ID.System,
  ],
  Employee: [
    'all', 'unread',
    NOTIFICATION_CATEGORY_ID.Leave,
    NOTIFICATION_CATEGORY_ID.Attendance,
    NOTIFICATION_CATEGORY_ID.Payroll,
    NOTIFICATION_CATEGORY_ID.Performance,
    NOTIFICATION_CATEGORY_ID.Auth,
    NOTIFICATION_CATEGORY_ID.System,
  ],
  PayrollOfficer: [
    'all', 'unread',
    NOTIFICATION_CATEGORY_ID.Payroll,
    NOTIFICATION_CATEGORY_ID.System,
  ],
};

// Label map for all chips (strings + int category IDs)
const CHIP_LABELS: Record<string | number, string> = {
  all:                                            'All',
  unread:                                         'Unread',
  [NOTIFICATION_CATEGORY_ID.Leave]:               'Leave',
  [NOTIFICATION_CATEGORY_ID.Attendance]:          'Attendance',
  [NOTIFICATION_CATEGORY_ID.Payroll]:             'Payroll',
  [NOTIFICATION_CATEGORY_ID.Performance]:         'Performance',
  [NOTIFICATION_CATEGORY_ID.Status]:              'Status',
  [NOTIFICATION_CATEGORY_ID.Configuration]:       'Configuration',
  [NOTIFICATION_CATEGORY_ID.Auth]:                'Auth',
  [NOTIFICATION_CATEGORY_ID.System]:              'System',
};

function chipLabel(filter: ChipFilter): string {
  return CHIP_LABELS[filter as string | number] ?? String(filter);
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
