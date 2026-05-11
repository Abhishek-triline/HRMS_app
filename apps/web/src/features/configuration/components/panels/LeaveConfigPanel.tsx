'use client';

/**
 * LeaveConfigPanel — 3 cards matching prototype/admin/config.html lines 180–278.
 *
 * Card order:
 *   1. Carry-Forward & Reset Rules   (3 rows: Annual cap / Casual cap / Sick lock)
 *   2. Entitlement Limits            (2 rows: Maternity / Paternity inline save)
 *   3. Escalation Settings           (1 row: escalation period inline save)
 *
 * Per-row Save buttons call mutateAsync with the full LeaveConfig body so the
 * existing PUT /api/v1/config/leave contract is respected.
 */

import { useEffect, useState } from 'react';
import { useLeaveConfigSettings, useUpdateLeaveConfigSettings } from '@/features/admin/hooks/useLeaveConfigSettings';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { LeaveConfig } from '@nexora/contracts/configuration';

// ── Shared inline Save button ─────────────────────────────────────────────────

function InlineSaveButton({
  onClick,
  isSaving,
}: {
  onClick: () => void;
  isSaving: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isSaving ? 'Saving…' : 'Save'}
    </button>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function LeaveConfigPanel() {
  const { data, isLoading, isError } = useLeaveConfigSettings();
  const mutation = useUpdateLeaveConfigSettings();

  // Local state mirrors each configurable field for independent per-row saves
  const [annualCap, setAnnualCap] = useState<number>(10);
  const [casualCap, setCasualCap] = useState<number>(5);
  const [maternityWeeks, setMaternityWeeks] = useState<number>(26);
  const [paternityDays, setPaternityDays] = useState<number>(10);
  const [escalationDays, setEscalationDays] = useState<number>(5);

  useEffect(() => {
    if (data) {
      setAnnualCap(data.carryForwardCaps.Annual);
      setCasualCap(data.carryForwardCaps.Casual);
      // maternityDays in contract = calendar days; show weeks (182 → 26)
      setMaternityWeeks(Math.round(data.maternityDays / 7));
      setPaternityDays(data.paternityDays);
      setEscalationDays(data.escalationPeriodDays);
    }
  }, [data]);

  // ── Helpers: build full body from current local state ──────────────────────

  function buildBody(overrides: Partial<{
    annualCap: number;
    casualCap: number;
    maternityWeeks: number;
    paternityDays: number;
    escalationDays: number;
  }>): LeaveConfig {
    const a = overrides.annualCap ?? annualCap;
    const c = overrides.casualCap ?? casualCap;
    const mw = overrides.maternityWeeks ?? maternityWeeks;
    const pd = overrides.paternityDays ?? paternityDays;
    const esc = overrides.escalationDays ?? escalationDays;

    return {
      carryForwardCaps: {
        Annual: a,
        Casual: c,
        Sick: 0,
        Unpaid: 0,
        Maternity: 0,
        Paternity: 0,
      },
      escalationPeriodDays: esc,
      maternityDays: mw * 7,
      paternityDays: pd,
    };
  }

  async function save(overrides: Parameters<typeof buildBody>[0]) {
    try {
      await mutation.mutateAsync(buildBody(overrides));
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" aria-label="Loading leave config" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson"
        role="alert"
      >
        Could not load leave configuration. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Card 1: Carry-Forward & Reset Rules ── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Carry-Forward &amp; Reset Rules
        </h3>
        <p className="text-xs text-slate mb-5">How unused leave is handled at year-end</p>

        <div className="space-y-1">

          {/* Row 1: Annual carry-forward cap */}
          <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15">
            <div className="flex-1">
              <p className="font-semibold text-charcoal text-sm">Annual Leave Carry-Forward Cap</p>
              <p className="text-xs text-slate mt-0.5">
                Maximum unused Annual leave that rolls into next year · default 10
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                value={annualCap}
                min={0}
                max={30}
                onChange={(e) => setAnnualCap(parseInt(e.target.value, 10))}
                aria-label="Annual leave carry-forward cap"
                className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30"
              />
              <span className="text-xs text-slate">days</span>
              <InlineSaveButton
                onClick={() => save({ annualCap })}
                isSaving={mutation.isPending}
              />
            </div>
          </div>

          {/* Row 2: Casual carry-forward cap */}
          <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15">
            <div className="flex-1">
              <p className="font-semibold text-charcoal text-sm">Casual Leave Carry-Forward Cap</p>
              <p className="text-xs text-slate mt-0.5">
                Maximum unused Casual leave that rolls into next year · default 5
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                value={casualCap}
                min={0}
                max={20}
                onChange={(e) => setCasualCap(parseInt(e.target.value, 10))}
                aria-label="Casual leave carry-forward cap"
                className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30"
              />
              <span className="text-xs text-slate">days</span>
              <InlineSaveButton
                onClick={() => save({ casualCap })}
                isSaving={mutation.isPending}
              />
            </div>
          </div>

          {/* Row 3: Sick leave — fixed, no input */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1">
              <p className="font-semibold text-charcoal text-sm">Sick Leave</p>
              <p className="text-xs text-slate mt-0.5">Reset policy for sick leave</p>
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
                <span className="text-sm text-slate font-medium">
                  Resets to zero on January 1 — fixed rule
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Card 2: Entitlement Limits ── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Entitlement Limits
        </h3>
        <p className="text-xs text-slate mb-5">
          Maximums for statutory event-based leave types
        </p>

        <div className="space-y-1">

          {/* Maternity */}
          <div className="flex items-center justify-between gap-4 py-4 border-b border-sage/15">
            <div className="flex-1">
              <p className="font-semibold text-charcoal text-sm">Maternity Leave Maximum</p>
              <p className="text-xs text-slate mt-0.5">Per event · Admin-approved · default 26 weeks</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                value={maternityWeeks}
                min={1}
                max={52}
                onChange={(e) => setMaternityWeeks(parseInt(e.target.value, 10))}
                aria-label="Maternity leave maximum in weeks"
                className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30"
              />
              <span className="text-xs text-slate">weeks</span>
              <InlineSaveButton
                onClick={() => save({ maternityWeeks })}
                isSaving={mutation.isPending}
              />
            </div>
          </div>

          {/* Paternity */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1">
              <p className="font-semibold text-charcoal text-sm">Paternity Leave Maximum</p>
              <p className="text-xs text-slate mt-0.5">
                Per event · single block · within 6 months of birth · Admin-approved · default 10
                working days
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                value={paternityDays}
                min={1}
                max={60}
                onChange={(e) => setPaternityDays(parseInt(e.target.value, 10))}
                aria-label="Paternity leave maximum in working days"
                className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30"
              />
              <span className="text-xs text-slate">working days</span>
              <InlineSaveButton
                onClick={() => save({ paternityDays })}
                isSaving={mutation.isPending}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Card 3: Escalation Settings ── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Escalation Settings
        </h3>
        <p className="text-xs text-slate mb-5">
          Auto-escalation of un-actioned leave requests
        </p>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex-1">
            <p className="font-semibold text-charcoal text-sm">Escalation Period</p>
            <p className="text-xs text-slate mt-0.5">
              Working days before a request escalates to Admin · default 5 working days · never
              auto-approves
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <input
              type="number"
              value={escalationDays}
              min={1}
              max={14}
              onChange={(e) => setEscalationDays(parseInt(e.target.value, 10))}
              aria-label="Escalation period in working days"
              className="w-20 border border-sage/50 rounded-lg px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
            <span className="text-xs text-slate">working days</span>
            <InlineSaveButton
              onClick={() => save({ escalationDays })}
              isSaving={mutation.isPending}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
