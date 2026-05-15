/**
 * Shared utility functions for @nexora/web.
 *
 * cn()             — merge Tailwind class strings (clsx + tailwind-merge)
 * formatDate()     — format ISO date strings for display
 * formatTime()     — format an ISO timestamp as 12-hour time ("9:30 AM")
 * formatCurrency() — format numbers as Indian Rupees
 * getInitials()    — derive initials from a full name
 *
 * All time rendering MUST go through formatTime (or formatDate(value, 'time'))
 * so the UI is consistently 12-hour AM/PM. Hand-rolled formatters that emit
 * 24-hour strings are not allowed.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Class name merger ─────────────────────────────────────────────────────────

/**
 * Merge Tailwind utility classes safely — last write wins for conflicting
 * utilities, and falsy values are stripped.
 *
 * @example cn('px-2 py-1', condition && 'bg-forest', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Date formatting ───────────────────────────────────────────────────────────

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const TIME_FORMAT = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Format an ISO datetime or YYYY-MM-DD string for display.
 * @param value  ISO date string | Date object | null | undefined
 * @param style  'short' (default) | 'long' | 'time'
 *
 * @example
 *   formatDate('2026-01-15')          // "15 Jan 2026"
 *   formatDate('2026-01-15', 'long')  // "Thursday, 15 January 2026"
 *   formatDate('2026-01-15T09:30:00', 'time') // "9:30 am"
 */
export function formatDate(
  value: string | Date | null | undefined,
  style: 'short' | 'long' | 'time' = 'short',
): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '—';

  switch (style) {
    case 'long':
      return LONG_DATE_FORMAT.format(date);
    case 'time':
      return TIME_FORMAT.format(date);
    default:
      return SHORT_DATE_FORMAT.format(date);
  }
}

/**
 * Format an ISO timestamp (or Date) as a 12-hour clock time.
 *
 * Returns "—" for null / undefined / invalid input so callers can use this
 * directly in JSX without a guard. This is the canonical time formatter
 * for user-facing copy across the app.
 *
 * @example
 *   formatTime('2026-01-15T09:30:00')  // "9:30 am"
 *   formatTime(null)                    // "—"
 */
export function formatTime(value: string | Date | null | undefined): string {
  return formatDate(value, 'time');
}

// ── Currency formatting ───────────────────────────────────────────────────────

const INR_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format a number as Indian Rupees.
 * @example formatCurrency(125000) // "₹1,25,000"
 */
export function formatCurrency(amount: number): string {
  return INR_FORMAT.format(amount);
}

// ── Initials ──────────────────────────────────────────────────────────────────

/**
 * Derive up to two uppercase initials from a full name.
 * @example getInitials('Priya Mehta') // "PM"
 * @example getInitials('Ravi')        // "R"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}
