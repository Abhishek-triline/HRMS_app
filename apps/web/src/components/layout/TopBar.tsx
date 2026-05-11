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
import { usePathname, useSearchParams } from 'next/navigation';
import type { AuthUser } from '@nexora/contracts/auth';
import type { Role } from '@nexora/contracts/common';
import { NotificationBell } from './NotificationBell';
import { PAGE_META, resolvePageMeta } from './pageMeta';

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
  const profileHref = PROFILE_HREFS[user.role as Role] ?? '/profile';

  // Compute the date string client-side to avoid SSR/CSR hydration mismatch.
  // useState initialiser runs only on the client after hydration.
  const [dateString] = useState(() => formatDate(new Date()));

  // Resolve title + subtitle for this route. Falls back to `children` for the
  // title and no subtitle if the pathname isn't registered in pageMeta. When a
  // query string is present, prefer a `pathname?query` key (e.g. the sibling
  // /admin/attendance?scope=me → "My Attendance") before the bare pathname.
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const meta =
    (search && PAGE_META[`${pathname}?${search}`]) || resolvePageMeta(pathname);
  const title = meta?.title ?? children;
  const subtitle = meta?.subtitle?.replace('{date}', dateString) ?? null;

  return (
    <header
      className="bg-white border-b border-sage/30 flex items-center justify-between px-4 md:px-6 flex-shrink-0"
      style={{ height: 60 }}
    >
      {/* Left: burger (mobile) + page title + subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {burgerSlot}
        <div className="min-w-0">
          {title && (
            <h1 className="font-heading text-lg font-bold text-charcoal leading-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate leading-tight">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right cluster: bell + avatar + name (NO role pill — sidebar.js strips it
          because the sidebar brand subtitle "Admin Panel"/etc. already carries
          the role). */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <NotificationBell href={notificationsHref} />

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
          </div>
        </Link>
      </div>
    </header>
  );
}
