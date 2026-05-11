'use client';

/**
 * TopBar — dashboard header (client component).
 *
 * Left:  page title (h1) + Intl-formatted date subtitle below it.
 * Right: NotificationBell + avatar block (name + role pill, clickable link to profile).
 *
 * Role pill display map:
 *   Admin          → "Admin"
 *   Manager        → "Manager"
 *   Employee       → "Employee"
 *   PayrollOfficer → "Payroll Officer"
 */

import { useState } from 'react';
import Link from 'next/link';
import type { AuthUser } from '@nexora/contracts/auth';
import type { Role } from '@nexora/contracts/common';
import { NotificationBell } from './NotificationBell';

// ── Role display labels ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  Admin:          'Admin',
  Manager:        'Manager',
  Employee:       'Employee',
  PayrollOfficer: 'Payroll Officer',
};

// ── Profile href per role ─────────────────────────────────────────────────────

const PROFILE_HREFS: Record<Role, string> = {
  Admin:          '/admin/profile',
  Manager:        '/manager/profile',
  Employee:       '/employee/profile',
  PayrollOfficer: '/payroll/profile',
};

// ── Date formatter ────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  // Match prototype: "Wednesday, 7 May 2026" — weekday + comma + day + month + year.
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')}`;
}

// ── Initials helper ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TopBarProps {
  user: AuthUser;
  /** Page title displayed on the left */
  children?: React.ReactNode;
  /** Role-prefixed href for the notification bell, e.g. "/admin/notifications" */
  notificationsHref: string;
  /** The burger button rendered by MobileDrawer */
  burgerSlot?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopBar({ user, children, notificationsHref, burgerSlot }: TopBarProps) {
  const initials = getInitials(user.name);
  const roleLabel = ROLE_LABELS[user.role as Role] ?? user.role;
  const profileHref = PROFILE_HREFS[user.role as Role] ?? '/profile';

  // Compute the date string client-side to avoid SSR/CSR hydration mismatch.
  // useState initialiser runs only on the client after hydration.
  const [dateString] = useState(() => formatDate(new Date()));

  return (
    <header
      className="bg-white border-b border-sage/30 flex items-center justify-between px-4 md:px-6 flex-shrink-0"
      style={{ height: 60 }}
    >
      {/* Left: burger (mobile) + page title + date */}
      <div className="flex items-center gap-3 min-w-0">
        {burgerSlot}
        <div className="min-w-0">
          {children && (
            <h1 className="font-heading text-lg font-bold text-charcoal leading-tight truncate">
              {children}
            </h1>
          )}
          <p className="text-xs text-slate leading-tight">{dateString}</p>
        </div>
      </div>

      {/* Right cluster: bell + avatar + role pill */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Live notification bell */}
        <NotificationBell href={notificationsHref} />

        {/* Avatar + name + role pill — links to the user's own profile */}
        <Link
          href={profileHref}
          title="View your profile"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-charcoal leading-tight">{user.name}</div>
            <div className="flex items-center gap-1.5">
              <span className="bg-softmint text-forest text-xs font-bold px-2 py-0.5 rounded">
                {roleLabel}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
