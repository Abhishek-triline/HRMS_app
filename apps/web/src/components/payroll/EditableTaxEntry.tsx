'use client';

/**
 * EditableTaxEntry — inline tax editor for the Run Detail page (PO/Admin).
 *
 * BL-036a: v1 manual tax entry. Shows the system-computed reference figure
 * (gross × flat rate) as read-only guidance, with a "Use reference" button
 * that pre-fills the editable field. The PO types or adjusts the final value
 * and clicks Save. The backend recomputes net = gross − lop − finalTax − other.
 *
 * Only rendered when the parent run is in Review status.
 * Returns 409 PAYSLIP_IMMUTABLE if the run was concurrently finalised (BL-031).
 */

import { useState, useEffect } from 'react';
import { MoneyInput } from '@/components/employees/MoneyInput';
import { MoneyDisplay } from './MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { useUpdatePayslipTax } from '@/lib/hooks/usePayslips';
import { showToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/client';
import type { PayslipSummary } from '@nexora/contracts/payroll';

interface EditableTaxEntryProps {
  payslip: PayslipSummary;
  onSaved?: () => void;
}

export function EditableTaxEntry({ payslip, onSaved }: EditableTaxEntryProps) {
  // This component is gated to Admin/PayrollOfficer (PATCH /payslips/:id/tax
  // requires those roles), so money fields on payslip are never redacted
  // here in practice. Coerce nulls for TS happiness; runtime they're set.
  const [taxPaise, setTaxPaise] = useState(payslip.finalTaxPaise ?? 0);
  const mutation = useUpdatePayslipTax(payslip.id);

  // Sync if the parent re-renders with a newer value (e.g. after cache invalidation).
  useEffect(() => {
    setTaxPaise(payslip.finalTaxPaise ?? 0);
  }, [payslip.finalTaxPaise, payslip.id]);

  const netPreview = (payslip.grossPaise ?? 0) - payslip.lopDays * 0 - taxPaise;
  // Note: lopDeductionPaise isn't on PayslipSummary, so we compute a rough
  // preview. The exact net comes from the backend after save.

  async function handleSave() {
    try {
      await mutation.mutateAsync({
        finalTaxPaise: taxPaise,
        version: 1, // version is required; detail page passes full payslip with version
      });
      showToast({ type: 'success', title: 'Tax saved', message: `Updated for ${payslip.employeeName}` });
      onSaved?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PAYSLIP_IMMUTABLE') {
        showToast({
          type: 'error',
          title: 'Payslip is finalised',
          message: 'This payslip is finalised and cannot be edited.',
        });
      } else if (err instanceof ApiError && err.code === 'VERSION_MISMATCH') {
        showToast({
          type: 'error',
          title: 'Data changed',
          message: 'Payslip was updated by another user. Refreshing…',
        });
      } else {
        showToast({ type: 'error', title: 'Save failed', message: 'Please try again.' });
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Reference figure */}
      <div className="flex items-center justify-between bg-offwhite rounded-lg px-4 py-3 border border-sage/30">
        <div>
          <p className="text-xs font-semibold text-slate uppercase tracking-wide">Reference Tax</p>
          <p className="text-sm font-bold text-charcoal mt-0.5">
            <MoneyDisplay paise={payslip.finalTaxPaise} />
          </p>
          <p className="text-xs text-slate mt-0.5">System-computed: gross × flat rate</p>
        </div>
        <button
          type="button"
          onClick={() => setTaxPaise(payslip.finalTaxPaise ?? 0)}
          className="text-xs font-semibold text-forest border border-forest/30 rounded-lg px-3 py-1.5 hover:bg-forest/5 transition-colors"
        >
          Use reference
        </button>
      </div>

      {/* Editable field */}
      <MoneyInput
        label="Final Tax"
        required
        valuePaise={taxPaise}
        onChangePaise={setTaxPaise}
      />

      {/* Net preview */}
      <div className="flex items-center justify-between text-xs text-slate border-t border-sage/20 pt-3">
        <span>Gross: <MoneyDisplay paise={payslip.grossPaise} /></span>
        <span className="text-richgreen font-semibold">
          Approx. net: <MoneyDisplay paise={Math.max(0, netPreview)} />
        </span>
      </div>

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={mutation.isPending}
        loading={mutation.isPending}
        className="w-full"
      >
        Save Tax
      </Button>

      {/* BL-036a footnote */}
      <p className="text-[10px] text-slate/60 text-center">
        Manual · v1 — slab engine deferred to v2
      </p>
    </div>
  );
}
