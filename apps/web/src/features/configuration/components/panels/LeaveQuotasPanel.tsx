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
 * v2: LeaveTypeCatalogItem uses `id: number`, `name: string`, and quotas use
 *     `employmentTypeId: number` (not `employmentType: string`).
 */

import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  useLeaveConfig,
  useUpdateLeaveQuota,
} from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import { LEAVE_TYPE_ID, EMPLOYMENT_TYPE_MAP } from '@/lib/status/maps';
import type { LeaveTypeCatalogItem } from '@nexora/contracts/leave';

// Employment type IDs in display order: 1=Permanent, 2=Contract, 4=Intern, 3=Probation
const EMPLOYMENT_TYPE_IDS = [1, 2, 4, 3] as const;
type ETId = (typeof EMPLOYMENT_TYPE_IDS)[number];

// Ordered leave type IDs for table rows
const ROW_ORDER_IDS = [
  LEAVE_TYPE_ID.Annual,
  LEAVE_TYPE_ID.Sick,
  LEAVE_TYPE_ID.Casual,
  LEAVE_TYPE_ID.Maternity,
  LEAVE_TYPE_ID.Paternity,
  LEAVE_TYPE_ID.Unpaid,
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function quotaFor(item: LeaveTypeCatalogItem, etId: ETId): number {
  const q = item.quotas.find((x) => x.employmentTypeId === etId);
  return q?.daysPerYear ?? 0;
}

/** Maternity/Paternity slots that are NOT available for that employment type. */
function isUnsupported(leaveTypeId: number, etId: ETId): boolean {
  if (leaveTypeId === LEAVE_TYPE_ID.Maternity) return etId === 4 || etId === 3; // Intern or Probation
  if (leaveTypeId === LEAVE_TYPE_ID.Paternity) return etId === 4; // Intern only
  return false;
}

function displayCell(item: LeaveTypeCatalogItem, etId: ETId): {
  text: string;
  muted: boolean;
} {
  if (item.id === LEAVE_TYPE_ID.Unpaid) return { text: 'Unlimited', muted: true };
  if (isUnsupported(item.id, etId)) return { text: '—', muted: true };

  const days = quotaFor(item, etId);
  if (item.id === LEAVE_TYPE_ID.Maternity) {
    const wks = Math.round(days / 7);
    return { text: `${wks} wks`, muted: false };
  }
  if (item.id === LEAVE_TYPE_ID.Paternity) {
    return { text: `${days} work days`, muted: false };
  }
  return { text: String(days), muted: false };
}

/** Convert a user-entered editor value back into days for the API. */
function editorToDays(leaveTypeId: number, raw: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return -1;
  if (leaveTypeId === LEAVE_TYPE_ID.Maternity) return n * 7; // input is weeks
  return n; // Paternity + accrual types: input is days
}

/** The initial editor value for a given cell — weeks for Maternity, days for others. */
function daysToEditor(item: LeaveTypeCatalogItem, etId: ETId): string {
  const days = quotaFor(item, etId);
  if (item.id === LEAVE_TYPE_ID.Maternity) return String(Math.round(days / 7));
  return String(days);
}

// ── Row ──────────────────────────────────────────────────────────────────────

function QuotaRow({ item }: { item: LeaveTypeCatalogItem }) {
  const toast = useToast();
  const updateQuota = useUpdateLeaveQuota(item.id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<ETId, string>>(() => ({
    1: '', 2: '', 3: '', 4: '',
  }));
  const [error, setError] = useState<string>('');

  const isEventBased = item.isEventBased;
  const isUnpaid = item.id === LEAVE_TYPE_ID.Unpaid;
  const editable = !isUnpaid;

  function startEdit(): void {
    const next: Record<ETId, string> = {
      1: daysToEditor(item, 1),
      2: daysToEditor(item, 2),
      3: daysToEditor(item, 3),
      4: daysToEditor(item, 4),
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
    const errs: string[] = [];
    const updates: Array<{ etId: ETId; days: number }> = [];

    for (const etId of EMPLOYMENT_TYPE_IDS) {
      if (isUnsupported(item.id, etId)) continue;
      const raw = draft[etId];
      const days = editorToDays(item.id, raw);
      if (days < 0) {
        errs.push(`${EMPLOYMENT_TYPE_MAP[etId]?.label ?? etId} must be a non-negative integer`);
        continue;
      }
      const currentDays = quotaFor(item, etId);
      if (days !== currentDays) updates.push({ etId, days });
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
      for (const u of updates) {
        await updateQuota.mutateAsync({
          employmentTypeId: u.etId,
          daysPerYear: u.days,
        });
      }
      toast.success('Quotas saved', `${item.name} quotas updated.`);
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
            <span className="font-semibold text-charcoal">{item.name}</span>{' '}
            <span className="text-xs text-slate">(event-based)</span>
          </>
        ) : (
          <span className="font-semibold text-charcoal">{item.name}</span>
        )}
      </td>

      {/* Employment-type cells */}
      {EMPLOYMENT_TYPE_IDS.map((etId) => {
        const cell = displayCell(item, etId);
        const isCellSupported = !isUnsupported(item.id, etId) && !isUnpaid;

        if (editing && isCellSupported) {
          return (
            <td key={etId} className="px-4 py-3.5 text-center">
              <div className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={draft[etId]}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [etId]: e.target.value }))
                  }
                  disabled={pending}
                  aria-label={`${item.name} quota for ${EMPLOYMENT_TYPE_MAP[etId]?.label ?? etId}`}
                  className="w-16 border border-forest rounded px-1.5 py-1 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-forest/40"
                />
                {item.id === LEAVE_TYPE_ID.Maternity && (
                  <span className="text-xs text-slate">wks</span>
                )}
                {item.id === LEAVE_TYPE_ID.Paternity && (
                  <span className="text-xs text-slate">d</span>
                )}
              </div>
            </td>
          );
        }

        if (isUnpaid) {
          return (
            <td
              key={etId}
              className="px-4 py-3.5 text-center text-slate text-xs font-medium"
            >
              {cell.text}
            </td>
          );
        }

        return (
          <td
            key={etId}
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
    const byId = new Map(types.map((t) => [t.id, t]));
    return ROW_ORDER_IDS.map((id) => byId.get(id)).filter(
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
              {EMPLOYMENT_TYPE_IDS.map((etId) => (
                <th
                  key={etId}
                  scope="col"
                  className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                >
                  {EMPLOYMENT_TYPE_MAP[etId]?.label ?? etId}
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
              <QuotaRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
