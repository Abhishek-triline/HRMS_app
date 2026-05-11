'use client';

/**
 * TaxConfigPanel — prototype-literal rebuild for /admin/configuration · Tax tab.
 *
 * Layout (matches prototype lines 281-336):
 *   1. v1 mode banner (umberbg/40 card with info-circle icon)
 *   2. Standard Reference Formula card
 *        - Monospace formula display in offwhite box
 *        - 2-col grid: Flat Reference Rate (%) + Gross Taxable Income basis (select)
 *        - Reset / Save footer aligned right
 *   3. v2 roadmap card with softmint/mint callout
 *
 * Backend hooks: useTaxSettings / useUpdateTaxSettings (PATCH /config/tax).
 * The basis is display-only in v1 — the engine still uses gross × rate.
 */

import { useEffect, useState } from 'react';
import { useTaxSettings, useUpdateTaxSettings } from '@/lib/hooks/useTaxConfig';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type {
  GrossTaxableBasis,
  UpdateTaxSettingsRequest,
} from '@nexora/contracts/payroll';

// ── Basis option metadata ────────────────────────────────────────────────────

const BASIS_OPTIONS: ReadonlyArray<{ value: GrossTaxableBasis; label: string }> = [
  { value: 'GrossMinusStandardDeduction', label: 'Gross Pay (Basic + Allowances) − Standard Deduction' },
  { value: 'GrossFull', label: 'Gross Pay (full)' },
  { value: 'BasicOnly', label: 'Basic Only' },
];

function rateDecimalToPercentStr(decimal: number): string {
  // Normalise to a tidy display — strip trailing zeros, keep up to 4 dp.
  return String(+(decimal * 100).toFixed(4));
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function TaxConfigPanel() {
  const { data: settings, isLoading, isError } = useTaxSettings();
  const mutation = useUpdateTaxSettings();

  const [ratePercent, setRatePercent] = useState<string>('');
  const [basis, setBasis] = useState<GrossTaxableBasis>('GrossMinusStandardDeduction');
  const [validationError, setValidationError] = useState<string>('');

  // Sync local edit state with server values when they arrive / refresh.
  useEffect(() => {
    if (settings) {
      setRatePercent(rateDecimalToPercentStr(settings.referenceRate));
      setBasis(settings.grossTaxableBasis);
      setValidationError('');
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner />
        <span className="ml-2 text-sm text-slate">Loading tax settings…</span>
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div
        className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson"
        role="alert"
      >
        Failed to load tax settings. Please refresh.
      </div>
    );
  }

  const savedPercent = rateDecimalToPercentStr(settings.referenceRate);
  const dirty =
    ratePercent !== savedPercent || basis !== settings.grossTaxableBasis;

  function handleReset(): void {
    if (!settings) return;
    setRatePercent(rateDecimalToPercentStr(settings.referenceRate));
    setBasis(settings.grossTaxableBasis);
    setValidationError('');
  }

  async function handleSave(): Promise<void> {
    if (!settings) return;

    const body: UpdateTaxSettingsRequest = {};

    if (ratePercent !== savedPercent) {
      const pct = parseFloat(ratePercent);
      if (isNaN(pct) || pct < 0 || pct > 40) {
        setValidationError('Enter a rate between 0 and 40%.');
        return;
      }
      body.referenceRate = parseFloat((pct / 100).toFixed(6));
    }

    if (basis !== settings.grossTaxableBasis) {
      body.grossTaxableBasis = basis;
    }

    if (Object.keys(body).length === 0) return;

    setValidationError('');
    try {
      await mutation.mutateAsync(body);
      showToast({
        type: 'success',
        title: 'Tax settings updated',
        message:
          body.referenceRate !== undefined
            ? `Reference rate saved at ${(body.referenceRate * 100).toFixed(2)}%.`
            : 'Gross taxable basis saved.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  const saving = mutation.isPending;

  return (
    <div className="space-y-5">
      {/* v1 mode banner ─────────────────────────────────────────────────── */}
      <div className="bg-umberbg/40 border border-umber/40 rounded-xl px-5 py-4 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-umber shrink-0 mt-0.5"
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
        <div>
          <p className="text-sm text-charcoal font-semibold mb-0.5">
            v1 uses manual tax entry
          </p>
          <p className="text-sm text-slate">
            A configurable Indian income tax slab engine is{' '}
            <strong>not part of v1</strong> — it is on the v2 roadmap. For now,
            the <strong>PayrollOfficer enters tax manually on each payslip</strong>{' '}
            during the run review. The system shows a reference figure derived
            from a standard formula but the value is editable per payslip.
          </p>
        </div>
      </div>

      {/* Standard Reference Formula card ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Standard Reference Formula
        </h3>
        <p className="text-xs text-slate mb-5">
          Used to suggest a tax figure when generating each payslip ·
          PayrollOfficer can override per row
        </p>

        <div className="bg-offwhite rounded-lg p-5 mb-5 font-mono text-sm text-charcoal">
          reference_tax = gross_taxable_income ×{' '}
          <span className="text-forest font-semibold">flat_reference_rate</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="tax-flat-rate"
              className="block text-xs font-semibold text-charcoal mb-1.5"
            >
              Flat Reference Rate
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tax-flat-rate"
                type="number"
                value={ratePercent}
                step={0.1}
                min={0}
                max={40}
                onChange={(e) => setRatePercent(e.target.value)}
                disabled={saving}
                className="w-32 border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                aria-describedby="tax-flat-rate-hint"
              />
              <span className="text-sm text-slate" aria-hidden="true">%</span>
            </div>
            <p id="tax-flat-rate-hint" className="text-xs text-slate mt-1.5">
              Currently {savedPercent}% · used as a guide only
            </p>
            {validationError && (
              <p className="text-xs text-crimson mt-1.5" role="alert">
                {validationError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="tax-basis"
              className="block text-xs font-semibold text-charcoal mb-1.5"
            >
              Gross Taxable Income basis
            </label>
            <select
              id="tax-basis"
              value={basis}
              onChange={(e) => setBasis(e.target.value as GrossTaxableBasis)}
              disabled={saving}
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
              aria-describedby="tax-basis-hint"
            >
              {BASIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p id="tax-basis-hint" className="text-xs text-slate mt-1.5">
              Definition used to compute the reference figure
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-sage/20 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || !dirty}
            className="border border-sage/50 px-4 py-2 rounded-lg text-sm font-semibold text-slate hover:bg-offwhite disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {saving && <Spinner size="sm" />}
            Save
          </button>
        </div>
      </div>

      {/* v2 roadmap card ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          v2 — Indian Tax Slab Engine
        </h3>
        <p className="text-xs text-slate mb-4">
          Planned for the next release. The engine will replace manual entry
          with bracket-based computation under the New Regime, with annual slab
          updates configurable by Admin.
        </p>
        <div className="bg-softmint border border-mint rounded-lg px-4 py-3 text-xs text-forest">
          <strong>Out of scope for v1:</strong> bracketed slab editor, regime
          selection, surcharge, cess, 80C/80D investments, Form 16
          auto-generation. These remain manual in v1 and ship in v2.
        </div>
      </div>
    </div>
  );
}
