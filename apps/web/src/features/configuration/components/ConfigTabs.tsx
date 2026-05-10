'use client';

/**
 * ConfigTabs — Tabbed configuration hub.
 * Visual reference: prototype/admin/config.html
 *
 * Tabs: Attendance | Leave | Tax | Holidays | Quotas
 * Uses ?tab= query string for deep-link support.
 * Each panel embeds the existing form/page content inline.
 *
 * Deep links at /admin/config/attendance, /admin/config/leave,
 * /admin/tax-config, /admin/holidays, /admin/leave-config all
 * redirect to /admin/configuration?tab=<bucket>.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { clsx } from 'clsx';

// ── Lazy-imported panel components ────────────────────────────────────────────
// We import the default-exported page components from the existing deep-link
// pages and render them here. This avoids duplicating form logic.

import AttendanceConfigContent from './panels/AttendanceConfigPanel';
import LeaveConfigContent from './panels/LeaveConfigPanel';
import TaxConfigContent from './panels/TaxConfigPanel';
import HolidaysContent from './panels/HolidaysPanel';
import LeaveQuotasContent from './panels/LeaveQuotasPanel';

// ── Tab registry ──────────────────────────────────────────────────────────────

export type ConfigTabKey = 'attendance' | 'leave' | 'tax' | 'holidays' | 'quotas';

interface ConfigTab {
  key: ConfigTabKey;
  label: string;
  iconPath: string;
}

const CONFIG_TABS: ConfigTab[] = [
  {
    key: 'attendance',
    label: 'Attendance',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'leave',
    label: 'Leave Config',
    iconPath:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'tax',
    label: 'Tax Settings',
    iconPath:
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'holidays',
    label: 'Holidays',
    iconPath:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'quotas',
    label: 'Leave Quotas',
    iconPath:
      'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

const VALID_TABS = new Set<string>(CONFIG_TABS.map((t) => t.key));

function isValidTab(v: string | null): v is ConfigTabKey {
  return v !== null && VALID_TABS.has(v);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConfigTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: ConfigTabKey = isValidTab(tabParam) ? tabParam : 'attendance';

  function setTab(key: ConfigTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Enforce valid tab in URL on mount
  useEffect(() => {
    if (!isValidTab(tabParam)) {
      setTab('attendance');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Tab navigation — grid of icon cards matching prototype */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
        role="tablist"
        aria-label="Configuration sections"
      >
        {CONFIG_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`config-panel-${tab.key}`}
              id={`config-tab-${tab.key}`}
              onClick={() => setTab(tab.key)}
              className={clsx(
                'rounded-xl px-4 py-3 flex items-center gap-3 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2',
                isActive
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-white border border-sage/30 text-charcoal hover:bg-softmint',
              )}
            >
              <svg
                className={clsx('w-5 h-5 shrink-0', isActive ? 'text-mint' : 'text-forest')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tab.iconPath}
                />
              </svg>
              <span className="text-sm font-semibold leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      {CONFIG_TABS.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`config-panel-${tab.key}`}
          aria-labelledby={`config-tab-${tab.key}`}
          hidden={activeTab !== tab.key}
        >
          {activeTab === tab.key && (
            <>
              {tab.key === 'attendance' && <AttendanceConfigContent />}
              {tab.key === 'leave' && <LeaveConfigContent />}
              {tab.key === 'tax' && <TaxConfigContent />}
              {tab.key === 'holidays' && <HolidaysContent />}
              {tab.key === 'quotas' && <LeaveQuotasContent />}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
