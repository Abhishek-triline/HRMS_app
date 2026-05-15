'use client';

/**
 * QueueTabs — Tabbed approval-queue hub. Shared by Admin and Manager.
 *
 * Tabs: Regularisation | Encashment
 * Uses ?tab= query string for deep-link support (same pattern as ConfigTabs).
 *
 * Each role's hub page passes its own panel components — the admin panels
 * cover the org-wide queues, the manager panels cover just their reportees.
 * Standalone routes (.../regularisation-queue, .../leave-encashment-queue)
 * stay intact so notification deep-links and bookmarks keep working.
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { clsx } from 'clsx';

// ── Tab registry ──────────────────────────────────────────────────────────────

export type QueueTabKey = 'regularisation' | 'encashment';

interface QueueTab {
  key: QueueTabKey;
  label: string;
  iconPath: string;
}

const QUEUE_TABS: QueueTab[] = [
  {
    key: 'regularisation',
    label: 'Regularisation',
    // Clipboard / document-edit
    iconPath:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    key: 'encashment',
    label: 'Encashment',
    // Rupee in circle
    iconPath:
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const VALID_TABS = new Set<string>(QUEUE_TABS.map((t) => t.key));

function isValidTab(v: string | null): v is QueueTabKey {
  return v !== null && VALID_TABS.has(v);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface QueueTabsProps {
  /** Regularisation panel — role-specific (admin org-wide vs manager-scoped). */
  regularisationPanel: ReactNode;
  /** Encashment panel — same role-specific split. */
  encashmentPanel: ReactNode;
}

export function QueueTabs({ regularisationPanel, encashmentPanel }: QueueTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: QueueTabKey = isValidTab(tabParam) ? tabParam : 'regularisation';

  function setTab(key: QueueTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Normalise the URL on mount so deep-links without ?tab settle on the default.
  useEffect(() => {
    if (!isValidTab(tabParam)) {
      setTab('regularisation');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* No in-page heading — the framework header (driven by pageMeta) already
          shows "Approval Queues" + subtitle. */}

      {/* Tab navigation — mirrors ConfigTabs visually */}
      <div
        className="grid grid-cols-2 gap-3 mb-6"
        role="tablist"
        aria-label="Queue sections"
      >
        {QUEUE_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`queue-panel-${tab.key}`}
              id={`queue-tab-${tab.key}`}
              onClick={() => setTab(tab.key)}
              className={clsx(
                'rounded-xl px-4 py-3 flex items-center gap-3 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2',
                isActive
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-white border border-sage/30 text-charcoal hover:bg-softmint',
              )}
            >
              <svg
                className={clsx('w-5 h-5 shrink-0', isActive ? '' : 'text-forest')}
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

      {/* Panel content — mount only the active panel to keep page queries
          minimal and avoid running both lists' useQueries at once. */}
      {QUEUE_TABS.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`queue-panel-${tab.key}`}
          aria-labelledby={`queue-tab-${tab.key}`}
          hidden={activeTab !== tab.key}
        >
          {activeTab === tab.key && (
            <>
              {tab.key === 'regularisation' && regularisationPanel}
              {tab.key === 'encashment' && encashmentPanel}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
