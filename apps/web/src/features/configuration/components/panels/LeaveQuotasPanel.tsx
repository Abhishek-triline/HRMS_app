'use client';

/**
 * LeaveQuotasPanel — inline version of /admin/leave-config.
 * Renders the leave quota matrix and carry-forward caps without page-level chrome.
 * Used inside ConfigTabs.
 */

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useLeaveConfig, useUpdateLeaveType, useUpdateLeaveQuota } from '@/lib/hooks/useLeave';
import { useToast } from '@/lib/hooks/useToast';
import type { LeaveTypeCatalogItem, LeaveType } from '@nexora/contracts/leave';

const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Intern', 'Probation'] as const;
type ET = typeof EMPLOYMENT_TYPES[number];

// ── Quota cell (inline edit) ──────────────────────────────────────────────────

function QuotaCell({
  type,
  empType,
  currentValue,
}: {
  type: LeaveType;
  empType: ET;
  currentValue: number | null;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(currentValue !== null ? String(currentValue) : '');
  const updateQuota = useUpdateLeaveQuota(type);

  async function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Invalid value', 'Enter a non-negative integer.');
      return;
    }
    try {
      await updateQuota.mutateAsync({ employmentType: empType, daysPerYear: parsed });
      toast.success('Quota updated', `${type} leave quota for ${empType} set to ${parsed} days.`);
      setEditing(false);
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  if (currentValue === null) {
    return <span className="text-slate text-xs">—</span>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`${type} quota for ${empType}`}
          className="w-14 border border-forest rounded px-1.5 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-forest/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={updateQuota.isPending}
          aria-label="Save"
          className="text-richgreen hover:text-forest min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {updateQuota.isPending ? <Spinner size="sm" /> : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
          className="text-slate hover:text-crimson min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="font-semibold text-charcoal hover:text-forest hover:underline transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label={`Edit ${type} quota for ${empType} (currently ${currentValue})`}
    >
      {currentValue}
    </button>
  );
}

// ── Type config row ───────────────────────────────────────────────────────────

function TypeConfigRow({ item }: { item: LeaveTypeCatalogItem }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [cfCap, setCfCap] = useState<string>(
    item.carryForwardCap !== null ? String(item.carryForwardCap) : '',
  );
  const [maxEvent, setMaxEvent] = useState<string>(
    item.maxDaysPerEvent !== null ? String(item.maxDaysPerEvent) : '',
  );
  const updateType = useUpdateLeaveType(item.type);

  async function handleSave() {
    const body: { carryForwardCap?: number | null; maxDaysPerEvent?: number | null } = {};
    if (cfCap !== '') {
      const v = parseInt(cfCap, 10);
      if (isNaN(v) || v < 0) { toast.error('Invalid cap', 'Enter a non-negative integer.'); return; }
      body.carryForwardCap = v;
    }
    if (maxEvent !== '') {
      const v = parseInt(maxEvent, 10);
      if (isNaN(v) || v < 0) { toast.error('Invalid max', 'Enter a non-negative integer.'); return; }
      body.maxDaysPerEvent = v;
    }
    try {
      await updateType.mutateAsync(body);
      toast.success('Updated', `${item.type} leave type configuration saved.`);
      setEditing(false);
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <tr className="hover:bg-offwhite/60">
      <td className="px-5 py-3.5">
        <span className="font-semibold text-charcoal">{item.type}</span>
        {item.isEventBased && (
          <span className="text-xs text-slate ml-1">(event-based)</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        {editing ? (
          <input
            type="number"
            min={0}
            value={cfCap}
            onChange={(e) => setCfCap(e.target.value)}
            aria-label={`${item.type} carry-forward cap`}
            className="w-16 border border-forest rounded px-1.5 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-forest/40"
          />
        ) : item.carryForwardCap !== null ? (
          <span className="font-semibold text-charcoal">{item.carryForwardCap}</span>
        ) : (
          <span className="text-slate text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        {editing ? (
          <input
            type="number"
            min={0}
            value={maxEvent}
            onChange={(e) => setMaxEvent(e.target.value)}
            aria-label={`${item.type} max days per event`}
            className="w-16 border border-forest rounded px-1.5 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-forest/40"
          />
        ) : item.maxDaysPerEvent !== null ? (
          <span className="font-semibold text-charcoal">{item.maxDaysPerEvent}</span>
        ) : (
          <span className="text-slate text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        {editing ? (
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="primary" loading={updateType.isPending} onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </td>
    </tr>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

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
      <div className="bg-crimsonbg border border-crimson/20 rounded-xl px-6 py-4 text-sm text-crimson" role="alert">
        Could not load leave configuration. Please refresh.
      </div>
    );
  }

  if (!types) return null;

  return (
    <div className="space-y-6">
      {/* Quota matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-sage/20">
          <h2 className="font-heading font-bold text-charcoal text-base">Leave Quotas by Employment Type</h2>
          <p className="text-xs text-slate mt-0.5">Days per year unless specified otherwise. Click a value to edit inline.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Leave quotas by employment type">
            <thead>
              <tr className="bg-offwhite border-b border-sage/20">
                <th scope="col" className="text-left px-5 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Leave Type</th>
                {EMPLOYMENT_TYPES.map((et) => (
                  <th key={et} scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">{et}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {types.map((item) => (
                <tr key={item.type} className="hover:bg-offwhite/60">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-charcoal">{item.type}</span>
                    {item.isEventBased && <span className="text-xs text-slate ml-1">(event-based)</span>}
                  </td>
                  {EMPLOYMENT_TYPES.map((et) => {
                    const quota = item.quotas.find((q) => q.employmentType === et);
                    return (
                      <td key={et} className="px-4 py-3.5 text-center">
                        {item.type === 'Unpaid' ? (
                          <span className="text-slate text-xs">Unlimited</span>
                        ) : (
                          <QuotaCell
                            type={item.type}
                            empType={et}
                            currentValue={quota?.daysPerYear ?? null}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Carry-forward caps + event limits */}
      <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-sage/20">
          <h2 className="font-heading font-bold text-charcoal text-base">Carry-Forward Caps &amp; Event Limits</h2>
          <p className="text-xs text-slate mt-0.5">
            Carry-forward cap: maximum days carried into next year. Max days per event: applies to Maternity/Paternity.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Carry-forward caps and event limits">
            <thead>
              <tr className="bg-offwhite border-b border-sage/20">
                <th scope="col" className="text-left px-5 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Leave Type</th>
                <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Carry-forward Cap</th>
                <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Max Days per Event</th>
                <th scope="col" className="text-center px-4 py-3 font-semibold text-slate text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {types.map((item) => (
                <TypeConfigRow key={item.type} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset rules info */}
      <div className="bg-softmint border border-mint rounded-xl p-5">
        <h3 className="font-heading text-sm font-semibold text-forest mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Annual Reset Rules (1 January)
        </h3>
        <ul className="space-y-2 text-sm text-slate" role="list">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
            <span><span className="font-semibold text-charcoal">Annual &amp; Casual:</span> carried forward up to the configured cap (BL-013).</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
            <span><span className="font-semibold text-charcoal">Sick:</span> resets to zero on Jan 1 — no carry-forward (BL-012).</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
            <span><span className="font-semibold text-charcoal">Maternity &amp; Paternity:</span> event-based — not affected by annual reset (BL-014).</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-forest mt-2 flex-shrink-0" aria-hidden="true" />
            <span><span className="font-semibold text-charcoal">Unpaid:</span> always available — no accrual or reset.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
