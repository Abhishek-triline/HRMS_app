'use client';

/**
 * TaxConfigPanel — umber banner + 2 cards matching prototype lines 281–336.
 *
 * Layout:
 *   1. v1 banner   (umber callout — informational)
 *   2. Standard Reference Formula card (mono formula + 2-col inputs + footer)
 *   3. v2 Indian Tax Slab Engine card  (softmint callout — roadmap info)
 *
 * Data wiring:
 *   - referenceRate  → useTaxSettings / useUpdateTaxSettings  (PUT /config/tax)
 *   - grossTaxableBasis select → NOT in backend contract (v1); rendered as a
 *     static display-only select showing prototype options. Flagged in report.
 */

import { useEffect, useState } from 'react';
import { useTaxSettings, useUpdateTaxSettings } from '@/lib/hooks/useTaxConfig';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

export default function TaxConfigPanel() {
  const { data: settings, isLoading, isError } = useTaxSettings();
  const mutation = useUpdateTaxSettings();

  // referenceRate stored as decimal (0–1); displayed as percent
  const [ratePercent, setRatePercent] = useState<string>('9.5');

  useEffect(() => {
    if (settings) {
      setRatePercent((settings.referenceRate * 100).toFixed(1));
    }
  }, [settings]);

  async function handleSave() {
    const pct = parseFloat(ratePercent);
    if (isNaN(pct) || pct < 0 || pct > 40) {
      showToast({ type: 'error', title: 'Invalid rate', message: 'Enter a rate between 0 and 40%.' });
      return;
    }
    const decimal = parseFloat((pct / 100).toFixed(6));
    try {
      await mutation.mutateAsync({ referenceRate: decimal });
      showToast({ type: 'success', title: 'Tax rate updated', message: `New rate: ${pct.toFixed(1)}%` });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  function handleReset() {
    if (settings) {
      setRatePercent((settings.referenceRate * 100).toFixed(1));
    } else {
      setRatePercent('9.5');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" aria-label="Loading tax settings" />
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

  return (
    <div className="space-y-5">

      {/* ── 1. v1 mode banner ── */}
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
          <p className="text-sm text-charcoal font-semibold mb-0.5">v1 uses manual tax entry</p>
          <p className="text-sm text-slate">
            A configurable Indian income tax slab engine is{' '}
            <strong>not part of v1</strong> — it is on the v2 roadmap. For now, the{' '}
            <strong>PayrollOfficer enters tax manually on each payslip</strong> during the run
            review. The system shows a reference figure derived from a standard formula but the
            value is editable per payslip.
          </p>
        </div>
      </div>

      {/* ── 2. Standard Reference Formula card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          Standard Reference Formula
        </h3>
        <p className="text-xs text-slate mb-5">
          Used to suggest a tax figure when generating each payslip · PayrollOfficer can override
          per row
        </p>

        {/* Monospace formula display */}
        <div className="bg-offwhite rounded-lg p-5 mb-5 font-mono text-sm text-charcoal">
          reference_tax = gross_taxable_income &times;{' '}
          <span className="text-forest font-semibold">flat_reference_rate</span>
        </div>

        {/* 2-col inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Flat Reference Rate */}
          <div>
            <label
              htmlFor="tax-ref-rate"
              className="block text-xs font-semibold text-charcoal mb-1.5"
            >
              Flat Reference Rate
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tax-ref-rate"
                type="number"
                value={ratePercent}
                step={0.1}
                min={0}
                max={40}
                onChange={(e) => setRatePercent(e.target.value)}
                className="w-32 border border-sage/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                aria-describedby="tax-rate-hint"
              />
              <span className="text-sm text-slate">%</span>
            </div>
            <p id="tax-rate-hint" className="text-xs text-slate mt-1.5">
              Currently {ratePercent}% · used as a guide only
            </p>
          </div>

          {/* Gross Taxable Income basis — display-only; not in v1 contract */}
          <div>
            <label
              htmlFor="tax-basis"
              className="block text-xs font-semibold text-charcoal mb-1.5"
            >
              Gross Taxable Income basis
            </label>
            <select
              id="tax-basis"
              defaultValue="Gross Pay (Basic + Allowances) − Standard Deduction"
              className="w-full border border-sage/50 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
              aria-describedby="tax-basis-hint"
            >
              <option>Gross Pay (Basic + Allowances) − Standard Deduction</option>
              <option>Gross Pay (full)</option>
              <option>Basic Only</option>
            </select>
            <p id="tax-basis-hint" className="text-xs text-slate mt-1.5">
              Definition used to compute the reference figure
            </p>
          </div>
        </div>

        {/* Per-card footer */}
        <div className="mt-5 pt-4 border-t border-sage/20 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="border border-sage/50 px-4 py-2 rounded-lg text-sm font-semibold text-slate hover:bg-offwhite"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="bg-forest text-white hover:bg-emerald px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── 3. v2 — Indian Tax Slab Engine (roadmap, informational) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-1">
          v2 — Indian Tax Slab Engine
        </h3>
        <p className="text-xs text-slate mb-4">
          Planned for the next release. The engine will replace manual entry with bracket-based
          computation under the New Regime, with annual slab updates configurable by Admin.
        </p>
        <div className="bg-softmint border border-mint rounded-lg px-4 py-3 text-xs text-forest">
          <strong>Out of scope for v1:</strong> bracketed slab editor, regime selection, surcharge,
          cess, 80C/80D investments, Form 16 auto-generation. These remain manual in v1 and ship
          in v2.
        </div>
      </div>

    </div>
  );
}
