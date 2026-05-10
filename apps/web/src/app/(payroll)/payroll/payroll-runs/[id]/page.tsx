'use client';

/**
 * P-04 — Payroll Run Detail (PayrollOfficer).
 *
 * Core PO task: review and adjust tax per payslip (BL-036a).
 * PO can also finalise the run (two-step modal, BL-034).
 * PO cannot reverse — Reverse button is Admin-only.
 *
 * Visual reference: prototype/payroll-officer/initiate-payroll.html (detail tab).
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePayrollRun } from '@/lib/hooks/usePayroll';
import { RunSummaryCard } from '@/components/payroll/RunSummaryCard';
import { PayslipTable } from '@/components/payroll/PayslipTable';
import { RunChecklist } from '@/components/payroll/RunChecklist';
import { TwoStepFinaliseModal } from '@/components/payroll/TwoStepFinaliseModal';
import { EditableTaxEntry } from '@/components/payroll/EditableTaxEntry';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { PayslipSummary } from '@nexora/contracts/payroll';

export default function POPayrollRunDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? '';

  const { data, isLoading, isError } = usePayrollRun(id);
  const [finaliseOpen, setFinaliseOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipSummary | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner /><span className="ml-2 text-sm text-slate">Loading run…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-crimson text-sm">
        Failed to load payroll run.{' '}
        <Link href="/payroll/payroll-runs" className="underline text-forest">Go back</Link>
      </div>
    );
  }

  const { run, payslips } = data;
  const isReview = run.status === 'Review';
  const isFinalised = run.status === 'Finalised';
  const isDraft = run.status === 'Draft';

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-slate mb-4">
        <Link href="/payroll/payroll-runs" className="hover:text-forest transition-colors">Payroll Runs</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-charcoal font-medium">{run.code}</span>
      </div>

      <RunSummaryCard run={run} />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-sage/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-sage/20 flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-charcoal">Employee Payslips</h3>
              <span className="text-xs text-slate">{payslips.length} payslip{payslips.length !== 1 ? 's' : ''}</span>
            </div>
            <PayslipTable
              mode="run-detail"
              payslips={payslips}
              basePath="/payroll/payslips"
              canEditTax={isReview}
              onEditTax={setSelectedPayslip}
            />
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <RunChecklist payslips={payslips} workingDays={run.workingDays} />

          {(isDraft || isReview) && (
            <Button variant="primary" className="w-full" onClick={() => setFinaliseOpen(true)}>
              Finalise Run
            </Button>
          )}

          {isFinalised && (
            <div className="bg-greenbg/60 border border-richgreen/30 rounded-xl px-4 py-3">
              <p className="text-xs text-richgreen font-semibold">Run finalised — all payslips locked (BL-031).</p>
              {run.finalisedByName && (
                <p className="text-xs text-richgreen/80 mt-0.5">By {run.finalisedByName}</p>
              )}
            </div>
          )}

          {/* PO cannot reverse — informational note */}
          {isFinalised && (
            <div className="bg-offwhite border border-sage/40 rounded-xl px-4 py-3">
              <p className="text-xs text-slate">
                Reversals can only be initiated by Admin (BL-033).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tax editor panel */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Edit tax">
          <div className="absolute inset-0 bg-charcoal/40" aria-hidden="true" onClick={() => setSelectedPayslip(null)} />
          <div className="relative bg-white w-full max-w-sm shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base font-bold text-charcoal">Edit Tax — {selectedPayslip.employeeName}</h3>
              <button type="button" aria-label="Close" onClick={() => setSelectedPayslip(null)} className="text-slate hover:text-forest">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EditableTaxEntry payslip={selectedPayslip} onSaved={() => setSelectedPayslip(null)} />
          </div>
        </div>
      )}

      <TwoStepFinaliseModal run={run} isOpen={finaliseOpen} onClose={() => setFinaliseOpen(false)} />
    </div>
  );
}
