'use client';

/**
 * LeaveQuotasPanel — prototype-literal rebuild for /admin/configuration · Quotas tab.
 *
 * Layout (matches prototype lines 339-368):
 *   Single white card. Header (h3 + subtitle). Table with columns:
 *     Leave Type · Permanent · Contract · Intern · Probation · Edit
 *
 * Display rules:
 *   - Annual / Sick / Casual: render numeric days (text-charcoal).
 *   - Maternity (event-based): render "X wks" — backend stores DAYS, convert ÷7.
 *     Intern + Probation = 0 → render em-dash and disable that input in edit.
 *   - Paternity (event-based): render "X work days" — backend stores DAYS as-is.
 *     Intern = 0 → em-dash + disabled in edit.
 *   - Unpaid: render "Unlimited" in all columns; Edit button hidden.
 *
 * Edit flow: per-row inline editor. Save commits per-employment-type via
 * useUpdateLeaveQuota(type) in series. Cancel discards.
 */

import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  useLeaveConfig,
  useUpdateLeaveQuota,
} from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import type {
  LeaveTypeCatalogItem,
  LeaveType,
} from '@nexora/contracts/leave';

const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Intern', 'Probation'] as const;
type ET = (typeof EMPLOYMENT_TYPES)[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function quotaFor(item: LeaveTypeCatalogItem, et: ET): number {
  const q = item.quotas.find((x) => x.employmentType === et);
  return q?.daysPerYear ?? 0;
}

/** Maternity/Paternity slots that are NOT available for that employment type. */
function isUnsupported(type: LeaveType, et: ET): boolean {
  if (type === 'Maternity') return et === 'Intern' || et === 'Probation';
  if (type === 'Paternity') return et === 'Intern';
  return false;
}

function displayCell(item: LeaveTypeCatalogItem, et: ET): {
  text: string;
  muted: boolean;
} {
  if (item.type === 'Unpaid') return { text: 'Unlimited', muted: true };
  if (isUnsupported(item.type, et)) return { text: '—', muted: true };

  const days = quotaFor(item, et);
  if (item.type === 'Maternity') {
    const wks = Math.round(days / 7);
    return { text: `${wks} wks`, muted: false };
  }
  if (item.type === 'Paternity') {
    return { text: `${days} work days`, muted: false };
  }
  return { text: String(days), muted: false };
}

/** Convert a user-entered editor value back into days for the API. */
function editorToDays(item: LeaveTypeCatalogItem, raw: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return -1;
  if (item.type === 'Maternity') return n * 7; // input is weeks
  return n; // Paternity + accrual types: input is days
}

/** The initial editor value for a given cell — weeks for Maternity, days for others. */
function daysToEditor(item: LeaveTypeCatalogItem, et: ET): string {
  const days = quotaFor(item, et);
  if (item.type === 'Maternity') return String(Math.round(days / 7));
  return String(days);
}

const ROW_ORDER: LeaveType[] = [
  'Annual',
  'Sick',
  'Casual',
  'Maternity',
  'Paternity',
  'Unpaid',
];

const LEAVE_LABEL: Record<LeaveType, string> = {
  Annual: 'Annual Leave',
  Sick: 'Sick Leave',
  Casual: 'Casual Leave',
  Maternity: 'Maternity',
  Paternity: 'Paternity',
  Unpaid: 'Unpaid Leave',
};

// ── Row ──────────────────────────────────────────────────────────────────────

function QuotaRow({ item }: { item: LeaveTypeCatalogItem }) {
  const toast = useToast();
  const updateQuota = useUpdateLeaveQuota(item.type);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<ET, string>>(() => ({
    Permanent: '',
    Contract: '',
    Intern: '',
    Probation: '',
  }));
  const [error, setError] = useState<string>('');

  const isEventBased = item.type === 'Maternity' || item.type === 'Paternity';
  const isUnpaid = item.type === 'Unpaid';
  const editable = !isUnpaid;

  function startEdit(): void {
    const next: Record<ET, string> = {
      Permanent: daysToEditor(item, 'Permanent'),
      Contract: daysToEditor(item, 'Contract'),
      Intern: daysToEditor(item, 'Intern'),
      Probation: daysToEditor(item, 'Probation'),
    };
    setDraft(next);
    setError('');
    setEditing(true);
  }

  function cancelEdit(): void {
    setEditing(false);
    setError('');
  }

  async function saveEdit(): Promise<void> {
    // Validate every editable cell
    const errs: string[] = [];
    const updates: Array<{ et: ET; days: number }> = [];

    for (const et of EMPLOYMENT_TYPES) {
      if (isUnsupported(item.type, et)) continue;
      const raw = draft[et];
      const days = editorToDays(item, raw);
      if (days < 0) {
        errs.push(`${et} must be a non-negative integer`);
        continue;
      }
      const currentDays = quotaFor(item, et);
      if (days !== currentDays) updates.push({ et, days });
    }

    if (errs.length > 0) {
      setError(errs.join(' · '));
      return;
    }

    if (updates.length === 0) {
      setEditing(false);
      return;
    }

    setError('');
    try {
      // Commit per-employment-type changes in series (single hook per call).
      for (const u of updates) {
        await updateQuota.mutateAsync({
          employmentType: u.et,
          daysPerYear: u.days,
        });
      }
      toast.success('Quotas saved', `${LEAVE_LABEL[item.type]} updated.`);
      setEditing(false);
    } catch (err) {
      toast.error(
        'Save failed',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  const pending = updateQuota.isPending;

  return (
    <tr className="hover:bg-offwhite/60">
      {/* Leave Type label */}
      <td className="px-5 py-3.5">
        {isEventBased ? (
          <>
            <span className="font-semibold text-charcoal">{item.type}</span>{' '}
            <span className="text-xs text-slate">(event-based)</span>
          </>
        ) : (
          <span className="font-semibold text-charcoal">{LEAVE_LABEL[item.type]}</span>
        )}
      </td>

      {/* Employment-type cells */}
      {EMPLOYMENT_TYPES.map((et) => {
        const cell = displayCell(item, et);
        const isCellSupported = !isUnsupported(item.type, et) && !isUnpaid;

        if (editing && isCellSupported) {
          return (
            <td key={et} className="px-4 py-3.5 text-center">
              <div className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={draft[et]}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [et]: e.target.value }))
                  }
                  disabled={pending}
                  aria-label={`${LEAVE_LABEL[item.type]} quota for ${et}`}
                  className="w-16 border border-forest rounded px-1.5 py-1 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-forest/40"
                />
                {item.type === 'Maternity' && (
                  <span className="text-xs text-slate">wks</span>
                )}
                {item.type === 'Paternity' && (
                  <span className="text-xs text-slate">d</span>
                )}
              </div>
            </td>
          );
        }

        if (isUnpaid) {
          return (
            <td
              key={et}
              className="px-4 py-3.5 text-center text-slate text-xs font-medium"
            >
              {cell.text}
            </td>
          );
        }

        return (
          <td
            key={et}
            className={
              cell.muted
                ? 'px-4 py-3.5 text-center text-slate'
                : 'px-4 py-3.5 text-center text-charcoal font-medium'
            }
          >
            {cell.text}
          </td>
        );
      })}

      {/* Edit / Save-Cancel */}
      <td className="px-4 py-3.5 text-center">
        {!editable ? null : editing ? (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={pending}
              className="bg-forest text-white hover:bg-emerald px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              {pending && <Spinner size="sm" />}
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              className="border border-sage/50 text-slate hover:bg-offwhite px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="border border-forest text-forest hover:bg-softmint px-3 py-1 rounded-lg text-xs font-semibold"
          >
            Edit
          </button>
        )}
        {editing && error && (
          <p className="text-xs text-crimson mt-1.5" role="alert">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function LeaveQuotasPanel() {
  const { data: types, isLoading, error } = useLeaveConfig();

  const orderedTypes = useMemo(() => {
    if (!types) return null;
    const byType = new Map(types.map((t) => [t.type, t]));
    return ROW_ORDER.map((t) => byType.get(t)).filter(
      (x): x is LeaveTypeCatalogItem => Boolean(x),
    );
  }, [types]);

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
        Could not load leave quotas. Please refresh.
      </div>
    );
  }

  if (!orderedTypes || orderedTypes.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-sage/20">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Leave Quotas by Employment Type
        </h3>
        <p className="text-xs text-slate mt-0.5">
          Days per year unless specified otherwise
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Leave quotas">
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
            {orderedTypes.map((item) => (
              <QuotaRow key={item.type} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
