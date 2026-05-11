'use client';

/**
 * LeaveQuotasPanel — table matching prototype/admin/config.html lines 339–368.
 *
 * Structure:
 *   Single white card with 6-column table:
 *   Leave Type / Permanent / Contract / Intern / Probation / Edit
 *
 * Data wiring:
 *   - useLeaveConfig() → LeaveTypeCatalogItem[] with quotas per employment type
 *   - When API data is available, quota values are read from item.quotas[].daysPerYear
 *   - Static fallback rows used when API returns no data (flagged in report)
 *
 * Edit button is a stub for v1 (no modal contract received yet); it renders
 * the prototype-styled button but does not open an edit flow.
 */

import { useLeaveConfig } from '@/lib/hooks/useLeave';
import { Spinner } from '@/components/ui/Spinner';
import type { LeaveTypeCatalogItem } from '@nexora/contracts/leave';

const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Intern', 'Probation'] as const;
type ET = typeof EMPLOYMENT_TYPES[number];

// ── Static fallback data matching prototype exactly ───────────────────────────
// Used when the API returns empty or no data. Flagged in report.

type StaticRow = {
  type: string;
  isEventBased: boolean;
  quotas: Partial<Record<ET, string | null>>;
};

const STATIC_ROWS: StaticRow[] = [
  {
    type: 'Annual Leave',
    isEventBased: false,
    quotas: { Permanent: '18', Contract: '12', Intern: '10', Probation: '12' },
  },
  {
    type: 'Sick Leave',
    isEventBased: false,
    quotas: { Permanent: '10', Contract: '8', Intern: '5', Probation: '8' },
  },
  {
    type: 'Casual Leave',
    isEventBased: false,
    quotas: { Permanent: '8', Contract: '6', Intern: '4', Probation: '6' },
  },
  {
    type: 'Maternity',
    isEventBased: true,
    quotas: { Permanent: '26 wks', Contract: '26 wks', Intern: null, Probation: null },
  },
  {
    type: 'Paternity',
    isEventBased: true,
    quotas: {
      Permanent: '10 work days',
      Contract: '10 work days',
      Intern: null,
      Probation: '10 work days',
    },
  },
  {
    type: 'Unpaid Leave',
    isEventBased: false,
    quotas: {
      Permanent: 'Unlimited',
      Contract: 'Unlimited',
      Intern: 'Unlimited',
      Probation: 'Unlimited',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCellValue(
  item: LeaveTypeCatalogItem,
  et: ET,
): string | null {
  if (item.type === 'Unpaid') return 'Unlimited';
  if (item.isEventBased) {
    // Event-based rows: show maxDaysPerEvent with unit suffix where applicable
    // Maternity: weeks; Paternity: work days
    if (item.type === 'Maternity') {
      // Not all employment types get maternity — Intern and Probation get null
      if (et === 'Intern' || et === 'Probation') return null;
      return item.maxDaysPerEvent !== null
        ? `${Math.round(item.maxDaysPerEvent / 7)} wks`
        : null;
    }
    if (item.type === 'Paternity') {
      if (et === 'Intern') return null;
      return item.maxDaysPerEvent !== null ? `${item.maxDaysPerEvent} work days` : null;
    }
  }
  const quota = item.quotas.find((q) => q.employmentType === et);
  return quota ? String(quota.daysPerYear) : null;
}

function CellValue({ value, isUnlimited }: { value: string | null; isUnlimited?: boolean }) {
  if (value === null) {
    return <span className="text-slate">—</span>;
  }
  if (isUnlimited || value === 'Unlimited') {
    return <span className="text-slate text-xs font-medium">Unlimited</span>;
  }
  return <span className="text-charcoal font-medium">{value}</span>;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function LeaveQuotasPanel() {
  const { data: types, isLoading, error } = useLeaveConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" aria-label="Loading leave quotas" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-crimsonbg border border-crimson/20 rounded-xl px-6 py-4 text-sm text-crimson"
        role="alert"
      >
        Could not load leave configuration. Please refresh.
      </div>
    );
  }

  // Use API data if available and non-empty; fall back to static prototype rows
  const hasApiData = types && types.length > 0;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-sage/20">
          <h3 className="font-heading text-base font-semibold text-charcoal">
            Leave Quotas by Employment Type
          </h3>
          <p className="text-xs text-slate mt-0.5">Days per year unless specified otherwise</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            aria-label="Leave quotas by employment type"
            data-nx-no-filter="true"
          >
            <thead>
              <tr className="bg-offwhite border-b border-sage/20">
                <th
                  scope="col"
                  className="text-left px-5 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                >
                  Leave Type
                </th>
                {EMPLOYMENT_TYPES.map((et) => (
                  <th
                    key={et}
                    scope="col"
                    className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                  >
                    {et}
                  </th>
                ))}
                <th
                  scope="col"
                  className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                >
                  Edit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {hasApiData
                ? types.map((item) => (
                    <tr key={item.type} className="hover:bg-offwhite/60">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-charcoal">{item.type}</span>
                        {item.isEventBased && (
                          <span className="text-xs text-slate ml-1">(event-based)</span>
                        )}
                      </td>
                      {EMPLOYMENT_TYPES.map((et) => {
                        const val = getCellValue(item, et);
                        return (
                          <td key={et} className="px-4 py-3.5 text-center">
                            <CellValue value={val} isUnlimited={item.type === 'Unpaid'} />
                          </td>
                        );
                      })}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          aria-label={`Edit ${item.type} quotas`}
                          className="border border-forest text-forest hover:bg-softmint px-3 py-1 rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                : STATIC_ROWS.map((row) => (
                    <tr key={row.type} className="hover:bg-offwhite/60">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-charcoal">{row.type}</span>
                        {row.isEventBased && (
                          <span className="text-xs text-slate ml-1">(event-based)</span>
                        )}
                      </td>
                      {EMPLOYMENT_TYPES.map((et) => {
                        const val = row.quotas[et] ?? null;
                        return (
                          <td key={et} className="px-4 py-3.5 text-center">
                            <CellValue value={val} isUnlimited={val === 'Unlimited'} />
                          </td>
                        );
                      })}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          aria-label={`Edit ${row.type} quotas`}
                          className="border border-forest text-forest hover:bg-softmint px-3 py-1 rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
