import Link from 'next/link';
import { clsx } from 'clsx';
import type { Role } from '@nexora/contracts/common';
import { SignOutButton } from './SignOutButton';

// ── Icon helpers (inline SVG to avoid deps) ───────────────────────────────────

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

// ── Nav item types ────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  iconPath: string;
  /** If true, renders with crimson hover (sign-out) */
  danger?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// ── Role-specific nav config ──────────────────────────────────────────────────

const adminNav: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        href: '/admin/dashboard',
        iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
      {
        label: 'Employees',
        href: '/admin/employees',
        iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      },
      {
        label: 'Leave',
        href: '/admin/leave',
        iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
      {
        label: 'Attendance',
        href: '/admin/attendance',
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        label: 'Payroll',
        href: '/admin/payroll',
        iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        label: 'Performance',
        href: '/admin/performance',
        iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      {
        label: 'Audit Log',
        href: '/admin/audit-log',
        iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      },
      {
        label: 'Configuration',
        href: '/admin/config',
        iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      },
    ],
  },
  {
    title: 'My Records',
    items: [
      {
        label: 'My Profile',
        href: '/admin/profile',
        iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      },
    ],
  },
  {
    items: [
      {
        label: 'Sign Out',
        href: '/api/auth/signout',
        iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        danger: true,
      },
    ],
  },
];

const managerNav: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        href: '/manager/dashboard',
        iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
      {
        label: 'My Team',
        href: '/manager/team',
        iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      },
      {
        label: 'Leave Approvals',
        href: '/manager/leave',
        iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
      {
        label: 'Attendance',
        href: '/manager/attendance',
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        label: 'Performance',
        href: '/manager/performance',
        iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
    ],
  },
  {
    title: 'My Records',
    items: [
      {
        label: 'My Profile',
        href: '/manager/profile',
        iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      },
      {
        label: 'My Leave',
        href: '/manager/my-leave',
        iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
      {
        label: 'My Payslips',
        href: '/manager/my-payslips',
        iconPath: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
      },
    ],
  },
  {
    items: [
      {
        label: 'Sign Out',
        href: '/api/auth/signout',
        iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        danger: true,
      },
    ],
  },
];

const employeeNav: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        href: '/employee/dashboard',
        iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
      {
        label: 'My Leave',
        href: '/employee/leave',
        iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
      {
        label: 'My Attendance',
        href: '/employee/attendance',
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        label: 'My Payslips',
        href: '/employee/payslips',
        iconPath: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
      },
      {
        label: 'My Reviews',
        href: '/employee/reviews',
        iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      },
      {
        label: 'My Profile',
        href: '/employee/profile',
        iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      },
    ],
  },
  {
    items: [
      {
        label: 'Sign Out',
        href: '/api/auth/signout',
        iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        danger: true,
      },
    ],
  },
];

const payrollNav: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        href: '/payroll/dashboard',
        iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
      {
        label: 'Payroll Runs',
        href: '/payroll/runs',
        iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        label: 'Reports',
        href: '/payroll/reports',
        iconPath: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
      {
        label: 'My Profile',
        href: '/payroll/profile',
        iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      },
    ],
  },
  {
    items: [
      {
        label: 'Sign Out',
        href: '/api/auth/signout',
        iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        danger: true,
      },
    ],
  },
];

const navByRole: Record<Role, NavSection[]> = {
  Admin: adminNav,
  Manager: managerNav,
  Employee: employeeNav,
  PayrollOfficer: payrollNav,
};

const subtitleByRole: Record<Role, string> = {
  Admin: 'Admin Panel',
  Manager: 'Manager Panel',
  Employee: 'Employee Panel',
  PayrollOfficer: 'Payroll Panel',
};

// ── Sidebar component ─────────────────────────────────────────────────────────

interface SidebarProps {
  role: Role;
  currentPath: string;
  /** User initials for bottom user card */
  initials: string;
  name: string;
  email: string;
}

export function Sidebar({ role, currentPath, initials, name, email }: SidebarProps) {
  const sections = navByRole[role];
  const subtitle = subtitleByRole[role];

  return (
    <aside className="nx-sidebar w-60 flex-shrink-0 bg-forest text-white flex flex-col h-full overflow-y-auto">
      {/* Brand */}
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
        <div>
          <span className="font-heading text-base font-bold block leading-tight">Nexora HRMS</span>
          <span className="text-white/50 text-[11px]">{subtitle}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest px-3 pt-4 pb-1.5">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5" role="list">
              {section.items.map((item) => {
                const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');

                if (item.danger) {
                  // Sign-out uses SignOutButton (client component) which calls
                  // POST /auth/logout and handles the router redirect.
                  return (
                    <li key={item.href}>
                      <SignOutButton
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                          'text-white/70 hover:text-white hover:bg-crimson/20',
                        )}
                      >
                        <Icon path={item.iconPath} />
                        {item.label}
                      </SignOutButton>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-white/10 border-l-2 border-mint text-white font-medium'
                          : 'text-white/70 hover:text-white hover:bg-emerald/10',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon path={item.iconPath} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {sectionIdx < sections.length - 1 && (
              <div className="my-3 border-t border-white/10" />
            )}
          </div>
        ))}
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
