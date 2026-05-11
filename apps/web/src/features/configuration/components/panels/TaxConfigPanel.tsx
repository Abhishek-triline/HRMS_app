'use client';

/**
 * TaxConfigPanel — inline version of /admin/tax-config.
 * Renders the tax settings without page-level chrome.
 * Used inside ConfigTabs.
 */

import { useState } from 'react';
import { useTaxSettings, useUpdateTaxSettings } from '@/lib/hooks/useTaxConfig';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';

function RateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-48">
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-sage/60 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/20 pr-8"
        aria-label="Reference tax rate in percent"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate text-sm select-none" aria-hidden="true">%</span>
    </div>
  );
}

export default function TaxConfigPanel() {
  const { data: settings, isLoading, isError } = useTaxSettings();
  const mutation = useUpdateTaxSettings();

  const [editing, setEditing] = useState(false);
  const [ratePercent, setRatePercent] = useState('');
  const [validationError, setValidationError] = useState('');

  function startEdit() {
    if (settings) {
      setRatePercent(String(+(settings.referenceRate * 100).toFixed(4)));
    }
    setEditing(true);
    setValidationError('');
  }

  function cancelEdit() {
    setEditing(false);
    setValidationError('');
  }

  async function handleSave() {
    const pct = parseFloat(ratePercent);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setValidationError('Enter a valid rate between 0 and 100%.');
      return;
    }
    const decimal = parseFloat((pct / 100).toFixed(6));
    try {
      await mutation.mutateAsync({ referenceRate: decimal });
      showToast({ type: 'success', title: 'Tax rate updated', message: `New rate: ${pct.toFixed(2)}%` });
      setEditing(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

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
      <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-5 py-4 text-sm text-crimson" role="alert">
        Failed to load tax settings. Please refresh.
      </div>
    );
  }

  const displayRate = (settings.referenceRate * 100).toFixed(2);

  return (
    <div className="max-w-2xl">
      {/* v1 note */}
      <div className="bg-mint/20 border border-forest/20 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-forest shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-forest">Version 1 — Manual Reference Rate Only</p>
          <p className="text-xs text-forest/80 mt-1">
            The system computes a reference tax per payslip as: <strong>Gross × Reference Rate</strong>.
            The Payroll Officer reviews and may override the final tax per payslip before finalisation.
            The Indian income-tax slab engine (with deductions, HRA exemptions, etc.) is planned for v2.
          </p>
        </div>
      </div>

      {/* Current rate card */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">Current Reference Rate</p>
            <p className="font-heading text-4xl font-bold text-charcoal">{displayRate}%</p>
            <p className="text-xs text-slate mt-2">
              Every payslip reference figure = Gross × {displayRate}%
            </p>
            {settings.updatedBy && (
              <p className="text-xs text-slate mt-1.5">
                Last updated by <span className="font-semibold text-charcoal">{settings.updatedBy}</span>
                {settings.updatedAt && (
                  <span> · {new Date(settings.updatedAt).toLocaleDateString('en-IN')}</span>
                )}
              </p>
            )}
          </div>
          {!editing && (
            <Button variant="secondary" onClick={startEdit}>
              Edit Rate
            </Button>
          )}
        </div>

        {editing && (
          <div className="mt-6 pt-5 border-t border-sage/20">
            <p className="text-sm font-semibold text-charcoal mb-3">New Reference Rate</p>
            <div className="flex items-start gap-3">
              <div>
                <RateInput value={ratePercent} onChange={setRatePercent} />
                {validationError && (
                  <p className="text-xs text-crimson mt-1.5">{validationError}</p>
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={mutation.isPending}
                disabled={mutation.isPending}
              >
                Save
              </Button>
              <Button variant="secondary" onClick={cancelEdit} disabled={mutation.isPending}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-slate mt-2">
              Rate applies to all future payslip reference calculations. Existing finalised payslips are unaffected (BL-031).
            </p>
          </div>
        )}
      </div>

      {/* Example preview */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 p-6">
        <h3 className="font-heading text-sm font-semibold text-charcoal mb-3">Example Calculation</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Gross Salary (example)', value: '₹1,00,000' },
            { label: `Tax Reference (× ${displayRate}%)`, value: `₹${(100000 * settings.referenceRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
            { label: 'PO may adjust to', value: 'any value ≥ ₹0' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-sage/10 last:border-0">
              <span className="text-slate">{label}</span>
              <span className="font-semibold text-charcoal">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
