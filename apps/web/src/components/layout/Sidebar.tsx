'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import type { RoleKey } from './roleNavConfig';
import { SignOutButton } from './SignOutButton';
import { navByRole } from './roleNavConfig';
import { useTodayAttendance } from '@/lib/hooks/useAttendance';

// ── Role panel subtitle labels ────────────────────────────────────────────────

const ROLE_PANEL_LABELS: Record<RoleKey, string> = {
  Admin:          'Admin Panel',
  Manager:        'Manager Panel',
  Employee:       'Employee Panel',
  PayrollOfficer: 'Payroll Panel',
};

// ── Icon helper (inline SVG, no external deps) ────────────────────────────────

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={clsx('w-5 h-5 flex-shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

// ── Sidebar component ─────────────────────────────────────────────────────────

interface SidebarProps {
  role: RoleKey;
  /** Optional fallback for SSR / tests; runtime uses usePathname() for live navigation. */
  currentPath?: string;
}

export function Sidebar({ role, currentPath: currentPathProp }: SidebarProps) {
  const livePath = usePathname();
  const currentPath = livePath ?? currentPathProp ?? '';
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? '';
  const entries = navByRole[role];
  const panelLabel = ROLE_PANEL_LABELS[role];

  // Live check-in state — label flips between "Check In" / "Check Out".
  // Matches prototype/assets/sidebar.js setupCheckinState behaviour.
  // panelStateId: 1=Ready, 2=Working, 3=Confirm (§3.4)
  const today = useTodayAttendance();
  const checkinLabel =
    today.data?.panelStateId === 2 ? 'Check Out' : 'Check In';

  return (
    <aside className="nx-sidebar w-60 flex-shrink-0 bg-forest text-white flex flex-col h-full overflow-y-auto">
      {/* Brand — "Nexora HRMS" wordmark + role panel subtitle */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-mint rounded-lg flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-forest"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="font-heading text-base font-bold">Nexora HRMS</span>
          <span className="text-mint/60 text-[10px] uppercase tracking-[0.15em] font-semibold mt-0.5">
            {panelLabel}
          </span>
        </div>
      </div>

      {/* Nav — flat list per role, with optional subhead + divider entries */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        <ul role="list" className="space-y-0.5">
          {entries.map((entry, idx) => {
            if (entry.type === 'divider') {
              return <li key={`divider-${idx}`} role="separator" className="my-3 border-t border-white/10" />;
            }

            if (entry.type === 'subhead') {
              return (
                <li key={`subhead-${idx}`} aria-hidden="true">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-widest px-3 pt-4 pb-1.5">
                    {entry.label}
                  </p>
                </li>
              );
            }

            // type === 'link'
            if (entry.danger) {
              return (
                <li key={entry.href}>
                  <SignOutButton
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      'text-white/70 hover:text-white hover:bg-crimson/20',
                    )}
                  >
                    <Icon path={entry.iconPath} />
                    {entry.label}
                  </SignOutButton>
                </li>
              );
            }

            // Active match — pathname must match, AND when the nav entry's
            // href carries a query string (e.g. /admin/attendance?scope=me) the
            // current page's search params must match too. This disambiguates
            // sibling links that share a pathname but differ by query, like
            // Attendance (no scope) vs My Attendance (scope=me).
            //
            // matchPaths bypasses the query check: a matched alias means the
            // user is on a contextual sub-page of this nav item (e.g. the
            // regularisation form sitting under "My Attendance") and should
            // light up the parent entry regardless of query string.
            const [entryPath, entryQuery = ''] = entry.href.split('?');
            const matchesPrefix = (p: string) =>
              currentPath === p || (p !== '/' && currentPath.startsWith(p + '/'));
            const matchesViaAlias = (entry.matchPaths ?? []).some(matchesPrefix);
            const matchesViaHref = matchesPrefix(entryPath);
            const isActive = matchesViaAlias
              ? true
              : entryQuery
                ? matchesViaHref && currentSearch === entryQuery
                : matchesViaHref && !navByRole[role].some(
                    (e) =>
                      e.type === 'link' &&
                      e !== entry &&
                      e.href.startsWith(entryPath + '?') &&
                      currentSearch === e.href.split('?')[1],
                  );

            // Dynamic label for the check-in/out link.
            const liveLabel = entry.href.endsWith('/checkin')
              ? checkinLabel
              : entry.label;

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-emerald/20 text-white border-l-2 border-mint font-medium'
                      : 'text-white/70 hover:text-white hover:bg-emerald/10',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon path={entry.iconPath} />
                  {liveLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
