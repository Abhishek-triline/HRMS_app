'use client';

/**
 * LeaveConfigPanel — 3-card prototype layout + Encashment subsection.
 *
 * Cards (in order):
 *   1. Carry-Forward & Reset Rules
 *   2. Entitlement Limits
 *   3. Escalation Settings
 *   4. Encashment Window (new — BL-LE-04)
 */

import { useEffect, useState } from 'react';

import type { LeaveConfig } from '@nexora/contracts/configuration';
import {
  useLeaveConfigSettings,
  useUpdateLeaveConfigSettings,
} from '@/features/admin/hooks/useLeaveConfigSettings';
import { useEncashmentConfigSettings, useUpdateEncashmentConfigSettings } from '@/features/admin/hooks/useEncashmentConfigSettings';
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

      {/* ── Card 4: Encashment Window ─────────────────────────────────────── */}
      <EncashmentConfigSection />
    </div>
  );
}

// ── Encashment subsection ─────────────────────────────────────────────────────

function EncashmentConfigSection() {
  const { data, isLoading, isError } = useEncashmentConfigSettings();
  const mutation = useUpdateEncashmentConfigSettings();

  const [startMonthDraft, setStartMonthDraft] = useState('12');
  const [endMonthDraft, setEndMonthDraft] = useState('1');
  const [endDayDraft, setEndDayDraft] = useState('15');
  const [maxPercentDraft, setMaxPercentDraft] = useState('50');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (data) {
      setStartMonthDraft(String(data.windowStartMonth));
      setEndMonthDraft(String(data.windowEndMonth));
      setEndDayDraft(String(data.windowEndDay));
      setMaxPercentDraft(String(data.maxPercent));
    }
  }, [data]);

  const startMonthDirty = data !== undefined && Number(startMonthDraft) !== data.windowStartMonth;
  const endMonthDirty = data !== undefined && Number(endMonthDraft) !== data.windowEndMonth;
  const endDayDirty = data !== undefined && Number(endDayDraft) !== data.windowEndDay;
  const maxPercentDirty = data !== undefined && Number(maxPercentDraft) !== data.maxPercent;

  function validate(key: string, val: number): string | null {
    switch (key) {
      case 'startMonth':
        if (!Number.isInteger(val) || val < 1 || val > 12) return 'Month must be 1-12.';
        break;
      case 'endMonth':
        if (!Number.isInteger(val) || val < 1 || val > 12) return 'Month must be 1-12.';
        if (data && val === data.windowStartMonth) return 'End month must differ from start month.';
        break;
      case 'endDay':
        if (!Number.isInteger(val) || val < 1 || val > 31) return 'Day must be 1-31.';
        break;
      case 'maxPercent':
        if (!Number.isInteger(val) || val < 1 || val > 100) return 'Percent must be 1-100.';
        break;
    }
    return null;
  }

  async function saveKey(key: string, val: number, label: string) {
    const err = validate(key, val);
    if (err) { showToast({ type: 'error', title: 'Invalid value', message: err }); return; }
    try {
      await mutation.mutateAsync(
        key === 'startMonth' ? { windowStartMonth: val }
        : key === 'endMonth' ? { windowEndMonth: val }
        : key === 'endDay' ? { windowEndDay: val }
        : { maxPercent: val },
      );
      showToast({ type: 'success', title: `${label} saved`, message: 'Settings updated.' });
    } catch (err2) {
      showToast({ type: 'error', title: 'Save failed', message: err2 instanceof ApiError ? err2.message : 'Please try again.' });
    }
  }

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sage/30">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-offwhite/50 transition-colors rounded-xl"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="font-heading text-base font-semibold text-charcoal">Encashment Window</h3>
          <p className="text-xs text-slate mt-0.5">
            Configure the annual leave encashment request window and maximum percentage (BL-LE-04)
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-slate transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-1 border-t border-sage/15">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" aria-label="Loading encashment config" />
            </div>
          )}
          {isError && (
            <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-4 py-3 text-sm text-crimson mt-4" role="alert">
              Could not load encashment configuration. Please refresh.
            </div>
          )}
          {!isLoading && !isError && data && (
            <div className="pt-2 space-y-1">
              {/* Window open month */}
              <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal text-sm">Window Start Month</p>
                  <p className="text-xs text-slate mt-0.5">
                    Month in which employees can start submitting encashment requests · default December (12)
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={startMonthDraft}
                    onChange={(e) => setStartMonthDraft(e.target.value)}
                    aria-label="Window start month"
                    className="border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => saveKey('startMonth', Number(startMonthDraft), 'Window start month')}
                    disabled={!startMonthDirty || mutation.isPending}
                    className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {mutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Window end month */}
              <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal text-sm">Window End Month</p>
                  <p className="text-xs text-slate mt-0.5">
                    Month in which the window closes · must differ from start · default January (1)
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={endMonthDraft}
                    onChange={(e) => setEndMonthDraft(e.target.value)}
                    aria-label="Window end month"
                    className="border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m} ({i + 1})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => saveKey('endMonth', Number(endMonthDraft), 'Window end month')}
                    disabled={!endMonthDirty || mutation.isPending}
                    className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {mutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Window end day */}
              <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal text-sm">Window End Day</p>
                  <p className="text-xs text-slate mt-0.5">
                    Day of the end month at which the window closes · default 15
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={endDayDraft}
                    onChange={(e) => setEndDayDraft(e.target.value)}
                    aria-label="Window end day"
                    className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                  <button
                    type="button"
                    onClick={() => saveKey('endDay', Number(endDayDraft), 'Window end day')}
                    disabled={!endDayDirty || mutation.isPending}
                    className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {mutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Max percent */}
              <div className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal text-sm">Maximum Encashable Percent</p>
                  <p className="text-xs text-slate mt-0.5">
                    Maximum % of Annual balance an employee can encash per year · default 50 · server clamps approved days
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxPercentDraft}
                    onChange={(e) => setMaxPercentDraft(e.target.value)}
                    aria-label="Maximum encashable percent"
                    className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                  <span className="text-xs text-slate">%</span>
                  <button
                    type="button"
                    onClick={() => saveKey('maxPercent', Number(maxPercentDraft), 'Max encashable percent')}
                    disabled={!maxPercentDirty || mutation.isPending}
                    className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {mutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
