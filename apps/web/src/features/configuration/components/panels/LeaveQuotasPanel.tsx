'use client';

/**
 * LeaveQuotasPanel — combined leave-quotas + carry-forward + per-event matrix.
 *
 * Layout:
 *   1. Header stat strip — Accrual types · Event-based · Sick reset · Unpaid uncapped
 *   2. Single unified matrix:
 *        Leave Type · Permanent · Contract · Intern · Probation · Carry-fwd cap · Max/event · Action
 *      Each row supports a single Edit toggle that opens all 6 numeric fields at once.
 *      Event-based rows render with a soft umber tint; Unpaid renders "∞".
 *   3. Annual reset rules card — colour-coded chips per type.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import {
  useLeaveConfig,
  useUpdateLeaveType,
  useUpdateLeaveQuota,
} from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import type {
  LeaveTypeCatalogItem,
  LeaveType,
} from '@nexora/contracts/leave';

const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Intern', 'Probation'] as const;
type ET = (typeof EMPLOYMENT_TYPES)[number];

// ── Visual taxonomy per leave type ───────────────────────────────────────────

type TypeKind = 'accrual' | 'event' | 'sick' | 'unpaid';

function kindOf(item: LeaveTypeCatalogItem): TypeKind {
  if (item.type === 'Unpaid') return 'unpaid';
  if (item.type === 'Sick') return 'sick';
  if (item.isEventBased) return 'event';
  return 'accrual';
}

const TYPE_DOT: Record<LeaveType, string> = {
  Annual:    'bg-forest',
  Sick:      'bg-crimson',
  Casual:    'bg-emerald',
  Maternity: 'bg-umber',
  Paternity: 'bg-umber',
  Unpaid:    'bg-slate',
};

const KIND_TAG: Record<TypeKind, { label: string; bg: string; text: string }> = {
  accrual: { label: 'Accrual',     bg: 'bg-greenbg',   text: 'text-richgreen' },
  event:   { label: 'Event-based', bg: 'bg-umberbg',   text: 'text-umber' },
  sick:    { label: 'Sick · Reset', bg: 'bg-crimsonbg', text: 'text-crimson' },
  unpaid:  { label: 'Uncapped',    bg: 'bg-sage/30',   text: 'text-slate' },
};

// ── Row component ────────────────────────────────────────────────────────────

function QuotaRow({ item }: { item: LeaveTypeCatalogItem }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const updateType = useUpdateLeaveType(item.type);
  const updateQuota = useUpdateLeaveQuota(item.type);

  const kind = kindOf(item);
  const tag = KIND_TAG[kind];

  // Pre-populate draft when entering edit mode.
  function startEdit() {
    const initial: Record<string, string> = {};
    EMPLOYMENT_TYPES.forEach((et) => {
      const q = item.quotas.find((x) => x.employmentType === et);
      initial[et] = q?.daysPerYear !== undefined ? String(q.daysPerYear) : '';
    });
    initial['__cf'] = item.carryForwardCap !== null ? String(item.carryForwardCap) : '';
    initial['__me'] = item.maxDaysPerEvent !== null ? String(item.maxDaysPerEvent) : '';
    setDraft(initial);
    setEditing(true);
  }

  async function saveAll() {
    // Validate
    const errs: string[] = [];
    for (const et of EMPLOYMENT_TYPES) {
      const v = draft[et];
      if (v === '' || v === undefined) continue;
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 0) errs.push(`${et} must be a non-negative integer`);
    }
    if (draft['__cf'] !== '') {
      const n = parseInt(draft['__cf'] ?? '', 10);
      if (isNaN(n) || n < 0) errs.push('Carry-forward cap must be a non-negative integer');
    }
    if (draft['__me'] !== '') {
      const n = parseInt(draft['__me'] ?? '', 10);
      if (isNaN(n) || n < 0) errs.push('Max days per event must be a non-negative integer');
    }
    if (errs.length) {
      toast.error('Invalid input', errs.join(' · '));
      return;
    }

    try {
      // Per-employment-type quotas
      for (const et of EMPLOYMENT_TYPES) {
        const before = item.quotas.find((x) => x.employmentType === et);
        const v = draft[et];
        if (v === '' || v === undefined) continue;
        const n = parseInt(v, 10);
        if (before?.daysPerYear !== n) {
          await updateQuota.mutateAsync({ employmentType: et, daysPerYear: n });
        }
      }

      // Type-level config
      const body: { carryForwardCap?: number | null; maxDaysPerEvent?: number | null } = {};
      const cf = draft['__cf'];
      if (cf !== '' && cf !== undefined) {
        const n = parseInt(cf, 10);
        if (item.carryForwardCap !== n) body.carryForwardCap = n;
      }
      const me = draft['__me'];
      if (me !== '' && me !== undefined) {
        const n = parseInt(me, 10);
        if (item.maxDaysPerEvent !== n) body.maxDaysPerEvent = n;
      }
      if (Object.keys(body).length) {
        await updateType.mutateAsync(body);
      }

      toast.success('Saved', `${item.type} leave configuration updated.`);
      setEditing(false);
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  const pending = updateType.isPending || updateQuota.isPending;
  const rowTint =
    kind === 'event'
      ? 'bg-umberbg/20'
      : kind === 'sick'
      ? 'bg-crimsonbg/20'
      : '';

  return (
    <tr className={clsx('transition-colors hover:bg-offwhite/60', rowTint)}>
      {/* Leave type */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className={clsx('w-2 h-2 rounded-full flex-shrink-0', TYPE_DOT[item.type])}
            aria-hidden="true"
          />
          <div>
            <div className="font-semibold text-charcoal text-sm">{item.type}</div>
            <div className="mt-0.5">
              <span className={clsx('inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', tag.bg, tag.text)}>
                {tag.label}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Per-employment quotas */}
      {EMPLOYMENT_TYPES.map((et) => {
        const q = item.quotas.find((x) => x.employmentType === et);
        if (item.type === 'Unpaid') {
          return (
            <td key={et} className="px-3 py-4 text-center">
              <span className="text-slate text-base" aria-label="Unlimited">∞</span>
            </td>
          );
        }
        return (
          <td key={et} className="px-3 py-4 text-center">
            {editing ? (
              <input
                type="number"
                min={0}
                value={draft[et] ?? ''}
                onChange={(e) => setDraft({ ...draft, [et]: e.target.value })}
                aria-label={`${item.type} quota for ${et}`}
                className="w-16 border border-forest rounded px-1.5 py-1 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-forest/40"
              />
            ) : q?.daysPerYear !== undefined ? (
              <span className="font-semibold text-charcoal">{q.daysPerYear}</span>
            ) : (
              <span className="text-slate text-xs">—</span>
            )}
          </td>
        );
      })}

      {/* Carry-forward cap */}
      <td className="px-3 py-4 text-center">
        {editing && !item.isEventBased && item.type !== 'Unpaid' ? (
          <input
            type="number"
            min={0}
            value={draft['__cf'] ?? ''}
            onChange={(e) => setDraft({ ...draft, __cf: e.target.value })}
            aria-label={`${item.type} carry-forward cap`}
            className="w-16 border border-forest rounded px-1.5 py-1 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-forest/40"
          />
        ) : item.carryForwardCap !== null ? (
          <span className="font-semibold text-charcoal">{item.carryForwardCap}</span>
        ) : (
          <span className="text-slate text-xs">—</span>
        )}
      </td>

      {/* Max days per event */}
      <td className="px-3 py-4 text-center">
        {editing && item.isEventBased ? (
          <input
            type="number"
            min={0}
            value={draft['__me'] ?? ''}
            onChange={(e) => setDraft({ ...draft, __me: e.target.value })}
            aria-label={`${item.type} max days per event`}
            className="w-20 border border-forest rounded px-1.5 py-1 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-forest/40"
          />
        ) : item.maxDaysPerEvent !== null ? (
          <span className="font-semibold text-charcoal">{item.maxDaysPerEvent}</span>
        ) : (
          <span className="text-slate text-xs">—</span>
        )}
      </td>

      {/* Action */}
      <td className="px-4 py-4 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="primary" loading={pending} onClick={saveAll}>
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 text-forest hover:text-emerald text-xs font-semibold border border-sage/50 hover:border-forest rounded-lg px-3 py-1.5 transition-colors"
            aria-label={`Edit ${item.type} leave configuration`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Stat strip (top of panel) ───────────────────────────────────────────────

function StatStrip({ items }: { items: LeaveTypeCatalogItem[] }) {
  const accrualCount = items.filter((x) => !x.isEventBased && x.type !== 'Unpaid').length;
  const eventCount = items.filter((x) => x.isEventBased).length;
  const hasSick = items.some((x) => x.type === 'Sick');
  const hasUnpaid = items.some((x) => x.type === 'Unpaid');

  const tiles: Array<{ label: string; value: string; sub: string; dot: string }> = [
    {
      label: 'Accrual types',
      value: String(accrualCount),
      sub: 'Annual reset Jan 1',
      dot: 'bg-forest',
    },
    {
      label: 'Event-based',
      value: String(eventCount),
      sub: 'Maternity · Paternity',
      dot: 'bg-umber',
    },
    {
      label: 'Sick policy',
      value: hasSick ? 'Reset' : '—',
      sub: 'Resets to 0 on Jan 1',
      dot: 'bg-crimson',
    },
    {
      label: 'Unpaid',
      value: hasUnpaid ? '∞' : '—',
      sub: 'No cap · always available',
      dot: 'bg-slate',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-white rounded-xl shadow-sm border border-sage/30 px-5 py-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx('w-1.5 h-1.5 rounded-full', t.dot)} aria-hidden="true" />
            <div className="text-[11px] font-semibold text-slate uppercase tracking-widest">
              {t.label}
            </div>
          </div>
          <div className="font-heading text-3xl font-bold text-charcoal leading-none">
            {t.value}
          </div>
          <div className="text-xs text-slate mt-2">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function LeaveQuotasPanel() {
  const { data: types, isLoading, error } = useLeaveConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" aria-label="Loading leave configuration" />
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

  if (!types) return null;

  return (
    <div className="space-y-6">
      <StatStrip items={types} />

      {/* Unified matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-sage/20 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-charcoal text-base">
              Leave Quotas Matrix
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Days per employment type · plus carry-forward cap (accrual) and max days
              per event (event-based). Click <strong>Edit</strong> to change all fields
              for a leave type at once.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-umberbg/80 border border-umber/30" />
              event-based
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-crimsonbg/70 border border-crimson/30" />
              fixed reset
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Leave quotas matrix">
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
                    className="text-center px-3 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                  >
                    {et}
                  </th>
                ))}
                <th
                  scope="col"
                  className="text-center px-3 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                >
                  Carry-fwd
                </th>
                <th
                  scope="col"
                  className="text-center px-3 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                >
                  Max / event
                </th>
                <th
                  scope="col"
                  className="text-right px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {types.map((item) => (
                <QuotaRow key={item.type} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual reset rules */}
      <div className="bg-softmint border border-mint rounded-xl p-5">
        <h3 className="font-heading text-sm font-semibold text-forest mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Annual Reset Rules (1 January)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-forest mt-1.5 flex-shrink-0" />
            <p className="text-slate">
              <span className="font-semibold text-charcoal">Annual &amp; Casual:</span>{' '}
              carried forward up to the configured cap (BL-013).
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-crimson mt-1.5 flex-shrink-0" />
            <p className="text-slate">
              <span className="font-semibold text-charcoal">Sick:</span> resets to zero
              on Jan 1 — no carry-forward (BL-012).
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-umber mt-1.5 flex-shrink-0" />
            <p className="text-slate">
              <span className="font-semibold text-charcoal">Maternity &amp; Paternity:</span>{' '}
              event-based — not affected by annual reset (BL-014).
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-slate mt-1.5 flex-shrink-0" />
            <p className="text-slate">
              <span className="font-semibold text-charcoal">Unpaid:</span> always
              available — no accrual or reset.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
