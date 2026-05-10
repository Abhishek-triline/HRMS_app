import Link from 'next/link';
import { clsx } from 'clsx';
import type { Role } from '@nexora/contracts/common';
import { SignOutButton } from './SignOutButton';
import { navByRole } from './roleNavConfig';

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
  role: Role;
  currentPath: string;
  /** User initials for the bottom user card */
  initials: string;
  name: string;
  email: string;
}

export function Sidebar({ role, currentPath, initials, name, email }: SidebarProps) {
  const entries = navByRole[role];

  return (
    <aside className="nx-sidebar w-60 flex-shrink-0 bg-forest text-white flex flex-col h-full overflow-y-auto">
      {/* Brand — "Nexora HRMS" wordmark, no role subtitle */}
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
        <span className="font-heading text-base font-bold">Nexora HRMS</span>
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

            const isActive =
              currentPath === entry.href ||
              (entry.href !== '/' && currentPath.startsWith(entry.href + '/'));

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-emerald/20 border-l-2 border-mint text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-emerald/10',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon path={entry.iconPath} />
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user card */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full bg-mint flex items-center justify-center text-forest text-xs font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{name}</div>
            <div className="text-xs text-white/50 truncate">{email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
