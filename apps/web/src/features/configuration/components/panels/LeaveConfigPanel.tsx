'use client';

/**
 * LeaveConfigPanel — 3-card prototype layout (prototype/admin/config.html
 * lines 180-278). Each row has an inline per-row Save button so Admin can
 * change one knob at a time without batch-saving.
 *
 * Cards (in order):
 *   1. Carry-Forward & Reset Rules
 *      · Annual cap (number 0-30, default 10)
 *      · Casual cap (number 0-20, default 5)
 *      · Sick — locked, fixed reset rule
 *   2. Entitlement Limits
 *      · Maternity (weeks, 1-52, default 26 — stored as days = weeks*7)
 *      · Paternity (working days, 1-60, default 10)
 *   3. Escalation Settings
 *      · Escalation period (1-14 working days, default 5)
 */

import { useEffect, useState } from 'react';

import type { LeaveConfig } from '@nexora/contracts/configuration';
import {
  useLeaveConfigSettings,
  useUpdateLeaveConfigSettings,
} from '@/features/admin/hooks/useLeaveConfigSettings';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function describeApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// ── Inline row with per-row Save ─────────────────────────────────────────────

function EditableRow({
  id,
  label,
  hint,
  unit,
  min,
  max,
  draft,
  setDraft,
  dirty,
  saving,
  onSave,
  isLast,
}: {
  id: string;
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: number;
  draft: string;
  setDraft: (v: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  isLast?: boolean;
}) {
  return (
    <div
      className={
        isLast
          ? 'flex items-center justify-between gap-4 py-4'
          : 'flex items-center justify-between gap-4 py-4 border-b border-sage/15'
      }
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-charcoal text-sm">{label}</p>
        <p className="text-xs text-slate mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={label}
          className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
        />
        <span className="text-xs text-slate">{unit}</span>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function LockedRow({
  label,
  hint,
  lockedText,
  isLast,
}: {
  label: string;
  hint: string;
  lockedText: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={
        isLast
          ? 'flex items-center justify-between gap-4 py-4'
          : 'flex items-center justify-between gap-4 py-4 border-b border-sage/15'
      }
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-charcoal text-sm">{label}</p>
        <p className="text-xs text-slate mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 bg-offwhite border border-sage/30 rounded-lg px-4 py-2">
          <svg
            className="w-4 h-4 text-slate"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-sm text-slate font-medium">{lockedText}</span>
        </div>
      </div>
    </div>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function LeaveConfigPanel() {
  const { data, isLoading, isError } = useLeaveConfigSettings();
  const mutation = useUpdateLeaveConfigSettings();

  // Drafts (string-typed for unrestricted typing; coerced on save)
  const [annualCapDraft, setAnnualCapDraft] = useState('10');
  const [casualCapDraft, setCasualCapDraft] = useState('5');
  const [maternityWeeksDraft, setMaternityWeeksDraft] = useState('26');
  const [paternityDaysDraft, setPaternityDaysDraft] = useState('10');
  const [escalationDraft, setEscalationDraft] = useState('5');

  // Hydrate from server
  useEffect(() => {
    if (data) {
      setAnnualCapDraft(String(data.carryForwardCaps.Annual));
      setCasualCapDraft(String(data.carryForwardCaps.Casual));
      setMaternityWeeksDraft(String(Math.round(data.maternityDays / 7)));
      setPaternityDaysDraft(String(data.paternityDays));
      setEscalationDraft(String(data.escalationPeriodDays));
    }
  }, [data]);

  // ── Dirty flags ───────────────────────────────────────────────────────────
  const annualDirty = data !== undefined && Number(annualCapDraft) !== data.carryForwardCaps.Annual;
  const casualDirty = data !== undefined && Number(casualCapDraft) !== data.carryForwardCaps.Casual;
  const maternityDirty =
    data !== undefined && Number(maternityWeeksDraft) * 7 !== data.maternityDays;
  const paternityDirty =
    data !== undefined && Number(paternityDaysDraft) !== data.paternityDays;
  const escalationDirty =
    data !== undefined && Number(escalationDraft) !== data.escalationPeriodDays;

  // ── Save helper ───────────────────────────────────────────────────────────
  async function save(body: Partial<LeaveConfig>, label: string) {
    try {
      await mutation.mutateAsync(body);
      showToast({ type: 'success', title: `${label} saved`, message: 'Settings updated successfully.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Save failed', message: describeApiError(err, 'Please try again.') });
    }
  }

  function handleSaveAnnual() {
    const n = Number(annualCapDraft);
    if (!Number.isInteger(n) || n < 0 || n > 30) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Annual cap must be 0–30 days.' });
      return;
    }
    if (!data) return;
    void save(
      {
        carryForwardCaps: { ...data.carryForwardCaps, Annual: n },
      },
      'Annual carry-forward cap',
    );
  }

  function handleSaveCasual() {
    const n = Number(casualCapDraft);
    if (!Number.isInteger(n) || n < 0 || n > 20) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Casual cap must be 0–20 days.' });
      return;
    }
    if (!data) return;
    void save(
      {
        carryForwardCaps: { ...data.carryForwardCaps, Casual: n },
      },
      'Casual carry-forward cap',
    );
  }

  function handleSaveMaternity() {
    const weeks = Number(maternityWeeksDraft);
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Maternity must be 1–52 weeks.' });
      return;
    }
    void save({ maternityDays: Math.round(weeks * 7) }, 'Maternity maximum');
  }

  function handleSavePaternity() {
    const n = Number(paternityDaysDraft);
    if (!Number.isInteger(n) || n < 1 || n > 60) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Paternity must be 1–60 working days.' });
      return;
    }
    void save({ paternityDays: n }, 'Paternity maximum');
  }

  function handleSaveEscalation() {
    const n = Number(escalationDraft);
    if (!Number.isInteger(n) || n < 1 || n > 14) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Escalation must be 1–14 working days.' });
      return;
    }
    void save({ escalationPeriodDays: n }, 'Escalation period');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" aria-label="Loading leave config" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson" role="alert">
        Could not load leave configuration. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Card 1: Carry-Forward & Reset Rules ─────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Carry-Forward &amp; Reset Rules
        </h3>
        <p className="text-xs text-slate mb-5">How unused leave is handled at year-end</p>
        <div className="space-y-1">
          <EditableRow
            id="lcp-annual-cap"
            label="Annual Leave Carry-Forward Cap"
            hint="Maximum unused Annual leave that rolls into next year · default 10"
            unit="days"
            min={0}
            max={30}
            draft={annualCapDraft}
            setDraft={setAnnualCapDraft}
            dirty={annualDirty}
            saving={mutation.isPending}
            onSave={handleSaveAnnual}
          />
          <EditableRow
            id="lcp-casual-cap"
            label="Casual Leave Carry-Forward Cap"
            hint="Maximum unused Casual leave that rolls into next year · default 5"
            unit="days"
            min={0}
            max={20}
            draft={casualCapDraft}
            setDraft={setCasualCapDraft}
            dirty={casualDirty}
            saving={mutation.isPending}
            onSave={handleSaveCasual}
          />
          <LockedRow
            label="Sick Leave"
            hint="Reset policy for sick leave"
            lockedText="Resets to zero on January 1 — fixed rule"
            isLast
          />
        </div>
      </div>

      {/* ── Card 2: Entitlement Limits ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Entitlement Limits
        </h3>
        <p className="text-xs text-slate mb-5">
          Maximums for statutory event-based leave types
        </p>
        <div className="space-y-1">
          <EditableRow
            id="lcp-maternity"
            label="Maternity Leave Maximum"
            hint="Per event · Admin-approved · default 26 weeks"
            unit="weeks"
            min={1}
            max={52}
            draft={maternityWeeksDraft}
            setDraft={setMaternityWeeksDraft}
            dirty={maternityDirty}
            saving={mutation.isPending}
            onSave={handleSaveMaternity}
          />
          <EditableRow
            id="lcp-paternity"
            label="Paternity Leave Maximum"
            hint="Per event · single block · within 6 months of birth · Admin-approved · default 10 working days"
            unit="working days"
            min={1}
            max={60}
            draft={paternityDaysDraft}
            setDraft={setPaternityDaysDraft}
            dirty={paternityDirty}
            saving={mutation.isPending}
            onSave={handleSavePaternity}
            isLast
          />
        </div>
      </div>

      {/* ── Card 3: Escalation Settings ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Escalation Settings
        </h3>
        <p className="text-xs text-slate mb-5">
          Auto-escalation of un-actioned leave requests
        </p>
        <EditableRow
          id="lcp-escalation"
          label="Escalation Period"
          hint="Working days before a request escalates to Admin · default 5 working days · never auto-approves"
          unit="working days"
          min={1}
          max={14}
          draft={escalationDraft}
          setDraft={setEscalationDraft}
          dirty={escalationDirty}
          saving={mutation.isPending}
          onSave={handleSaveEscalation}
          isLast
        />
      </div>
    </div>
  );
}
